import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { createClient } from '@supabase/supabase-js'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const paymentSchema = z.object({
  student_id: z.string().uuid(),
  student_name: z.string().min(1),
  amount: z.coerce.number().nonnegative(),
  payment_method: z.string().min(1),
  revenue_category_id: z.string().uuid().optional(),
  revenue_category_name: z.string().optional(),
  class_credits: z.object({
    hours: z.coerce.number().nonnegative()
  }).optional(),
  study_room_pass: z.object({
    type: z.enum(['hours', 'days']),
    amount: z.coerce.number().nonnegative()
  }).optional(),
  notes: z.string().optional(),
})

/**
 * POST /api/payments
 * 결제 기록 생성 + 학생 크레딧/독서실 시간 업데이트
 */
export async function POST(request: Request) {
  try {
    const { orgId, role } = await getSupabaseWithOrg(request)

    // 권한 확인 (owner, manager만 결제 처리 가능)
    if (role && !['owner', 'manager'].includes(role)) {
      return Response.json({ error: '결제를 처리할 권한이 없습니다' }, { status: 403 })
    }

    const body = await request.json()
    const validated = paymentSchema.parse(body)

    // Service client 필요 (학생 크레딧/독서실 시간 업데이트)
    const service = getServiceClient()
    if (!service) {
      return Response.json({ error: '서버 설정 오류' }, { status: 500 })
    }

    const {
      student_id,
      student_name,
      amount,
      payment_method,
      revenue_category_id,
      revenue_category_name,
      class_credits,
      study_room_pass,
      notes,
    } = validated

    // 1. 학생 크레딧 업데이트 (수업권 충전)
    if (class_credits && class_credits.hours > 0) {
      const { data: student } = await service
        .from('students')
        .select('credit')
        .eq('id', student_id)
        .eq('org_id', orgId)
        .single()

      const newCredit = (student?.credit || 0) + class_credits.hours

      const { error: creditError } = await service
        .from('students')
        .update({ credit: newCredit })
        .eq('id', student_id)
        .eq('org_id', orgId)

      if (creditError) {
        console.error('[Payments POST] Credit update error:', creditError)
        return Response.json({ error: '크레딧 업데이트 실패', details: creditError.message }, { status: 500 })
      }
    }

    // 2. 학생 독서실 시간 업데이트 (독서실 이용권 충전)
    if (study_room_pass && study_room_pass.amount > 0) {
      const { data: student } = await service
        .from('students')
        .select('seatsremainingtime')
        .eq('id', student_id)
        .eq('org_id', orgId)
        .single()

      // 분 단위로 변환
      const minutesToAdd = study_room_pass.type === 'hours'
        ? study_room_pass.amount * 60
        : study_room_pass.amount * 24 * 60

      const newTime = (student?.seatsremainingtime || 0) + minutesToAdd

      const { error: passError } = await service
        .from('students')
        .update({ seatsremainingtime: newTime })
        .eq('id', student_id)
        .eq('org_id', orgId)

      if (passError) {
        console.error('[Payments POST] Pass update error:', passError)
        return Response.json({ error: '독서실 시간 업데이트 실패', details: passError.message }, { status: 500 })
      }
    }

    // 3. 결제 기록 생성
    const { data: payment, error: paymentError } = await service
      .from('payment_records')
      .insert({
        org_id: orgId,
        student_id,
        student_name,
        amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method,
        revenue_category_id,
        revenue_category_name,
        granted_credits_hours: class_credits?.hours || null,
        granted_pass_type: study_room_pass?.type || null,
        granted_pass_amount: study_room_pass?.amount || null,
        status: 'completed',
        notes,
      })
      .select()
      .single()

    if (paymentError) {
      console.error('[Payments POST] Payment insert error:', paymentError)
      return Response.json({ error: '결제 기록 생성 실패', details: paymentError.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      payment,
      message: '결제가 완료되었습니다'
    }, { status: 201 })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: '입력 데이터가 유효하지 않습니다', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[Payments POST] Unexpected error:', error)
    return Response.json(
      { error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    )
  }
}
