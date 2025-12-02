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

/**
 * 충전금 변경 스키마
 * @property amount - 변경 금액 (양수: 충전, 음수: 차감)
 * @property credit_type - 충전금 타입
 *   - 'free': 관리자가 무료로 부여 (프로모션, 보상 등)
 *   - 'paid': 유저가 직접 결제하여 충전
 * @property description - 변경 사유 (선택)
 */
const UpdateCreditSchema = z.object({
  amount: z.number().int(), // 양수: 충전, 음수: 차감
  credit_type: z.enum(['free', 'paid']).default('free'), // free: 관리자 무료 부여, paid: 유저 직접 결제
  description: z.string().optional(),
})

async function checkSuperAdmin(request: Request) {
  const supabase = await createAuthenticatedClient(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { authorized: false, error: 'Unauthorized', status: 401 }

  const adminClient = createAdminClient()
  const { data: userData, error: userError } = await adminClient.from('users').select('role').eq('id', user.id).single()
  if (userError || !userData || userData.role !== 'super_admin') return { authorized: false, error: 'Forbidden', status: 403 }

  return { authorized: true, user }
}

// POST /api/admin/organizations/[id]/credit - 충전금 변경
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminClient = createAdminClient()
    const authCheck = await checkSuperAdmin(request)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const body = await request.json()
    const validation = UpdateCreditSchema.safeParse(body)

    if (!validation.success) {
      return Response.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { amount, credit_type, description } = validation.data

    // Get current organization
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .select('id, name, credit_balance')
      .eq('id', id)
      .single()

    if (orgError || !org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    const currentBalance = org.credit_balance || 0
    const newBalance = currentBalance + amount

    if (newBalance < 0) {
      return Response.json(
        { error: '충전금이 부족합니다. 현재 잔액: ' + currentBalance.toLocaleString() + '원' },
        { status: 400 }
      )
    }

    // Update credit balance
    const { error: updateError } = await adminClient
      .from('organizations')
      .update({
        credit_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('[Credit Update] Error:', updateError)
      return Response.json({ error: updateError.message }, { status: 500 })
    }

    // Log credit transaction (if table exists)
    // type: 'free' = 관리자 무료 부여, 'paid' = 유저 직접 결제
    try {
      await adminClient.from('credit_transactions').insert({
        org_id: id,
        amount: amount,
        balance_after: newBalance,
        type: credit_type, // 'free' (관리자 무료 부여) or 'paid' (유저 직접 결제)
        description: description || (amount >= 0 ? '충전금 충전' : '충전금 차감'),
        admin_id: authCheck.user!.id,
      })
    } catch (e) {
      // credit_transactions 테이블이 없을 수 있음 - 무시
      console.log('[Credit Update] Transaction log skipped:', e)
    }

    // Log audit
    await adminClient.from('audit_logs').insert({
      admin_id: authCheck.user!.id,
      action: 'update_credit',
      target_type: 'organization',
      target_id: id,
      changes: {
        before: { credit_balance: currentBalance },
        after: { credit_balance: newBalance },
        amount,
        description,
      },
      metadata: {
        user_agent: request.headers.get('user-agent'),
      },
    })

    return Response.json({
      success: true,
      credit_balance: newBalance,
      previous_balance: currentBalance,
      amount,
    })
  } catch (error) {
    console.error('[Credit Update] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/admin/organizations/[id]/credit - 충전금 이력 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminClient = createAdminClient()
    const authCheck = await checkSuperAdmin(request)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    // Get current balance
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .select('credit_balance')
      .eq('id', id)
      .single()

    if (orgError) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get transaction history (if table exists)
    let transactions: any[] = []
    try {
      const { data } = await adminClient
        .from('credit_transactions')
        .select('id, amount, balance_after, description, created_at, admin_id')
        .eq('org_id', id)
        .order('created_at', { ascending: false })
        .limit(50)

      transactions = data || []
    } catch (e) {
      // credit_transactions 테이블이 없을 수 있음
    }

    return Response.json({
      credit_balance: org.credit_balance || 0,
      transactions,
    })
  } catch (error) {
    console.error('[Credit GET] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
