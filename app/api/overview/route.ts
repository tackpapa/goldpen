import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    // Parallel queries for better performance
    const [
      studentsResult,
      teachersResult,
      classesResult,
      todayLessonsResult,
      upcomingHomeworkResult,
      pendingBillingResult,
      monthlyExpensesResult,
      recentAttendanceResult
    ] = await Promise.all([
      // Total students
      db
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId),

      // Total teachers
      db
        .from('teachers')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId),

      // Total classes
      db
        .from('classes')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId),

      // Today's lessons
      db
        .from('lessons')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('lesson_date', new Date().toISOString().split('T')[0])
        .in('status', ['scheduled', 'in_progress']),

      // Upcoming homework (due in next 7 days)
      db
        .from('homework')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'active')
        .gte('due_date', new Date().toISOString())
        .lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),

      // Pending billing
      db
        .from('billing')
        .select('amount')
        .eq('org_id', orgId)
        .eq('status', 'pending'),

      // Monthly expenses (current month)
      db
        .from('expenses')
        .select('amount')
        .eq('org_id', orgId)
        .gte('expense_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
        .lte('expense_date', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]),

      // Recent attendance (last 30 days)
      db
        .from('attendance')
        .select('status')
        .eq('org_id', orgId)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    ])

    // Calculate aggregations
    const totalStudents = studentsResult.count || 0
    let totalTeachers = teachersResult.count || 0
    if (teachersResult.error) {
      // teachers 테이블 미존재 시 users.role=teacher로 대체
      const { count, error } = await db
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('role', 'teacher')
      if (!error) totalTeachers = count || 0
    }
    const totalClasses = classesResult.count || 0
    const todayLessons = todayLessonsResult.count || 0
    const upcomingHomework = upcomingHomeworkResult.count || 0

    const pendingBillingAmount = pendingBillingResult.data?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0
    const monthlyExpensesAmount = monthlyExpensesResult.data?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0

    const recentAttendanceData = recentAttendanceResult.data || []
    const attendanceRate = recentAttendanceData.length > 0
      ? (recentAttendanceData.filter((a: any) => a.status === 'present').length / recentAttendanceData.length) * 100
      : 0

    const overview = {
      students: {
        total: totalStudents
      },
      teachers: {
        total: totalTeachers
      },
      classes: {
        total: totalClasses
      },
      lessons: {
        today: todayLessons
      },
      homework: {
        upcoming: upcomingHomework
      },
      billing: {
        pending_amount: pendingBillingAmount,
        pending_count: pendingBillingResult.data?.length || 0
      },
      expenses: {
        monthly_total: monthlyExpensesAmount,
        monthly_count: monthlyExpensesResult.data?.length || 0
      },
      attendance: {
        recent_rate: Math.round(attendanceRate * 10) / 10, // Round to 1 decimal
        recent_total: recentAttendanceData.length
      }
    }

    return Response.json({ overview }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' }
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[Overview GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
