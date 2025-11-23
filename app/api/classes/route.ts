import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClassSchema } from '@/lib/validations/class'
import { ZodError } from 'zod'

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
    const supabase = await createAuthenticatedClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const subject = searchParams.get('subject')
    const teacherId = searchParams.get('teacher_id')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    let query = supabase
      .from('classes')
      .select('*, teacher:teacher_id(id, name, email)', { count: 'exact' })
      .eq('org_id', userProfile.org_id)
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

    const normalized =
      classes?.map((cls) => ({
        ...cls,
        schedule: Array.isArray(cls.schedule) ? cls.schedule : [],
      })) ?? []

    return Response.json({ classes: normalized, count: count || 0, total: count || 0 })
  } catch (error: any) {
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
    const supabase = await createAuthenticatedClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    const body = await request.json()
    const validated = createClassSchema.parse(body)

    let teacher_name: string | null = null
    if (validated.teacher_id) {
      const { data: teacherRow } = await supabase
        .from('teachers')
        .select('name')
        .eq('id', validated.teacher_id)
        .single()
      teacher_name = teacherRow?.name || null
    }

    const payload = {
      ...validated,
      org_id: userProfile.org_id,
      teacher_name: teacher_name ?? null,
      current_students: 0,
    }

    const { data: classData, error: createError } = await supabase
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
      supabase,
      orgId: userProfile.org_id,
      classId: classData.id,
      schedule: validated.schedule || [],
      roomName: validated.room,
    })

    return Response.json({ class: classData, message: '반이 생성되었습니다' }, { status: 201 })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    console.error('[Classes POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
