export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 학생 모달에 필요한 모든 데이터를 한 번에 가져오는 API
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await params
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // 병렬로 모든 데이터 fetch
    const [
      studentResult,
      subscriptionsResult,
      servicesResult,
      enrollmentsResult,
      schedulesResult,
      attendanceResult,
      paymentsResult,
      creditsResult,
      creditUsagesResult,
      passesResult,
      usagesResult,
    ] = await Promise.all([
      // 학생 기본 정보
      supabase
        .from('students')
        .select('*, organizations(name, slug)')
        .eq('id', studentId)
        .single(),

      // 이용권 (구독)
      supabase
        .from('student_subscriptions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false }),

      // 서비스 소속 (학원/독서실/공부방)
      supabase
        .from('student_services')
        .select('*')
        .eq('student_id', studentId),

      // 수업 등록 (enrollments + class info)
      supabase
        .from('enrollments')
        .select('*, classes(id, name, subject, teacher_id, teachers(name))')
        .eq('student_id', studentId),

      // 출석 스케줄
      supabase
        .from('attendance_schedules')
        .select('*')
        .eq('student_id', studentId)
        .order('day_of_week', { ascending: true }),

      // 출석 기록 (최근 100건)
      supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId)
        .order('attendance_date', { ascending: false })
        .limit(100),

      // 결제 기록
      supabase
        .from('payment_records')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false }),

      // 수업 크레딧
      supabase
        .from('class_credits')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false }),

      // 크레딧 사용 내역 (별도 조회 - credit_id가 null일 수 있으므로 student_id로 조회)
      supabase
        .from('credit_usages')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false }),

      // 독서실 이용권
      supabase
        .from('study_room_passes')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false }),

      // 독서실 이용 기록 (최근 50건)
      supabase
        .from('study_room_usages')
        .select('*')
        .eq('student_id', studentId)
        .order('check_in_time', { ascending: false })
        .limit(50),
    ])

    // 에러 체크
    if (studentResult.error) {
      return NextResponse.json(
        { error: 'Student not found', details: studentResult.error.message },
        { status: 404 }
      )
    }

    // 활성 이용권 찾기
    const activeSubscription = subscriptionsResult.data?.find(
      (s) => s.status === 'active'
    )

    // 활성 독서실 이용권 찾기
    const activePass = passesResult.data?.find((p) => p.status === 'active')

    return NextResponse.json({
      student: studentResult.data,
      subscriptions: subscriptionsResult.data || [],
      activeSubscription,
      services: servicesResult.data || [],
      enrollments: enrollmentsResult.data || [],
      schedules: schedulesResult.data || [],
      attendance: attendanceResult.data || [],
      payments: paymentsResult.data || [],
      credits: creditsResult.data || [],
      creditUsages: creditUsagesResult.data || [],
      passes: passesResult.data || [],
      activePass,
      usages: usagesResult.data || [],
    })
  } catch (error) {
    console.error('Student modal API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
