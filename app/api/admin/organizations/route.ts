import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('[Supabase Admin] Missing env')
  return createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

const CreateOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  type: z.enum(['academy', 'learning_center', 'study_cafe', 'tutoring']),
  owner_id: z.string().uuid().optional(),
  settings: z.record(z.any()).optional(),
  subscription_plan: z.enum(['free', 'basic', 'pro', 'enterprise']).optional(),
  max_users: z.number().int().positive().optional(),
  max_students: z.number().int().positive().optional(),
})

// Check super_admin authorization
async function checkAdminAuth(request: Request) {
  const supabase = await createAuthenticatedClient(request)
  const adminClient = createAdminClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { authorized: false, error: 'Unauthorized', status: 401 }
  }

  // Admin 클라이언트로 권한 확인 (RLS 우회)
  const { data: userData, error: userError } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || userData.role !== 'super_admin') {
    return { authorized: false, error: 'Forbidden', status: 403 }
  }

  return { authorized: true, user }
}

// GET /api/admin/organizations
export async function GET(request: Request) {
  try {
    const adminClient = createAdminClient()
    const authCheck = await checkAdminAuth(request)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''

    const offset = (page - 1) * limit

    // Build query (Admin 클라이언트로 RLS 우회)
    let query = adminClient
      .from('organizations')
      .select('*', { count: 'exact' })

    // Apply filters
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (type) {
      query = query.eq('type', type)
    }

    // 삭제된 조직은 기본적으로 숨김 (status=deleted 필터 시에만 표시)
    if (status) {
      query = query.eq('status', status)
    } else {
      query = query.neq('status', 'deleted')
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

    const { data: organizations, error, count } = await query

    if (error) {
      console.error('[Organizations GET] Error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Batch fetch all additional data (N+1 쿼리 최적화)
    const orgIds = (organizations || []).map(org => org.id)
    const ownerIds = (organizations || []).map(org => org.owner_id).filter(Boolean) as string[]

    // Batch queries in parallel
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [userCounts, studentCounts, owners, revenues, settings] = await Promise.all([
      // User counts by org_id (single query with GROUP BY simulation)
      adminClient
        .from('users')
        .select('org_id')
        .in('org_id', orgIds),

      // Student counts by org_id
      adminClient
        .from('students')
        .select('org_id')
        .in('org_id', orgIds),

      // All owners in one query
      ownerIds.length > 0
        ? adminClient
            .from('users')
            .select('id, name, email')
            .in('id', ownerIds)
        : Promise.resolve({ data: [] }),

      // All revenues in one query
      adminClient
        .from('billing_transactions')
        .select('org_id, amount')
        .in('org_id', orgIds)
        .gte('created_at', startOfMonth.toISOString()),

      // All settings in one query
      adminClient
        .from('org_settings')
        .select('*')
        .in('org_id', orgIds)
    ])

    // Build lookup maps for O(1) access
    const userCountMap = new Map<string, number>()
    ;(userCounts.data || []).forEach(u => {
      userCountMap.set(u.org_id, (userCountMap.get(u.org_id) || 0) + 1)
    })

    const studentCountMap = new Map<string, number>()
    ;(studentCounts.data || []).forEach(s => {
      studentCountMap.set(s.org_id, (studentCountMap.get(s.org_id) || 0) + 1)
    })

    const ownerMap = new Map<string, { id: string; name: string; email: string }>()
    ;(owners.data || []).forEach(o => {
      ownerMap.set(o.id, o)
    })

    const revenueMap = new Map<string, number>()
    ;(revenues.data || []).forEach(r => {
      revenueMap.set(r.org_id, (revenueMap.get(r.org_id) || 0) + (Number(r.amount) || 0))
    })

    const settingsMap = new Map<string, unknown>()
    ;(settings.data || []).forEach(s => {
      settingsMap.set(s.org_id, s)
    })

    // Map organizations with pre-fetched data
    const orgsWithDetails = (organizations || []).map(org => ({
      ...org,
      user_count: userCountMap.get(org.id) || 0,
      student_count: studentCountMap.get(org.id) || 0,
      owner: org.owner_id ? ownerMap.get(org.owner_id) || null : null,
      monthly_revenue: revenueMap.get(org.id) || 0,
      credit_balance: org.credit_balance || 0,
      org_settings: settingsMap.get(org.id) || null,
    }))

    return Response.json({
      organizations: orgsWithDetails,
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('[Organizations GET] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/organizations
export async function POST(request: Request) {
  try {
    const adminClient = createAdminClient()
    const authCheck = await checkAdminAuth(request)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const body = await request.json()

    // Validate request body
    const validation = CreateOrganizationSchema.safeParse(body)

    if (!validation.success) {
      return Response.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { data: organization, error } = await adminClient
      .from('organizations')
      .insert({
        name: validation.data.name,
        type: validation.data.type,
        owner_id: validation.data.owner_id,
        settings: validation.data.settings || {},
        status: 'active',
        subscription_plan: validation.data.subscription_plan || 'free',
        max_users: validation.data.max_users || 10,
        max_students: validation.data.max_students || 50,
      })
      .select()
      .single()

    if (error) {
      console.error('[Organizations POST] Error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Log audit
    await adminClient.from('audit_logs').insert({
      admin_id: authCheck.user.id,
      action: 'create',
      target_type: 'organization',
      target_id: organization.id,
      changes: { after: organization },
      metadata: {
        user_agent: request.headers.get('user-agent'),
      },
    })

    return Response.json(organization, { status: 201 })
  } catch (error) {
    console.error('[Organizations POST] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
