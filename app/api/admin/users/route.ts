import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('[Supabase Admin] Missing env')
  return createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

/**
 * GET /api/admin/users
 * 슈퍼 어드민 - 전체 사용자 목록 조회
 */
export async function GET(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const adminClient = createAdminClient()

    // 1. 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: '인증되지 않은 사용자입니다' }, { status: 401 })
    }

    // 2. super_admin 권한 확인 (Admin 클라이언트로 확인)
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'super_admin') {
      return Response.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    // 3. 쿼리 파라미터
    const url = new URL(request.url)
    const searchParams = url.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const offset = (page - 1) * limit

    // 4. 사용자 목록 조회 (Admin 클라이언트로 RLS 우회)
    let query = adminClient
      .from('users')
      .select(
        `
        id,
        email,
        name,
        role,
        phone,
        created_at,
        organizations (
          id,
          name,
          type
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 검색 조건 (이름 또는 이메일)
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: users, error: usersError, count } = await query

    if (usersError) {
      console.error('[Users GET] Error:', usersError)
      return Response.json(
        { error: '사용자 목록을 가져오는데 실패했습니다' },
        { status: 500 }
      )
    }

    return Response.json({
      users,
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('[Users GET] Unexpected error:', error)
    return Response.json(
      { error: '사용자 목록 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
