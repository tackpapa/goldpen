import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/teachers/[id]/lessons?limit=30&offset=0
 * 강사 수업 이력 조회 (수업일지 작성된 것만)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { id: teacherId } = await params

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '30')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // 강사 정보 확인 (같은 org인지)
    const { data: teacher, error: teacherError } = await db
      .from('teachers')
      .select('id')
      .eq('id', teacherId)
      .eq('org_id', orgId)
      .single()

    if (teacherError || !teacher) {
      return Response.json({ error: '강사 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    // 4. 수업 이력 조회 (lessons 테이블만 - class_id로 JOIN 시도 시 에러 발생)
    const { data: lessons, error: lessonsError, count } = await db
      .from('lessons')
      .select('*', { count: 'exact' })
      .eq('teacher_id', teacherId)
      .order('lesson_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (lessonsError) {
      console.error('[Lessons API] Query error:', lessonsError)
      return Response.json({ error: '수업 이력 조회 실패' }, { status: 500 })
    }

    // 5. class_id 목록 추출 후 classes 테이블에서 정원수 조회
    const classIds = [...new Set((lessons || []).map((l: any) => l.class_id).filter(Boolean))]
    let classCapacities: Record<string, number> = {}

    if (classIds.length > 0) {
      const { data: classes } = await db
        .from('classes')
        .select('id, capacity')
        .in('id', classIds)

      if (classes) {
        classCapacities = Object.fromEntries(
          classes.map((c: any) => [c.id, c.capacity || 0])
        )
      }
    }

    // 6. 응답 포맷 정리
    const formattedLessons = (lessons || []).map((lesson: any) => {
      // lesson_time 파싱하여 duration 계산 (예: "17:00-18:30" → 1.5시간)
      const durationMinutes = calculateDuration(lesson.lesson_time || '')

      return {
        id: lesson.id,
        date: lesson.lesson_date,
        subject: lesson.subject,
        class_name: lesson.class_name || lesson.class_id,
        lesson_time: lesson.lesson_time || '-',
        student_count: lesson.class_id ? (classCapacities[lesson.class_id] || 0) : 0,
        duration_minutes: durationMinutes,
        duration_hours: Math.round(durationMinutes / 60 * 10) / 10,
        content: lesson.content || '',
        attendance_count: lesson.attendance_count,
        homework: lesson.homework,
        created_at: lesson.created_at
      }
    })

    return Response.json({
      lessons: formattedLessons,
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: (offset + limit) < (count || 0)
      }
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[Lessons API] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

/**
 * lesson_time 파싱하여 duration 계산
 * @param lessonTime "17:00-18:30" 형식의 문자열
 * @returns duration in minutes
 */
function calculateDuration(lessonTime: string): number {
  if (!lessonTime || !lessonTime.includes('-')) return 0

  try {
    const [start, end] = lessonTime.split('-')
    const [startHour, startMin] = start.split(':').map(Number)
    const [endHour, endMin] = end.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    const durationMinutes = endMinutes - startMinutes

    return durationMinutes > 0 ? durationMinutes : 0
  } catch (error) {
    console.error('[calculateDuration] Parse error:', lessonTime, error)
    return 0
  }
}
