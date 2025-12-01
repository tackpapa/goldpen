import { getSupabaseWithOrg } from '@/app/api/_utils/org'
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
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { searchParams } = new URL(request.url)
    const day_of_week = searchParams.get('day_of_week')
    const teacher_id = searchParams.get('teacher_id')
    const room_id = searchParams.get('room_id')

    // 1) 기본 스케줄 조회 (조인 없이 실패 가능성 낮추기)
    let scheduleQuery = db
      .from('schedules')
      .select('id, org_id, class_id, teacher_id, room_id, day_of_week, start_time, end_time, status, notes')
      .eq('org_id', orgId)
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

    const classIds = Array.from(new Set(schedules.map((s: any) => s.class_id).filter(Boolean)))
    const teacherIds = Array.from(new Set(schedules.map((s: any) => s.teacher_id).filter(Boolean)))
    const roomIds = Array.from(new Set(schedules.map((s: any) => s.room_id).filter(Boolean)))

    // 2) 클래스 이름 맵
    let classNameMap = new Map<string, { name: string; teacher_id?: string | null }>()
    if (classIds.length) {
      const { data: classes, error } = await db
        .from('classes')
        .select('id, name, teacher_id')
        .in('id', classIds)
      if (error) {
        console.warn('[Schedules GET] classes join skipped:', error.message)
      } else {
        classNameMap = new Map((classes || []).map((c: any) => [c.id, { name: c.name, teacher_id: c.teacher_id }]))
      }
    }

    // 3) 강사 이름 맵 (teachers 테이블 없을 때 users.role=teacher 폴백)
    let teacherNameMap = new Map<string, string>()
    if (teacherIds.length) {
      const { data: teachers, error } = await db
        .from('teachers')
        .select('id, name')
        .in('id', teacherIds)
      if (error) {
        console.warn('[Schedules GET] teachers join skipped, fallback to users:', error.message)
        const { data: teacherUsers, error: userErr } = await db
          .from('users')
          .select('id, name, full_name, role')
          .in('id', teacherIds)
          .eq('role', 'teacher')
        if (!userErr && teacherUsers) {
          teacherNameMap = new Map(
            teacherUsers.map((t: any) => [t.id, t.name || t.full_name || '미지정'])
          )
        }
      } else {
        teacherNameMap = new Map((teachers || []).map((t: any) => [t.id, t.name]))
      }
    }

    // 4) 강의실 이름 맵
    let roomNameMap = new Map<string, string>()
    if (roomIds.length) {
      const { data: rooms, error } = await db
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

    return Response.json({ schedules: enriched, count: enriched.length }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[Schedules GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { db, orgId, role } = await getSupabaseWithOrg(request)

    // 권한 확인 (owner, manager만 스케줄 생성 가능)
    if (role && !['owner', 'manager', 'service_role'].includes(role)) {
      return Response.json({ error: '스케줄을 생성할 권한이 없습니다' }, { status: 403 })
    }

    const body = await request.json()
    const validated = createScheduleSchema.parse(body)

    const { data: schedule, error: createError } = await db
      .from('schedules')
      .insert({
        ...validated,
        org_id: orgId
      })
      .select()
      .single()

    if (createError) {
      console.error('[Schedules POST] Error:', createError)
      return Response.json({ error: '스케줄 생성 실패', details: createError.message }, { status: 500 })
    }

    return Response.json({ schedule, message: '스케줄이 생성되었습니다' }, { status: 201 })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Schedules POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { db, orgId, role } = await getSupabaseWithOrg(request)

    // 권한 확인 (owner, manager만 스케줄 수정 가능)
    if (role && !['owner', 'manager', 'service_role'].includes(role)) {
      return Response.json({ error: '스케줄을 수정할 권한이 없습니다' }, { status: 403 })
    }

    const body = await request.json()
    const validated = updateScheduleSchema.parse(body)

    // 소유권 확인
    const { data: existing, error: existingError } = await db
      .from('schedules')
      .select('*')
      .eq('id', validated.id)
      .eq('org_id', orgId)
      .single()

    if (existingError || !existing) {
      return Response.json({ error: '스케줄을 찾을 수 없습니다' }, { status: 404 })
    }

    const { data: updated, error: updateError } = await db
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
      .eq('org_id', orgId)
      .select()
      .single()

    if (updateError) {
      console.error('[Schedules PATCH] Error:', updateError)
      return Response.json({ error: '스케줄 수정 실패', details: updateError.message }, { status: 500 })
    }

    return Response.json({ schedule: updated, message: '스케줄이 수정되었습니다' })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Schedules PATCH] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { db, orgId, role } = await getSupabaseWithOrg(request)

    // 권한 확인 (owner, manager만 스케줄 삭제 가능)
    if (role && !['owner', 'manager', 'service_role'].includes(role)) {
      return Response.json({ error: '스케줄을 삭제할 권한이 없습니다' }, { status: 403 })
    }

    const body = await request.json()
    const { id } = deleteScheduleSchema.parse(body)

    const { error: deleteError } = await db
      .from('schedules')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (deleteError) {
      console.error('[Schedules DELETE] Error:', deleteError)
      return Response.json({ error: '스케줄 삭제 실패', details: deleteError.message }, { status: 500 })
    }

    return Response.json({ message: '스케줄이 삭제되었습니다' })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Schedules DELETE] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
