import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// 활동 로그 타입 정의
interface ActivityLog {
  id: string
  org_id: string
  user_id: string | null
  user_name: string
  user_role: string | null
  action_type: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'view' | 'export'
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  description: string
  metadata: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// GET: 활동 로그 조회
export async function GET(request: NextRequest) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { searchParams } = new URL(request.url)

    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const entityType = searchParams.get('entity_type')
    const actionType = searchParams.get('action_type')
    const userId = searchParams.get('userId')

    let query = db
      .from('activity_logs')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    if (actionType) {
      query = query.eq('action_type', actionType)
    }

    // 특정 사용자의 활동 이력만 조회
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      // 테이블이 없으면 빈 배열 반환
      if (error.code === '42P01') {
        return NextResponse.json({ logs: [], data: [], message: 'activity_logs table not found' })
      }
      console.error('Activity logs fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // logs와 data 둘 다 반환 (호환성)
    return NextResponse.json({ logs: data || [], data: data || [] })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    if (error?.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: '조직을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('Activity logs GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface ActivityLogBody {
  user_id?: string | null
  user_name: string
  user_role?: string | null
  action_type: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'view' | 'export'
  entity_type: string
  entity_id?: string | null
  entity_name?: string | null
  description: string
  metadata?: Record<string, unknown>
}

// POST: 활동 로그 생성
export async function POST(request: NextRequest) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const body = await request.json() as ActivityLogBody

    const {
      user_id,
      user_name,
      user_role,
      action_type,
      entity_type,
      entity_id,
      entity_name,
      description,
      metadata = {},
    } = body

    // 필수 필드 검증
    if (!user_name || !action_type || !entity_type || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: user_name, action_type, entity_type, description' },
        { status: 400 }
      )
    }

    // IP 및 User-Agent 추출
    const ip_address = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                       request.headers.get('x-real-ip') ||
                       null
    const user_agent = request.headers.get('user-agent') || null

    const { data, error } = await db
      .from('activity_logs')
      .insert({
        org_id: orgId,
        user_id,
        user_name,
        user_role,
        action_type,
        entity_type,
        entity_id,
        entity_name,
        description,
        metadata,
        ip_address,
        user_agent,
      })
      .select()
      .single()

    if (error) {
      // 테이블이 없는 경우 에러 무시 (graceful degradation)
      if (error.code === '42P01') {
        console.warn('activity_logs table not found, skipping log creation')
        return NextResponse.json({
          data: null,
          warning: 'activity_logs table not found'
        })
      }
      console.error('Activity log create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    if (error?.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: '조직을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('Activity logs POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
