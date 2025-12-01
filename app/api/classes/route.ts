import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { createClassSchema } from '@/lib/validations/class'
import { ZodError } from 'zod'
import { logActivity, actionDescriptions } from '@/app/api/_utils/activity-log'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function syncSchedules({
  supabase,
  orgId,
  classId,
  schedule,
  roomName,
}: {
  supabase: any
  orgId: string
  classId: string
  schedule: { day: string; start_time: string; end_time: string }[]
  roomName?: string | null
}) {
  // delete existing schedules for this class then insert provided ones
  await supabase.from('schedules').delete().eq('class_id', classId)

  if (!schedule?.length) return

  let roomId: string | null = null
  if (roomName) {
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, name')
      .eq('org_id', orgId)
      .ilike('name', roomName)
    roomId = rooms?.[0]?.id || null
  }

  const payload = schedule.map((s) => ({
    org_id: orgId,
    class_id: classId,
    day_of_week: s.day,
    start_time: s.start_time,
    end_time: s.end_time,
    room_id: roomId,
  }))

  await supabase.from('schedules').insert(payload)
}

/**
 * GET /api/classes
 * 반 목록 조회
 */
export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const subject = searchParams.get('subject')
    const teacherId = searchParams.get('teacher_id')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    let query = db
      .from('classes')
      .select('*, teacher:teacher_id(id, name, email)', { count: 'exact' })
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (subject) query = query.eq('subject', subject)
    if (teacherId) query = query.eq('teacher_id', teacherId)
    if (limit) query = query.limit(limit)
    if (offset) query = query.range(offset, offset + (limit || 15) - 1)

    const { data: classes, error, count } = await query

    if (error) {
      console.error('[Classes GET] Error:', error)
      return Response.json({ error: '반 목록 조회 실패' }, { status: 500 })
    }

    // 실제 enrollment 수 계산 (students가 존재하는 것만 카운트)
    const classIds = classes?.map((c: any) => c.id) || []
    let enrollmentCounts: Record<string, number> = {}

    if (classIds.length > 0) {
      const { data: enrollments } = await db
        .from('class_enrollments')
        .select('class_id, student_id, students:student_id(id)')
        .eq('org_id', orgId)
        .or('status.eq.active,status.is.null')
        .in('class_id', classIds)

      // 학생이 실제로 존재하는 enrollment만 카운트
      if (enrollments) {
        for (const e of enrollments) {
          if (e.students) {
            enrollmentCounts[e.class_id] = (enrollmentCounts[e.class_id] || 0) + 1
          }
        }
      }
    }

    const normalized =
      classes?.map((cls: any) => ({
        ...cls,
        schedule: Array.isArray(cls.schedule) ? cls.schedule : [],
        current_students: enrollmentCounts[cls.id] || 0, // 실제 학생 수로 덮어쓰기
      })) ?? []

    return Response.json({ classes: normalized, count: count || 0, total: count || 0 }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[Classes GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/**
 * POST /api/classes
 * 반 생성
 */
export async function POST(request: Request) {
  try {
    const { db, orgId, user } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = createClassSchema.parse(body)

    let teacher_name: string | null = null
    if (validated.teacher_id) {
      const { data: teacherRow } = await db
        .from('teachers')
        .select('name')
        .eq('id', validated.teacher_id)
        .single()
      teacher_name = teacherRow?.name || null
    }

    const payload = {
      ...validated,
      org_id: orgId,
      teacher_name: teacher_name ?? null,
      current_students: 0,
    }

    const { data: classData, error: createError } = await db
      .from('classes')
      .insert(payload)
      .select()
      .single()

    if (createError) {
      console.error('[Classes POST] Error:', createError)
      return Response.json({ error: '반 생성 실패' }, { status: 500 })
    }

    // sync schedules table
    await syncSchedules({
      supabase: db,
      orgId,
      classId: classData.id,
      schedule: validated.schedule || [],
      roomName: validated.room,
    })

    // 활동 로그 기록
    await logActivity({
      orgId,
      userId: user?.id || null,
      userName: user?.email?.split('@')[0] || '사용자',
      userRole: null,
      actionType: 'create',
      entityType: 'class',
      entityId: classData.id,
      entityName: classData.name,
      description: actionDescriptions.class.create(classData.name || '이름 없음'),
      request,
    })

    return Response.json({ class: classData, message: '반이 생성되었습니다' }, { status: 201 })
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
    console.error('[Classes POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
