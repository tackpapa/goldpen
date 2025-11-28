export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// PATCH /api/payments/[id] - 결제 취소 (상태 변경 + 크레딧/독서실시간 환수)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. 기존 결제 정보 조회
    const { data: payment, error: fetchError } = await supabase
      .from('payment_records')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !payment) {
      return Response.json({ error: '결제 내역을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (payment.status === 'cancelled') {
      return Response.json({ error: '이미 취소된 결제입니다.' }, { status: 400 })
    }

    // 2. 학생 정보 조회
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('credit, seatsremainingtime')
      .eq('id', payment.student_id)
      .single()

    if (studentError || !student) {
      return Response.json({ error: '학생 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 3. 크레딧 환수 (결제 시 부여한 크레딧 차감)
    if (payment.granted_credits_hours && payment.granted_credits_hours > 0) {
      const newCredit = Math.max(0, (student.credit || 0) - payment.granted_credits_hours)

      const { error: creditError } = await supabase
        .from('students')
        .update({ credit: newCredit })
        .eq('id', payment.student_id)

      if (creditError) {
        console.error('Credit rollback error:', creditError)
        return Response.json({ error: '크레딧 환수에 실패했습니다.' }, { status: 500 })
      }
    }

    // 4. 독서실 시간 환수 (결제 시 부여한 시간 차감)
    if (payment.granted_pass_amount && payment.granted_pass_amount > 0) {
      const minutesToSubtract = payment.granted_pass_type === 'hours'
        ? payment.granted_pass_amount * 60
        : payment.granted_pass_amount * 24 * 60

      const newTime = Math.max(0, (student.seatsremainingtime || 0) - minutesToSubtract)

      const { error: passError } = await supabase
        .from('students')
        .update({ seatsremainingtime: newTime })
        .eq('id', payment.student_id)

      if (passError) {
        console.error('Pass rollback error:', passError)
        return Response.json({ error: '독서실 시간 환수에 실패했습니다.' }, { status: 500 })
      }
    }

    // 5. 결제 상태를 '취소'로 변경
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payment_records')
      .update({
        status: 'cancelled',
        refunded_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Payment cancel error:', updateError)
      return Response.json({ error: '결제 취소에 실패했습니다.' }, { status: 500 })
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
    })
  } catch (error) {
    console.error('Payment cancel API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
