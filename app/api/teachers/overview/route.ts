import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/teachers/overview
 * 반환: teachers + assigned_students_count + assigned_classes_count + 월별 수업 통계
 */
export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { data: teachers, error: teacherError } = await db
      .from('teachers')
      .select('id, org_id, user_id, name, email, phone, subjects, status, employment_type, salary_type, salary_amount, hire_date, notes, created_at, updated_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    let teachersSafe = teachers || []
    if (teacherError) {
      if ((teacherError as any).code === '42P01') {
        const { data: usersFallback, error: usersError } = await db
          .from('users')
          .select('id, org_id, name, email, phone, role, created_at, updated_at')
          .eq('org_id', orgId)
          .eq('role', 'teacher')
          .order('created_at', { ascending: false })
        if (usersError) {
          console.error('[teachers/overview] users fallback error', usersError)
          return Response.json({ error: '강사 조회 실패', details: usersError.message }, { status: 500 })
        }
        teachersSafe = (usersFallback || []).map((u: any) => ({
          id: u.id,
          org_id: u.org_id,
          user_id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          subjects: [],
          status: 'active',
          employment_type: 'full_time',
          salary_type: 'monthly',
          salary_amount: 0,
          hire_date: '',
          notes: null,
          created_at: u.created_at,
          updated_at: u.updated_at,
        }))
      } else {
        console.error('[teachers/overview] teachers error', teacherError)
        return Response.json({ error: '강사 조회 실패', details: teacherError.message }, { status: 500 })
      }
    }

    const { data: students, error: studentError } = await db
      .from('students')
      .select('id, teacher_id')
      .eq('org_id', orgId)
    if (studentError) {
      console.error('[teachers/overview] students error', studentError)
      return Response.json({ error: '학생 조회 실패', details: studentError.message }, { status: 500 })
    }

    const { data: classes, error: classError } = await db
      .from('classes')
      .select('id, teacher_id')
      .eq('org_id', orgId)
    if (classError) {
      console.error('[teachers/overview] classes error', classError)
      return Response.json({ error: '반 조회 실패', details: classError.message }, { status: 500 })
    }

    // 이번 달 수업 통계
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const startDate = `${currentMonth}-01`
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const { data: lessons, error: lessonsError } = await db
      .from('lessons')
      .select('teacher_id, lesson_time')
      .eq('org_id', orgId)
      .gte('lesson_date', startDate)
      .lte('lesson_date', endDate)

    if (lessonsError) {
      console.error('[teachers/overview] lessons error', lessonsError)
      // 통계만 실패: 계속 진행
    }

    const studentMap = new Map<string, number>()
    ;(students || []).forEach((s: any) => {
      if (s.teacher_id) studentMap.set(s.teacher_id, (studentMap.get(s.teacher_id) || 0) + 1)
    })

    const classMap = new Map<string, number>()
    ;(classes || []).forEach((c: any) => {
      if (c.teacher_id) classMap.set(c.teacher_id, (classMap.get(c.teacher_id) || 0) + 1)
    })

    const lessonStatsMap = new Map<string, { totalHours: number; lessonCount: number }>()
    ;(lessons || []).forEach((lesson: any) => {
      if (!lesson.teacher_id) return
      const duration = calculateDuration(lesson.lesson_time || '')
      const hours = duration / 60
      const current = lessonStatsMap.get(lesson.teacher_id) || { totalHours: 0, lessonCount: 0 }
      lessonStatsMap.set(lesson.teacher_id, {
        totalHours: current.totalHours + hours,
        lessonCount: current.lessonCount + 1,
      })
    })

    const result = (teachersSafe || []).map((t: any) => {
      const stats = lessonStatsMap.get(t.id) || { totalHours: 0, lessonCount: 0 }
      return {
        id: t.id,
        org_id: t.org_id,
        user_id: t.user_id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        subjects: t.subjects,
        status: t.status,
        employment_type: t.employment_type,
        salary_type: t.salary_type,
        salary_amount: t.salary_amount,
        hire_date: t.hire_date,
        notes: t.notes,
        created_at: t.created_at,
        updated_at: t.updated_at,
        assigned_students_count: studentMap.get(t.id) || 0,
        assigned_classes_count: classMap.get(t.id) || 0,
        monthly_total_hours: Math.round(stats.totalHours * 10) / 10,
        monthly_lesson_count: stats.lessonCount,
      }
    })

    return Response.json({ teachers: result }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[teachers/overview] Unexpected', error)
    return Response.json({ error: '서버 오류', details: error.message }, { status: 500 })
  }
}

function calculateDuration(lessonTime: string): number {
  if (!lessonTime || !lessonTime.includes('-')) return 0
  try {
    const [start, end] = lessonTime.split('-')
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const startMinutes = sh * 60 + sm
    const endMinutes = eh * 60 + em
    const duration = endMinutes - startMinutes
    return duration > 0 ? duration : 0
  } catch (e) {
    console.error('[calculateDuration] Parse error:', lessonTime, e)
    return 0
  }
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
