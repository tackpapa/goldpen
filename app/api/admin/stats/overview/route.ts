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

    // Get total organizations
    const { count: totalOrganizations } = await adminClient
      .from('organizations')
      .select('*', { count: 'exact', head: true })

    // Get active organizations
    const { count: activeOrganizations } = await adminClient
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Get total users
    const { count: totalUsers } = await adminClient
      .from('users')
      .select('*', { count: 'exact', head: true })

    // Get recent organizations (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count: recentOrganizations } = await adminClient
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    return Response.json({
      totalOrganizations: totalOrganizations || 0,
      activeOrganizations: activeOrganizations || 0,
      totalUsers: totalUsers || 0,
      recentOrganizations: recentOrganizations || 0,
    })
  } catch (error) {
    console.error('[Stats Overview] Error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
