import { ZodError } from 'zod'
import * as z from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const createExpenseSchema = z.object({
  category: z.string().min(1, '지출 항목은 필수입니다'), // 카테고리 이름
  amount: z.number().positive('금액은 양수여야 합니다'),
  description: z.string().min(1, '설명은 필수입니다'),
  expense_date: z.string(), // YYYY-MM-DD
  notes: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { searchParams } = new URL(request.url)
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    let query = db
      .from('expenses')
      .select('*')
      .eq('org_id', orgId)
      .order('expense_date', { ascending: false })

    if (start_date) query = query.gte('expense_date', start_date)
    if (end_date) query = query.lte('expense_date', end_date)

    const { data: expenses, error: expensesError } = await query

    if (expensesError) {
      console.error('[Expenses GET] Error:', expensesError)
      return Response.json({ error: '지출 목록 조회 실패', details: expensesError.message }, { status: 500 })
    }

    const expenseRecords = (expenses || []).map((exp: any) => ({
      id: exp.id,
      created_at: exp.created_at,
      org_id: exp.org_id,
      category_id: exp.category || 'other',
      category_name: exp.description || exp.category || '기타',
      amount: exp.amount,
      expense_date: exp.expense_date,
      is_recurring: false,
      recurring_type: undefined,
      notes: exp.notes || undefined,
    }))

    const grouped = new Map<string, { total: number; categories: Map<string, number> }>()
    expenseRecords.forEach((rec: any) => {
      const month = rec.expense_date?.slice(0, 7) || ''
      if (!month) return
      if (!grouped.has(month)) grouped.set(month, { total: 0, categories: new Map() })
      const bucket = grouped.get(month)!
      bucket.total += rec.amount
      bucket.categories.set(rec.category_name, (bucket.categories.get(rec.category_name) || 0) + rec.amount)
    })

    const months = Array.from(grouped.keys()).sort()
    const monthlyExpenses = months.map((m) => {
      const bucket = grouped.get(m)!
      const category_expenses = Array.from(bucket.categories.entries())
        .map(([category_name, amount]) => ({
          category_id: category_name,
          category_name,
          amount,
          percentage: bucket.total > 0 ? (amount / bucket.total) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
      return {
        month: m,
        total_expenses: bucket.total,
        category_expenses,
        previous_month_total: 0,
        change_percentage: 0,
      }
    })

    return Response.json({ expenseRecords, monthlyExpenses, count: expenses?.length || 0 }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' }
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[Expenses GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = createExpenseSchema.parse(body)

    // category name -> category_id 매핑
    let categoryId: string | null = null
    const { data: catRow } = await db
      .from('expense_categories')
      .select('id')
      .eq('name', validated.category)
      .maybeSingle()
    if (catRow?.id) {
      categoryId = catRow.id
    } else {
      const { data: newCat } = await db
        .from('expense_categories')
        .insert({ name: validated.category })
        .select('id')
        .single()
      categoryId = newCat?.id || null
    }

    const { data: expense, error: createError } = await db
      .from('expenses')
      .insert({
        org_id: orgId,
        category_id: categoryId,
        amount: validated.amount,
        expense_date: validated.expense_date,
        description: validated.description,
        notes: validated.notes ?? null,
      })
      .select()
      .single()

    if (createError) {
      console.error('[Expenses POST] Error:', createError)
      return Response.json({ error: '지출 생성 실패', details: createError.message }, { status: 500 })
    }

    const mapped = {
      id: expense.id,
      created_at: expense.created_at,
      org_id: expense.org_id,
      category_id: expense.category_id || validated.category,
      category_name: validated.category,
      amount: expense.amount,
      expense_date: expense.expense_date,
      is_recurring: false,
      notes: expense.notes || undefined,
    }

    return Response.json({ expense: mapped, message: '지출이 생성되었습니다' }, { status: 201 })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[Expenses POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
