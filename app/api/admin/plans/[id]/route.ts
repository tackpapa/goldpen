import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const runtime = 'edge'

const UpdatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional(),
  price_monthly: z.number().min(0).optional(),
  price_yearly: z.number().min(0).optional(),
  max_users: z.number().int().positive().optional(),
  max_students: z.number().int().positive().optional(),
  max_teachers: z.number().int().positive().optional(),
  max_classes: z.number().int().positive().optional(),
  features: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

async function checkSuperAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { authorized: false, error: 'Unauthorized', status: 401 }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || userData.role !== 'super_admin') {
    return { authorized: false, error: 'Forbidden', status: 403 }
  }

  return { authorized: true, user }
}

// GET /api/admin/plans/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient()
    const authCheck = await checkSuperAdmin(supabase)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { id } = await params

    const { data: plan, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !plan) {
      return Response.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Get organizations using this plan
    const { data: orgs, count } = await supabase
      .from('organizations')
      .select('id, name, type, created_at', { count: 'exact' })
      .eq('subscription_plan', plan.code)
      .limit(10)

    return Response.json({
      ...plan,
      organizations: orgs || [],
      organization_count: count || 0,
    })
  } catch (error) {
    console.error('[Plan GET] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/plans/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient()
    const authCheck = await checkSuperAdmin(supabase)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { id } = await params
    const body = await request.json()
    const validation = UpdatePlanSchema.safeParse(body)

    if (!validation.success) {
      return Response.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = { ...validation.data }
    if (validation.data.features) {
      updateData.features = JSON.stringify(validation.data.features)
    }

    const { data: plan, error } = await supabase
      .from('plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Plan PUT] Error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json(plan)
  } catch (error) {
    console.error('[Plan PUT] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/plans/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient()
    const authCheck = await checkSuperAdmin(supabase)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { id } = await params

    // Check if any organizations are using this plan
    const { data: plan } = await supabase
      .from('plans')
      .select('code')
      .eq('id', id)
      .single()

    if (plan) {
      const { count } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_plan', plan.code)

      if (count && count > 0) {
        return Response.json(
          { error: `Cannot delete plan: ${count} organizations are using it` },
          { status: 400 }
        )
      }
    }

    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Plan DELETE] Error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('[Plan DELETE] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
