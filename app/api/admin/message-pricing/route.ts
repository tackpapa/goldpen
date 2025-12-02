import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const UpdatePricingSchema = z.object({
  message_type: z.string(),
  price: z.number().int().min(0),
  cost: z.number().int().min(0).optional(),
})

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('[Supabase Admin] Missing environment variables')
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

async function checkSuperAdmin(request: Request) {
  const supabase = await createAuthenticatedClient(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error('[Message Pricing] Auth error:', authError?.message || 'No user')
    return { authorized: false, error: 'Unauthorized', status: 401 }
  }

  const adminClient = createAdminClient()
  const { data: userData, error: userError } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || userData.role !== 'super_admin') {
    console.error('[Message Pricing] Role check failed:', userError?.message || `Role: ${userData?.role}`)
    return { authorized: false, error: 'Forbidden', status: 403 }
  }

  return { authorized: true, user }
}

// GET /api/admin/message-pricing - 메시지 비용 목록 조회
export async function GET(request: Request) {
  try {
    const authCheck = await checkSuperAdmin(request)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const adminClient = createAdminClient()
    const { data: pricing, error } = await adminClient
      .from('message_pricing')
      .select('*')
      .order('message_type')

    if (error) {
      console.error('[Message Pricing GET] Error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ pricing: pricing || [] })
  } catch (error) {
    console.error('[Message Pricing GET] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/message-pricing - 메시지 비용 수정
export async function PUT(request: Request) {
  try {
    const authCheck = await checkSuperAdmin(request)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const adminClient = createAdminClient()

    const body = await request.json()
    const validation = UpdatePricingSchema.safeParse(body)

    if (!validation.success) {
      return Response.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { message_type, price, cost } = validation.data

    const updateData: { price: number; cost?: number; updated_at: string } = {
      price,
      updated_at: new Date().toISOString(),
    }
    if (cost !== undefined) {
      updateData.cost = cost
    }

    const { data: updated, error } = await adminClient
      .from('message_pricing')
      .update(updateData)
      .eq('message_type', message_type)
      .select()
      .single()

    if (error) {
      console.error('[Message Pricing PUT] Error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Audit log
    await adminClient.from('audit_logs').insert({
      admin_id: authCheck.user!.id,
      action: 'update_message_pricing',
      target_type: 'message_pricing',
      target_id: message_type,
      changes: { price, cost },
      metadata: {
        user_agent: request.headers.get('user-agent'),
      },
    })

    return Response.json({ success: true, pricing: updated })
  } catch (error) {
    console.error('[Message Pricing PUT] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
