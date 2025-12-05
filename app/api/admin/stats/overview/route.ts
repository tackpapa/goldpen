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

export async function GET(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const adminClient = createAdminClient()

    // Check super_admin authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 7일 전 날짜
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // ========== 병렬 쿼리 실행 (최적화!) ==========
    const [
      totalOrgsResult,
      activeOrgsResult,
      totalUsersResult,
      recentOrgsResult,
    ] = await Promise.all([
      // 1. 전체 조직 수
      adminClient
        .from('organizations')
        .select('*', { count: 'exact', head: true }),

      // 2. 활성 조직 수
      adminClient
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),

      // 3. 전체 사용자 수
      adminClient
        .from('users')
        .select('*', { count: 'exact', head: true }),

      // 4. 최근 7일 신규 조직 수
      adminClient
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString()),
    ])

    return Response.json({
      totalOrganizations: totalOrgsResult.count || 0,
      activeOrganizations: activeOrgsResult.count || 0,
      totalUsers: totalUsersResult.count || 0,
      recentOrganizations: recentOrgsResult.count || 0,
    })
  } catch (error) {
    console.error('[Stats Overview] Error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
