import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getOrgId(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  const demoOrg = process.env.NEXT_PUBLIC_DEMO_ORG_ID || process.env.DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'
  if (!user) return { orgId: demoOrg, user }

  const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  if (profile?.org_id) return { orgId: profile.org_id as string, user }
  return { orgId: demoOrg, user }
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const { orgId } = await getOrgId(supabase)

    // 항상 서비스 롤 클라이언트 사용 (RLS 우회)
    const service = getServiceClient()
    const db = service || supabase

    const [{ data: transactions, error: txErr }, { data: expenses, error: expErr }, { data: categories, error: catErr }, { data: salaries, error: salErr }, { data: students, error: stuErr }] =
      await Promise.all([
        db.from('payment_records')
          .select('id, payment_date, amount, student_name, notes, revenue_category_name, payment_method, org_id, status')
          .eq('org_id', orgId)
          .eq('status', 'completed')  // 완료된 결제만 포함 (취소된 결제 제외)
          .order('payment_date', { ascending: false })
          .order('created_at', { ascending: false }),
        db.from('expenses')
          .select('*, category:expense_categories(name, color)')
          .eq('org_id', orgId)
          .order('expense_date', { ascending: false }),
        db.from('expense_categories')
          .select('*')
          .eq('org_id', orgId),
        db.from('teacher_salaries')
          .select('*')
          .eq('org_id', orgId)
          .order('payment_date', { ascending: false }),
        db.from('students')
          .select('id, created_at, status')
          .eq('org_id', orgId)
          .eq('status', 'active'),
      ])

    const err = txErr || expErr || catErr || salErr || stuErr
    if (err) throw err

    return Response.json({
      orgId,
      transactions: transactions || [],
      expenses: expenses || [],
      expenseCategories: categories || [],
      teacherSalaries: salaries || [],
      students: students || [],
    }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
    })
  } catch (e: any) {
    return Response.json({ error: e.message || '데이터 조회 실패' }, { status: 500 })
  }
}
