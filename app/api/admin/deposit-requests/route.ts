import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// GET: List all deposit requests
export async function GET() {
  try {
    const service = getServiceClient()
    if (!service) {
      return Response.json({ error: 'Service unavailable' }, { status: 500 })
    }

    // Get all deposit requests with organization info
    const { data: requests, error } = await service
      .from('credit_charge_requests')
      .select(`
        id,
        org_id,
        message,
        status,
        amount,
        created_at,
        updated_at,
        organizations (
          id,
          name,
          slug,
          credit_balance
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching deposit requests:', error)
      return Response.json({ error: 'Failed to fetch deposit requests' }, { status: 500 })
    }

    // Transform data for frontend
    const transformedRequests = (requests || []).map((req: any) => ({
      id: req.id,
      org_id: req.org_id,
      org_name: req.organizations?.name || 'Unknown',
      org_slug: req.organizations?.slug || '',
      credit_balance: req.organizations?.credit_balance || 0,
      message: req.message,
      status: req.status,
      amount: req.amount,
      created_at: req.created_at,
      updated_at: req.updated_at,
    }))

    return Response.json({ requests: transformedRequests })
  } catch (error) {
    console.error('Error in GET /api/admin/deposit-requests:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: Update deposit request status
export async function PATCH(request: Request) {
  try {
    const service = getServiceClient()
    if (!service) {
      return Response.json({ error: 'Service unavailable' }, { status: 500 })
    }

    const body = await request.json() as { id: string; status: string; amount?: number }
    const { id, status, amount } = body

    if (!id || !status) {
      return Response.json({ error: 'id and status are required' }, { status: 400 })
    }

    if (!['pending', 'completed'].includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Update the request
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (amount !== undefined) {
      updateData.amount = amount
    }

    const { data, error } = await service
      .from('credit_charge_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating deposit request:', error)
      return Response.json({ error: 'Failed to update deposit request' }, { status: 500 })
    }

    return Response.json({ success: true, request: data })
  } catch (error) {
    console.error('Error in PATCH /api/admin/deposit-requests:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete deposit request
export async function DELETE(request: Request) {
  try {
    const service = getServiceClient()
    if (!service) {
      return Response.json({ error: 'Service unavailable' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return Response.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await service
      .from('credit_charge_requests')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting deposit request:', error)
      return Response.json({ error: 'Failed to delete deposit request' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/deposit-requests:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
