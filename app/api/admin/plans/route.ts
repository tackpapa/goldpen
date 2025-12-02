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

const CreatePlanSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  price_monthly: z.number().min(0).default(0),
  price_yearly: z.number().min(0).default(0),
  max_users: z.number().int().positive().default(5),
  max_students: z.number().int().positive().default(30),
  max_teachers: z.number().int().positive().default(3),
  max_classes: z.number().int().positive().default(5),
  features: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
})

const UpdatePlanSchema = CreatePlanSchema.partial()

async function checkSuperAdmin(request: Request) {
  const supabase = await createAuthenticatedClient(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { authorized: false, error: 'Unauthorized', status: 401 }

  const adminClient = createAdminClient()
  const { data: userData, error: userError } = await adminClient.from('users').select('role').eq('id', user.id).single()
  if (userError || !userData || userData.role !== 'super_admin') return { authorized: false, error: 'Forbidden', status: 403 }

  return { authorized: true, user }
}

// GET /api/admin/plans
export async function GET(request: Request) {
  try {
    const adminClient = createAdminClient()
    const authCheck = await checkSuperAdmin(request)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = adminClient
      .from('plans')
      .select('*')
      .order('sort_order', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: plans, error } = await query

    if (error) {
      console.error('[Plans GET] Error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Get organization count per plan
    const plansWithStats = await Promise.all(
      (plans || []).map(async (plan) => {
        const { count } = await adminClient
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .eq('subscription_plan', plan.code)

        return {
          ...plan,
          organization_count: count || 0,
        }
      })
    )

    return Response.json({ plans: plansWithStats })
  } catch (error) {
    console.error('[Plans GET] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/plans
export async function POST(request: Request) {
  try {
    const adminClient = createAdminClient()
    const authCheck = await checkSuperAdmin(request)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const body = await request.json()
    const validation = CreatePlanSchema.safeParse(body)

    if (!validation.success) {
      return Response.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { data: plan, error } = await adminClient
      .from('plans')
      .insert({
        ...validation.data,
        features: JSON.stringify(validation.data.features),
      })
      .select()
      .single()

    if (error) {
      console.error('[Plans POST] Error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json(plan, { status: 201 })
  } catch (error) {
    console.error('[Plans POST] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
