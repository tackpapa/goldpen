import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const createScheduleSchema = z.object({
  class_id: z.string().uuid(),
  teacher_id: z.string().uuid().optional(),
  room_id: z.string().uuid().optional(),
  day_of_week: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  start_time: z.string(), // HH:MM 형식
  end_time: z.string(),
  status: z.enum(['active', 'cancelled', 'completed']).optional(),
  notes: z.string().optional(),
})

const updateScheduleSchema = z.object({
  id: z.string().uuid(),
  class_id: z.string().uuid(),
  teacher_id: z.string().uuid().optional().nullable(),
  room_id: z.string().uuid().optional().nullable(),
  day_of_week: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  status: z.enum(['active', 'cancelled', 'completed']).optional(),
  notes: z.string().optional(),
})

const deleteScheduleSchema = z.object({
  id: z.string().uuid(),
})

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

    const { searchParams } = new URL(request.url)
    const day_of_week = searchParams.get('day_of_week')
    const teacher_id = searchParams.get('teacher_id')
    const room_id = searchParams.get('room_id')

    // 1) 기본 스케줄 조회 (조인 없이 실패 가능성 낮추기)
    let scheduleQuery = supabase
      .from('schedules')
      .select('id, org_id, class_id, teacher_id, room_id, day_of_week, start_time, end_time, status, notes')
      .eq('org_id', userProfile.org_id)
      .order('day_of_week', { ascending: true })

    if (day_of_week) scheduleQuery = scheduleQuery.eq('day_of_week', day_of_week)
    if (teacher_id) scheduleQuery = scheduleQuery.eq('teacher_id', teacher_id)
    if (room_id) scheduleQuery = scheduleQuery.eq('room_id', room_id)

    const { data: schedulesRaw, error: schedulesError } = await scheduleQuery
    if (schedulesError) {
      // 테이블 미존재 등 치명적 에러 시 빈 배열 반환해 UI가 죽지 않도록
      console.error('[Schedules GET] schedules error:', schedulesError)
      if ((schedulesError as any).code === '42P01') {
        return Response.json({ schedules: [], count: 0 })
      }
      return Response.json({ error: '스케줄 목록 조회 실패', details: schedulesError.message }, { status: 500 })
    }

    const schedules = schedulesRaw || []

    const classIds = Array.from(new Set(schedules.map((s) => s.class_id).filter(Boolean)))
    const teacherIds = Array.from(new Set(schedules.map((s) => s.teacher_id).filter(Boolean)))
    const roomIds = Array.from(new Set(schedules.map((s) => s.room_id).filter(Boolean)))

    // 2) 클래스 이름 맵
    let classNameMap = new Map<string, { name: string; teacher_id?: string | null }>()
    if (classIds.length) {
      const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name, teacher_id')
        .in('id', classIds)
      if (error) {
        console.warn('[Schedules GET] classes join skipped:', error.message)
      } else {
        classNameMap = new Map((classes || []).map((c: any) => [c.id, { name: c.name, teacher_id: c.teacher_id }]))
      }
    }

    // 3) 강사 이름 맵
    let teacherNameMap = new Map<string, string>()
    if (teacherIds.length) {
      const { data: teachers, error } = await supabase
        .from('teachers')
        .select('id, name')
        .in('id', teacherIds)
      if (error) {
        console.warn('[Schedules GET] teachers join skipped:', error.message)
      } else {
        teacherNameMap = new Map((teachers || []).map((t: any) => [t.id, t.name]))
      }
    }

    // 4) 강의실 이름 맵
    let roomNameMap = new Map<string, string>()
    if (roomIds.length) {
      const { data: rooms, error } = await supabase
        .from('rooms')
        .select('id, name')
        .in('id', roomIds)
      if (error) {
        console.warn('[Schedules GET] rooms join skipped:', error.message)
      } else {
        roomNameMap = new Map((rooms || []).map((r: any) => [r.id, r.name]))
      }
    }

    const enriched = schedules.map((s: any) => ({
      ...s,
      classes: classNameMap.get(s.class_id ?? '') || null,
      teacher: s.teacher_id ? { name: teacherNameMap.get(s.teacher_id) || '미지정' } : null,
      rooms: s.room_id ? { name: roomNameMap.get(s.room_id) || '미지정' } : null,
    }))

    return Response.json({ schedules: enriched, count: enriched.length })
  } catch (error: any) {
    console.error('[Schedules GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    const body = await request.json()
    const validated = createScheduleSchema.parse(body)

    const { data: schedule, error: createError } = await supabase
      .from('schedules')
      .insert({
        ...validated,
        org_id: userProfile.org_id
      })
      .select()
      .single()

    if (createError) {
      console.error('[Schedules POST] Error:', createError)
      return Response.json({ error: '스케줄 생성 실패', details: createError.message }, { status: 500 })
    }

    return Response.json({ schedule, message: '스케줄이 생성되었습니다' }, { status: 201 })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Schedules POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
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
    const validated = updateScheduleSchema.parse(body)

    // 소유권 확인
    const { data: existing, error: existingError } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', validated.id)
      .eq('org_id', userProfile.org_id)
      .single()

    if (existingError || !existing) {
      return Response.json({ error: '스케줄을 찾을 수 없습니다' }, { status: 404 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('schedules')
      .update({
        class_id: validated.class_id,
        teacher_id: validated.teacher_id ?? null,
        room_id: validated.room_id ?? existing.room_id ?? null,
        day_of_week: validated.day_of_week ?? existing.day_of_week,
        start_time: validated.start_time ?? existing.start_time,
        end_time: validated.end_time ?? existing.end_time,
        status: validated.status ?? existing.status,
        notes: validated.notes ?? existing.notes,
      })
      .eq('id', validated.id)
      .eq('org_id', userProfile.org_id)
      .select()
      .single()

    if (updateError) {
      console.error('[Schedules PATCH] Error:', updateError)
      return Response.json({ error: '스케줄 수정 실패', details: updateError.message }, { status: 500 })
    }

    return Response.json({ schedule: updated, message: '스케줄이 수정되었습니다' })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Schedules PATCH] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

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
    const { id } = deleteScheduleSchema.parse(body)

    const { error: deleteError } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id)
      .eq('org_id', userProfile.org_id)

    if (deleteError) {
      console.error('[Schedules DELETE] Error:', deleteError)
      return Response.json({ error: '스케줄 삭제 실패', details: deleteError.message }, { status: 500 })
    }

    return Response.json({ message: '스케줄이 삭제되었습니다' })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Schedules DELETE] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
