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

async function checkSuperAdmin(request: Request) {
  const supabase = await createAuthenticatedClient(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { authorized: false, error: 'Unauthorized', status: 401 }

  const adminClient = createAdminClient()
  const { data: userData, error: userError } = await adminClient.from('users').select('role').eq('id', user.id).single()
  if (userError || !userData || userData.role !== 'super_admin') return { authorized: false, error: 'Forbidden', status: 403 }

  return { authorized: true, user }
}

// GET /api/admin/payments - 결제내역 목록 조회
export async function GET(request: Request) {
  try {
    const authCheck = await checkSuperAdmin(request)
    const adminClient = createAdminClient()

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const type = url.searchParams.get('type') || 'all' // all, paid, free
    const orgId = url.searchParams.get('org_id') || ''
    const startDate = url.searchParams.get('start_date') || ''
    const endDate = url.searchParams.get('end_date') || ''

    const offset = (page - 1) * limit

    // 기본 쿼리
    let query = adminClient
      .from('credit_transactions')
      .select(`
        id,
        org_id,
        amount,
        balance_after,
        type,
        description,
        admin_id,
        created_at,
        organizations!inner(id, name),
        users(id, name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // 필터 적용
    if (type !== 'all') {
      query = query.eq('type', type)
    }

    if (orgId) {
      query = query.eq('org_id', orgId)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate + 'T23:59:59.999Z')
    }

    // 페이지네이션
    query = query.range(offset, offset + limit - 1)

    const { data: transactions, error, count } = await query

    if (error) {
      console.error('[Payments GET] Error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // 통계 계산
    let statsQuery = adminClient
      .from('credit_transactions')
      .select('amount, type')

    if (type !== 'all') {
      statsQuery = statsQuery.eq('type', type)
    }
    if (orgId) {
      statsQuery = statsQuery.eq('org_id', orgId)
    }
    if (startDate) {
      statsQuery = statsQuery.gte('created_at', startDate)
    }
    if (endDate) {
      statsQuery = statsQuery.lte('created_at', endDate + 'T23:59:59.999Z')
    }

    const { data: statsData } = await statsQuery

    let totalCharged = 0
    let totalUsed = 0
    let paidCharged = 0
    let freeCharged = 0

    if (statsData) {
      for (const t of statsData) {
        if (t.amount > 0) {
          totalCharged += t.amount
          if (t.type === 'paid') {
            paidCharged += t.amount
          } else {
            freeCharged += t.amount
          }
        } else {
          totalUsed += Math.abs(t.amount)
        }
      }
    }

    return Response.json({
      transactions: transactions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      stats: {
        totalCharged,
        totalUsed,
        paidCharged,
        freeCharged,
      },
    })
  } catch (error) {
    console.error('[Payments GET] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
