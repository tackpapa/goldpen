import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
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
})

// GET: 좌석 배정 목록 조회
export async function GET(request: Request) {
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

    // Get all seat assignments with student info
    const { data: assignments, error: assignmentsError } = await supabase
      .from('seat_assignments')
      .select('*, students(id, name, grade)')
      .eq('org_id', userProfile.org_id)
      .order('seat_number', { ascending: true })

    if (assignmentsError) {
      console.error('[SeatAssignments GET] Error:', assignmentsError)
      return Response.json({ error: '좌석 배정 조회 실패', details: assignmentsError.message }, { status: 500 })
    }

    // Get active study room passes for all assigned students (use service role to bypass RLS)
    const studentIds = (assignments || []).map((a: any) => a.student_id).filter(Boolean)
    let passesMap: Record<string, { remaining_amount: number, pass_type: string }> = {}

    if (studentIds.length > 0) {
      const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)
      const { data: passes, error: passesError } = await serviceSupabase
        .from('study_room_passes')
        .select('student_id, remaining_amount, pass_type')
        .in('student_id', studentIds)
        .eq('status', 'active')

      console.log('[SeatAssignments GET] studentIds:', studentIds)
      console.log('[SeatAssignments GET] passes query result:', passes, 'error:', passesError)

      if (passes) {
        passes.forEach((p: any) => {
          // 이미 있으면 합산 (여러 이용권 가능)
          if (passesMap[p.student_id]) {
            if (p.pass_type === 'hours') {
              passesMap[p.student_id].remaining_amount += p.remaining_amount
            }
          } else {
            passesMap[p.student_id] = { remaining_amount: p.remaining_amount, pass_type: p.pass_type }
          }
        })
      }
    }

    // Transform to frontend format
    const formattedAssignments = (assignments || []).map((a: any) => {
      const pass = passesMap[a.student_id]
      // hours 타입이면 분으로 변환, days 타입이면 그대로
      const remainingMinutes = pass
        ? (pass.pass_type === 'hours' ? pass.remaining_amount * 60 : null)
        : null

      return {
        seatNumber: a.seat_number,
        studentId: a.student_id,
        studentName: a.students?.name || null,
        studentGrade: a.students?.grade || null,
        status: a.status,
        checkInTime: a.check_in_time,
        sessionStartTime: a.session_start_time,
        allocatedMinutes: a.allocated_minutes,
        remainingMinutes,
        passType: pass?.pass_type || null,
        remainingDays: pass?.pass_type === 'days' ? pass.remaining_amount : null,
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
    const validated = updateStatusSchema.parse(body)

    // Get current assignment to access session data
    const { data: currentAssignment, error: fetchError } = await supabase
      .from('seat_assignments')
      .select('*, students(id, remaining_minutes)')
      .eq('org_id', userProfile.org_id)
      .eq('seat_number', validated.seatNumber)
      .single()

    if (fetchError || !currentAssignment) {
      return Response.json({ error: '좌석 배정을 찾을 수 없습니다' }, { status: 404 })
    }

    const updateData: any = {
      status: validated.status,
      updated_at: new Date().toISOString(),
    }

    // Set check_in_time and session_start_time when checking in
    if (validated.status === 'checked_in') {
      updateData.check_in_time = new Date().toISOString()
      updateData.session_start_time = new Date().toISOString()
    } else {
      // Check out - deduct usage time from study_room_passes
      updateData.check_in_time = null

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
      .eq('org_id', userProfile.org_id)
      .eq('seat_number', validated.seatNumber)
      .select()
      .single()

    if (updateError) {
      console.error('[SeatAssignments PUT] Error:', updateError)
      return Response.json({ error: '상태 업데이트 실패', details: updateError.message }, { status: 500 })
    }

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
