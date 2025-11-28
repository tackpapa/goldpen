import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase/server'

export const runtime = 'edge'

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

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
    const supabase = await createAuthClient()
    const service = getServiceClient()
    const { searchParams } = new URL(request.url)

    // 세션에서 org_id 가져오기
    const { data: { user } } = await supabase.auth.getUser()
    let orgId = searchParams.get('org_id')

    if (!orgId && user) {
      const db = service || supabase
      const { data: userProfile } = await db
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()
      orgId = userProfile?.org_id || null
    }

    // Fallback to demo org
    if (!orgId) {
      orgId = process.env.NEXT_PUBLIC_DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'
    }

    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const entityType = searchParams.get('entity_type')
    const actionType = searchParams.get('action_type')

    // service role 클라이언트로 조회 (RLS 우회)
    const db = service || supabase
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

    const { data, error } = await query

    if (error) {
      // 테이블이 없으면 빈 배열 반환
      if (error.code === '42P01') {
        return NextResponse.json({ data: [], message: 'activity_logs table not found' })
      }
      console.error('Activity logs fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Activity logs GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface ActivityLogBody {
  org_id: string
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
    const service = getServiceClient()
    const supabase = service || await createAuthClient()
    const body = await request.json() as ActivityLogBody

    const {
      org_id,
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
    if (!org_id || !user_name || !action_type || !entity_type || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: org_id, user_name, action_type, entity_type, description' },
        { status: 400 }
      )
    }

    // IP 및 User-Agent 추출
    const ip_address = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                       request.headers.get('x-real-ip') ||
                       null
    const user_agent = request.headers.get('user-agent') || null

    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        org_id,
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
  } catch (error) {
    console.error('Activity logs POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
