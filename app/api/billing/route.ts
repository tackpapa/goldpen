import { ZodError } from 'zod'
import * as z from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const createBillingSchema = z.object({
  student_id: z.string().uuid('유효한 학생 ID가 필요합니다'),
  amount: z.number().positive('금액은 양수여야 합니다'),
  billing_date: z.string(), // YYYY-MM-DD
  due_date: z.string(),
  paid_date: z.string().optional().nullable(),
  payment_method: z.enum(['cash', 'card', 'transfer', 'other']).optional().nullable(),
  description: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
})

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { searchParams } = new URL(request.url)
    const student_id = searchParams.get('student_id')
    const status = searchParams.get('status')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    let query = db
      .from('billing')
      .select('id, org_id, student_id, amount, billing_date, due_date, paid_date, payment_method, description, notes, status, created_at, updated_at, students!inner(name)')
      .eq('org_id', orgId)
      .order('billing_date', { ascending: false })

    if (student_id) query = query.eq('student_id', student_id)
    if (status) query = query.eq('status', status)
    if (start_date) query = query.gte('billing_date', start_date)
    if (end_date) query = query.lte('billing_date', end_date)

    const { data: billing, error: billingError } = await query

    if (billingError) {
      // 테이블 미생성 등 치명적 오류 시 빈 배열로 반환해 FE 붕괴 방지
      console.error('[Billing GET] Error:', billingError)
      if ((billingError as any).code === '42P01') {
        return Response.json({ billing: [], count: 0 })
      }
      return Response.json({ error: '청구 목록 조회 실패', details: billingError.message }, { status: 500 })
    }

    return Response.json({ billing, count: billing?.length || 0 })
  } catch (error: any) {
    console.error('[Billing GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = createBillingSchema.parse(body)

    const { data: billing, error: createError } = await db
      .from('billing')
      .insert({
        ...validated,
        org_id: orgId
      })
      .select()
      .single()

    if (createError) {
      console.error('[Billing POST] Error:', createError)
      return Response.json({ error: '청구 생성 실패', details: createError.message }, { status: 500 })
    }

    return Response.json({ billing, message: '청구가 생성되었습니다' }, { status: 201 })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Billing POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
