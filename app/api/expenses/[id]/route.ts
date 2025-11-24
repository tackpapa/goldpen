import { ZodError } from 'zod'
import * as z from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const updateExpenseSchema = z.object({
  category: z.enum(['salary', 'rent', 'utilities', 'supplies', 'marketing', 'maintenance', 'other']).optional(),
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  expense_date: z.string().optional(),
  payment_method: z.enum(['cash', 'card', 'transfer', 'other']).optional(),
  receipt_url: z.string().url().optional(),
  approved_by: z.string().uuid().optional().nullable(),
  notes: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = updateExpenseSchema.parse(body)

    const { data: expense, error: updateError } = await db
      .from('expenses')
      .update(validated)
      .eq('id', params.id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (updateError) {
      console.error('[Expenses PUT] Error:', updateError)
      return Response.json({ error: '지출 수정 실패', details: updateError.message }, { status: 500 })
    }

    if (!expense) {
      return Response.json({ error: '지출을 찾을 수 없습니다' }, { status: 404 })
    }

    return Response.json({ expense, message: '지출이 수정되었습니다' })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Expenses PUT] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db, orgId, role } = await getSupabaseWithOrg(request)

    if (!['owner', 'manager', 'service_role'].includes(role || '')) {
      return Response.json({ error: '지출을 삭제할 권한이 없습니다' }, { status: 403 })
    }

    const { error: deleteError } = await db
      .from('expenses')
      .delete()
      .eq('id', params.id)
      .eq('org_id', orgId)

    if (deleteError) {
      console.error('[Expenses DELETE] Error:', deleteError)
      return Response.json({ error: '지출 삭제 실패', details: deleteError.message }, { status: 500 })
    }

    return Response.json({ message: '지출이 삭제되었습니다' })
  } catch (error: any) {
    console.error('[Expenses DELETE] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
