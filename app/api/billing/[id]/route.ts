import { ZodError } from 'zod'
import * as z from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/billing/[id]
 * 청구 상세 조회
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { id: billingId } = await params

    const { data: billing, error } = await db
      .from('billing')
      .select(`
        *,
        student:students(id, name, grade, phone, parent_phone)
      `)
      .eq('id', billingId)
      .eq('org_id', orgId)
      .single()

    if (error) {
      console.error('[Billing GET] Error:', error)
      return Response.json({ error: '청구 조회 실패', details: error.message }, { status: 500 })
    }

    if (!billing) {
      return Response.json({ error: '청구를 찾을 수 없습니다' }, { status: 404 })
    }

    return Response.json({ billing })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[Billing GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

const updateBillingSchema = z.object({
  student_id: z.string().uuid().optional(),
  amount: z.number().positive().optional(),
  billing_date: z.string().optional(),
  due_date: z.string().optional(),
  paid_date: z.string().optional().nullable(),
  payment_method: z.enum(['cash', 'card', 'transfer', 'other']).optional().nullable(),
  description: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = updateBillingSchema.parse(body)

    const { data: billing, error: updateError } = await db
      .from('billing')
      .update(validated)
      .eq('id', params.id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (updateError) {
      console.error('[Billing PUT] Error:', updateError)
      return Response.json({ error: '청구 수정 실패', details: updateError.message }, { status: 500 })
    }

    if (!billing) {
      return Response.json({ error: '청구를 찾을 수 없습니다' }, { status: 404 })
    }

    return Response.json({ billing, message: '청구가 수정되었습니다' })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Billing PUT] Unexpected error:', error)
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
      return Response.json({ error: '청구를 삭제할 권한이 없습니다' }, { status: 403 })
    }

    const { error: deleteError } = await db
      .from('billing')
      .delete()
      .eq('id', params.id)
      .eq('org_id', orgId)

    if (deleteError) {
      console.error('[Billing DELETE] Error:', deleteError)
      return Response.json({ error: '청구 삭제 실패', details: deleteError.message }, { status: 500 })
    }

    return Response.json({ message: '청구가 삭제되었습니다' })
  } catch (error: any) {
    console.error('[Billing DELETE] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
