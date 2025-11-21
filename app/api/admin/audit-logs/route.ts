import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/audit-logs
 * 슈퍼 어드민 - 감사 로그 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // 1. 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: '인증되지 않은 사용자입니다' }, { status: 401 })
    }

    // 2. super_admin 권한 확인
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'super_admin') {
      return Response.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    // 3. 쿼리 파라미터
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const action = searchParams.get('action') || ''
    const resourceType = searchParams.get('resource_type') || ''
    const startDate = searchParams.get('start_date') || ''
    const endDate = searchParams.get('end_date') || ''
    const offset = (page - 1) * limit

    // 4. 감사 로그 조회 (users, organizations join)
    let query = supabase
      .from('audit_logs')
      .select(
        `
        id,
        user_id,
        org_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        ip_address,
        user_agent,
        created_at,
        users (
          id,
          name,
          email
        ),
        organizations (
          id,
          name
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 검색 조건 (사용자 이메일 또는 resource_id)
    if (search) {
      // Note: users.email 검색은 join된 테이블이라 직접 검색 불가
      // resource_id 검색만 지원
      query = query.ilike('resource_id', `%${search}%`)
    }

    // 액션 필터
    if (action) {
      query = query.eq('action', action)
    }

    // 리소스 타입 필터
    if (resourceType) {
      query = query.eq('resource_type', resourceType)
    }

    // 날짜 범위 필터
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data: logs, error: logsError, count } = await query

    if (logsError) {
      console.error('[Audit Logs GET] Error:', logsError)
      return Response.json(
        { error: '감사 로그를 가져오는데 실패했습니다' },
        { status: 500 }
      )
    }

    return Response.json({
      logs,
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('[Audit Logs GET] Unexpected error:', error)
    return Response.json(
      { error: '감사 로그 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
