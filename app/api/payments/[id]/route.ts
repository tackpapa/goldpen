import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

/**
 * PATCH /api/payments/[id]
 * 결제 취소 (상태 변경 + 크레딧/독서실 시간 환수)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, role } = await getSupabaseWithOrg(request)
    const { id: paymentId } = await params

    // 권한 확인 (owner, manager만 결제 취소 가능)
    if (role && !['owner', 'manager'].includes(role)) {
      return Response.json({ error: '결제를 취소할 권한이 없습니다' }, { status: 403 })
    }

    // Service client 필요 (학생 크레딧/독서실 시간 환수)
    const service = getServiceClient()
    if (!service) {
      return Response.json({ error: '서버 설정 오류' }, { status: 500 })
    }

    // 1. 기존 결제 정보 조회
    const { data: payment, error: fetchError } = await service
      .from('payment_records')
      .select('*')
      .eq('id', paymentId)
      .eq('org_id', orgId)
      .single()

    if (fetchError || !payment) {
      return Response.json({ error: '결제 내역을 찾을 수 없습니다' }, { status: 404 })
    }

    if (payment.status === 'cancelled') {
      return Response.json({ error: '이미 취소된 결제입니다' }, { status: 400 })
    }

    // 2. 학생 정보 조회
    const { data: student, error: studentError } = await service
      .from('students')
      .select('credit, seatsremainingtime')
      .eq('id', payment.student_id)
      .eq('org_id', orgId)
      .single()

    if (studentError || !student) {
      return Response.json({ error: '학생 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    // 3. 크레딧 환수 (결제 시 부여한 크레딧 차감)
    if (payment.granted_credits_hours && payment.granted_credits_hours > 0) {
      const newCredit = Math.max(0, (student.credit || 0) - payment.granted_credits_hours)

      const { error: creditError } = await service
        .from('students')
        .update({ credit: newCredit })
        .eq('id', payment.student_id)
        .eq('org_id', orgId)

      if (creditError) {
        console.error('[Payments PATCH] Credit rollback error:', creditError)
        return Response.json({ error: '크레딧 환수에 실패했습니다', details: creditError.message }, { status: 500 })
      }
    }

    // 4. 독서실 시간 환수 (결제 시 부여한 시간 차감)
    if (payment.granted_pass_amount && payment.granted_pass_amount > 0) {
      const minutesToSubtract = payment.granted_pass_type === 'hours'
        ? payment.granted_pass_amount * 60
        : payment.granted_pass_amount * 24 * 60

      const newTime = Math.max(0, (student.seatsremainingtime || 0) - minutesToSubtract)

      const { error: passError } = await service
        .from('students')
        .update({ seatsremainingtime: newTime })
        .eq('id', payment.student_id)
        .eq('org_id', orgId)

      if (passError) {
        console.error('[Payments PATCH] Pass rollback error:', passError)
        return Response.json({ error: '독서실 시간 환수에 실패했습니다', details: passError.message }, { status: 500 })
      }
    }

    // 5. 결제 상태를 '취소'로 변경
    const { data: updatedPayment, error: updateError } = await service
      .from('payment_records')
      .update({
        status: 'cancelled',
        refunded_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (updateError) {
      console.error('[Payments PATCH] Payment cancel error:', updateError)
      return Response.json({ error: '결제 취소에 실패했습니다', details: updateError.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      payment: updatedPayment,
      rollback: {
        credits: payment.granted_credits_hours || 0,
        passMinutes: payment.granted_pass_amount
          ? (payment.granted_pass_type === 'hours'
            ? payment.granted_pass_amount * 60
            : payment.granted_pass_amount * 24 * 60)
          : 0,
      },
      message: '결제가 취소되었습니다'
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[Payments PATCH] Unexpected error:', error)
    return Response.json(
      { error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    )
  }
}
