import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const LATE_GRACE_MINUTES = Number(process.env.NEXT_PUBLIC_ATTENDANCE_LATE_GRACE ?? '10')
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Schema for assigning a student to a seat
const assignSeatSchema = z.object({
  seatNumber: z.number().int().positive(),
  studentId: z.string().uuid(),
  allocatedMinutes: z.number().int().positive().nullable().optional(),
})

// Schema for removing assignment
const removeSeatSchema = z.object({
  seatNumber: z.number().int().positive(),
})

// Schema for updating status (check in/out)
const updateStatusSchema = z.object({
  seatNumber: z.number().int().positive(),
  status: z.enum(['checked_in', 'checked_out']),
  studentId: z.string().uuid().optional(), // 신규 upsert 시 필요할 수 있음
})

function parseTimeToMinutes(time: string) {
  const [h, m, s] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0) + (s ? s / 60 : 0)
}

async function upsertAttendanceForStudent(params: {
  supabase: any
  orgId: string
  studentId: string | null
  status: 'checked_in' | 'checked_out'
  now: Date
}) {
  const { supabase, orgId, studentId, status, now } = params
  if (!studentId) return

  const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
  const todayStr = now.toISOString().slice(0, 10)
  const dayOfWeek = dayMap[now.getDay()]

  // 1) 학생이 속한 반 조회
  const { data: enrollments, error: enrollError } = await supabase
    .from('class_enrollments')
    .select('class_id')
    .eq('student_id', studentId)
    .eq('org_id', orgId)
    .eq('status', 'active')

  if (enrollError || !enrollments?.length) return
  const classIds = enrollments.map((e: any) => e.class_id).filter(Boolean)
  if (!classIds.length) return

  // 2) 오늘 요일 스케줄 조회
  const { data: schedules, error: scheduleError } = await supabase
    .from('schedules')
    .select('id, class_id, start_time, end_time, day_of_week')
    .eq('org_id', orgId)
    .eq('day_of_week', dayOfWeek)
    .in('class_id', classIds)

  if (scheduleError || !schedules?.length) return

  // 가장 이른 수업을 기준으로 지각 판정
  const target = [...schedules].sort((a, b) => a.start_time.localeCompare(b.start_time))[0]
  const startMinutes = parseTimeToMinutes(target.start_time)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const attendanceStatus =
    status === 'checked_in' && nowMinutes > startMinutes + LATE_GRACE_MINUTES ? 'late' : 'present'

  // 기존 출결을 읽어서 체크인 시간을 보존 (중복 체크아웃 시 덮어쓰기 방지)
  const { data: existingAttendance } = await supabase
    .from('attendance')
    .select('check_in_time')
    .eq('org_id', orgId)
    .eq('student_id', studentId)
    .eq('class_id', target.class_id)
    .eq('date', todayStr)
    .maybeSingle()

  const payload: any = {
    org_id: orgId,
    student_id: studentId,
    class_id: target.class_id,
    date: todayStr,
    status: attendanceStatus,
    check_in_time: existingAttendance?.check_in_time || null,
  }

  if (status === 'checked_in') payload.check_in_time = now.toISOString()
  if (status === 'checked_out') payload.check_out_time = now.toISOString()

  const { error: attendanceError } = await supabase
    .from('attendance')
    .upsert(payload, { onConflict: 'org_id,class_id,student_id,date' })

  if (attendanceError) {
    console.error('[SeatAssignments Attendance] upsert error:', attendanceError)
  }
}

/**
 * Record institution-wide stay log (check-in/out) in attendance_logs table.
 * - check_in: inserts a new row if no open session
 * - check_out: closes the latest open session and sets duration_minutes
 */
async function recordAttendanceLog(orgId: string, studentId: string, status: 'checked_in' | 'checked_out') {
  const admin = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const now = new Date()

  // 최신 열린 세션
  const { data: openRows, error: openErr } = await admin
    .from('attendance_logs')
    .select('id, check_in_time')
    .eq('org_id', orgId)
    .eq('student_id', studentId)
    .is('check_out_time', null)
    .order('check_in_time', { ascending: false })
    .limit(1)

  if (openErr) {
    console.error('[attendance_logs] fetch open error', openErr)
    return
  }

  if (status === 'checked_in') {
    if (openRows && openRows.length > 0) return // 이미 열린 세션이 있으면 새로 만들지 않음
    const { error: insErr } = await admin.from('attendance_logs').insert({
      org_id: orgId,
      student_id: studentId,
      check_in_time: now.toISOString(),
      source: 'seats',
    })
    if (insErr) console.error('[attendance_logs] insert error', insErr)
    return
  }

  // checked_out
  if (!openRows || openRows.length === 0) return
  const open = openRows[0]
  const durationMinutes = Math.max(
    1,
    Math.ceil((now.getTime() - new Date(open.check_in_time).getTime()) / (1000 * 60))
  )
  const { error: updErr } = await admin
    .from('attendance_logs')
    .update({ check_out_time: now.toISOString(), duration_minutes: durationMinutes })
    .eq('id', open.id)
  if (updErr) console.error('[attendance_logs] update error', updErr)
}

// GET: 좌석 배정 목록 조회
export async function GET(request: Request) {
  try {
    const isDev = process.env.NODE_ENV !== 'production'
    const demoOrgId = process.env.DEMO_ORG_ID || process.env.NEXT_PUBLIC_DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'
    const { searchParams } = new URL(request.url)
    const allowService = isDev && (searchParams.get('service') === '1' || searchParams.get('service') === null)

    // orgSlug 파라미터 지원 (프로덕션 livescreen용)
    const orgSlug = searchParams.get('orgSlug')

    let supabase: any = await createAuthenticatedClient(request)
    let { data: { user }, error: authError } = await supabase.auth.getUser()

    let orgId: string | null = null
    const orgParam = searchParams.get('org_id') || searchParams.get('orgId')

    // orgSlug가 제공된 경우 (프로덕션 livescreen) - organizations 테이블에서 org_id 조회
    if (orgSlug && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .single()

      if (orgError || !org) {
        console.error('[SeatAssignments GET] Organization not found for slug:', orgSlug)
        return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
      }
      orgId = org.id
    } else if ((!user || authError) && allowService && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any
      orgId = orgParam || demoOrgId
    } else {
      if (authError || !user) {
        return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
      }
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()

      if (profileError || !userProfile) {
        if (supabaseServiceKey) {
          supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any
          orgId = orgParam || demoOrgId
        } else {
          return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
        }
      }
      orgId = orgId || userProfile?.org_id
    }

    if (!orgId) return Response.json({ error: 'org_id가 필요합니다' }, { status: 400 })

    // Get all seat assignments with student info
    const { data: assignments, error: assignmentsError } = await supabase
      .from('seat_assignments')
      .select('*, students(id, name, grade, student_code, seatsremainingtime)')
      .eq('org_id', orgId)
      .order('seat_number', { ascending: true })

    if (assignmentsError) {
      console.error('[SeatAssignments GET] Error:', assignmentsError)
      return Response.json({ error: '좌석 배정 조회 실패', details: assignmentsError.message }, { status: 500 })
    }

    // Transform to frontend format
    const formattedAssignments = (assignments || []).map((a: any) => {
      return {
        seatNumber: a.seat_number,
        studentId: a.student_id,
        studentName: a.students?.name || null,
        studentGrade: a.students?.grade || null,
        studentCode: a.students?.student_code || null,
        status: a.status,
        checkInTime: a.check_in_time,
        sessionStartTime: a.session_start_time,
        updatedAt: a.updated_at,
        allocatedMinutes: a.allocated_minutes,
        seatsremainingtime: a.students?.seatsremainingtime ?? null,
        orgId: a.org_id,
      }
    })

    return Response.json({ assignments: formattedAssignments })
  } catch (error: any) {
    console.error('[SeatAssignments GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

// POST: 좌석에 학생 배정
export async function POST(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    const body = await request.json()
    const validated = assignSeatSchema.parse(body)

    // Check if student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, name')
      .eq('id', validated.studentId)
      .eq('org_id', userProfile.org_id)
      .single()

    if (studentError || !student) {
      return Response.json({ error: '학생을 찾을 수 없습니다' }, { status: 404 })
    }

    // Upsert assignment (update if exists, insert if not)
    const upsertData: any = {
      org_id: userProfile.org_id,
      seat_number: validated.seatNumber,
      student_id: validated.studentId,
      status: 'checked_out',
      updated_at: new Date().toISOString(),
    }

    // Add usage time if provided
    if (validated.allocatedMinutes) {
      upsertData.allocated_minutes = validated.allocatedMinutes
      upsertData.session_start_time = null // Will be set on check-in
    }

    const { data: assignment, error: assignError } = await supabase
      .from('seat_assignments')
      .upsert(upsertData, {
        onConflict: 'org_id,seat_number',
      })
      .select()
      .single()

    if (assignError) {
      console.error('[SeatAssignments POST] Error:', assignError)
      return Response.json({ error: '좌석 배정 실패', details: assignError.message }, { status: 500 })
    }

    return Response.json({
      message: '좌석 배정 완료',
      assignment: {
        seatNumber: assignment.seat_number,
        studentId: assignment.student_id,
        studentName: student.name,
        status: assignment.status,
      }
    }, { status: 201 })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    console.error('[SeatAssignments POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

// PUT: 좌석 상태 업데이트 (등원/하원)
export async function PUT(request: Request) {
  try {
    const isDev = process.env.NODE_ENV !== 'production'
    const demoOrgId = process.env.DEMO_ORG_ID || process.env.NEXT_PUBLIC_DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'
    const { searchParams } = new URL(request.url)
    const allowService = isDev && (searchParams.get('service') === '1' || searchParams.get('service') === null)

    let supabase: any = await createAuthenticatedClient(request)
    let { data: { user }, error: authError } = await supabase.auth.getUser()

    let orgId: string | null = null

    if ((!user || authError) && allowService && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any
      orgId = demoOrgId
    } else {
      if (authError || !user) {
        return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
      }
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()

      if (profileError || !userProfile) {
        if (supabaseServiceKey) {
          supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any
          orgId = demoOrgId
        } else {
          return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
        }
      } else {
        orgId = userProfile.org_id
      }
    }

    if (!orgId) return Response.json({ error: 'org_id가 필요합니다' }, { status: 400 })

    const body = await request.json()
    const validated = updateStatusSchema.parse(body)
    const orgToUse = orgId

    // Get current assignment to access session data
    const { data: currentAssignment, error: fetchError } = await supabase
      .from('seat_assignments')
      .select('*, students(id, seatsremainingtime, student_code)')
      .eq('org_id', orgToUse)
      .eq('seat_number', validated.seatNumber)
      .single()

    // 없으면 upsert (studentId가 없는 경우엔 더 진행하지 않고 404)
    let workingAssignment = currentAssignment
    if (fetchError || !currentAssignment) {
      if (!validated.studentId) {
        return Response.json({ error: '좌석 배정을 찾을 수 없습니다' }, { status: 404 })
      }
      const now = new Date().toISOString()
      const { data: inserted, error: insertError } = await supabase
        .from('seat_assignments')
        .insert({
          seat_number: validated.seatNumber,
          student_id: validated.studentId,
          org_id: orgToUse,
          status: validated.status,
          check_in_time: validated.status === 'checked_in' ? now : null,
          session_start_time: validated.status === 'checked_in' ? now : null,
        })
        .select('*, students(id, seatsremainingtime, student_code)')
        .single()
      if (insertError || !inserted) {
        return Response.json({ error: '좌석 배정 생성 실패', details: insertError?.message }, { status: 500 })
      }
      workingAssignment = inserted
    }

    const updateData: any = {
      status: validated.status,
      updated_at: new Date().toISOString(),
    }

    // Set check_in_time and session_start_time when checking in
    if (validated.status === 'checked_in') {
      const nowIso = new Date().toISOString()
      updateData.check_in_time = nowIso
      updateData.session_start_time = nowIso
    } else {
      // Check out - deduct usage time from study_room_passes
      // check_in_time는 보존 (출결 기록 중복 체크인/체크아웃 시 시간 유지)

      if (currentAssignment.session_start_time && currentAssignment.student_id) {
        const sessionStart = new Date(currentAssignment.session_start_time).getTime()
        const now = Date.now()
        const usedMinutes = Math.ceil((now - sessionStart) / (1000 * 60))
        const usedHours = usedMinutes / 60 // Convert to hours for study_room_passes

        // Use service role client to bypass RLS
        const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)

        // Find active hours-based pass for this student
        const { data: activePass } = await serviceSupabase
          .from('study_room_passes')
          .select('id, remaining_amount, pass_type')
          .eq('student_id', currentAssignment.student_id)
          .eq('status', 'active')
          .eq('pass_type', 'hours')
          .order('created_at', { ascending: true })
          .limit(1)
          .single()

        if (activePass) {
          const newRemaining = Math.max(0, activePass.remaining_amount - usedHours)
          await serviceSupabase
            .from('study_room_passes')
            .update({ remaining_amount: newRemaining })
            .eq('id', activePass.id)

          console.log(`[SeatAssignments PUT] Deducted ${usedHours.toFixed(2)}h from pass ${activePass.id}. New remaining: ${newRemaining.toFixed(2)}h`)
        }
      }

      updateData.session_start_time = null
    }

    const { data: assignment, error: updateError } = await supabase
      .from('seat_assignments')
      .update(updateData)
      .eq('org_id', orgToUse)
      .eq('seat_number', validated.seatNumber)
      .select()
      .single()

    if (updateError) {
      console.error('[SeatAssignments PUT] Error:', updateError)
      return Response.json({ error: '상태 업데이트 실패', details: updateError.message }, { status: 500 })
    }

    // attendance_logs 기록
    if (workingAssignment?.student_id) {
      await recordAttendanceLog(orgToUse, workingAssignment.student_id, validated.status)
    }

    // 동시로 출결 테이블 업데이트 (지각/출석)
    await upsertAttendanceForStudent({
      supabase,
      orgId: orgToUse,
      studentId: workingAssignment?.student_id || null,
      status: validated.status,
      now: new Date(),
    })

    return Response.json({
      message: validated.status === 'checked_in' ? '등원 처리 완료' : '하원 처리 완료',
      assignment: {
        seatNumber: assignment.seat_number,
        status: assignment.status,
        checkInTime: assignment.check_in_time,
      }
    })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    console.error('[SeatAssignments PUT] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

// DELETE: 좌석 배정 해제
export async function DELETE(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    const body = await request.json()
    const validated = removeSeatSchema.parse(body)

    const { error: deleteError } = await supabase
      .from('seat_assignments')
      .delete()
      .eq('org_id', userProfile.org_id)
      .eq('seat_number', validated.seatNumber)

    if (deleteError) {
      console.error('[SeatAssignments DELETE] Error:', deleteError)
      return Response.json({ error: '배정 해제 실패', details: deleteError.message }, { status: 500 })
    }

    return Response.json({ message: '좌석 배정 해제 완료' })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    console.error('[SeatAssignments DELETE] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
