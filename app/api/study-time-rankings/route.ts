import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const today = new Date().toISOString().split('T')[0]

    // Fetch daily rankings
    const { data: dailyData } = await db
      .from('study_time_records')
      .select('student_id, student_name, total_minutes')
      .eq('org_id', orgId)
      .eq('date', today)
      .order('total_minutes', { ascending: false })
      .limit(10)

    // Fetch weekly rankings (last 7 days)
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    const { data: weeklyRaw } = await db
      .from('study_time_records')
      .select('student_id, student_name, total_minutes')
      .eq('org_id', orgId)
      .gte('date', weekStartStr)
      .lte('date', today)

    // Aggregate weekly data
    const weeklyMap = new Map<string, { student_name: string; total_minutes: number }>()
    weeklyRaw?.forEach((r: any) => {
      const existing = weeklyMap.get(r.student_id)
      if (existing) {
        existing.total_minutes += r.total_minutes
      } else {
        weeklyMap.set(r.student_id, { student_name: r.student_name, total_minutes: r.total_minutes })
      }
    })
    const weeklyData = Array.from(weeklyMap.entries())
      .map(([student_id, data]) => ({ student_id, ...data }))
      .sort((a, b) => b.total_minutes - a.total_minutes)
      .slice(0, 10)

    // Fetch monthly rankings (last 30 days)
    const monthStart = new Date()
    monthStart.setDate(monthStart.getDate() - 30)
    const monthStartStr = monthStart.toISOString().split('T')[0]

    const { data: monthlyRaw } = await db
      .from('study_time_records')
      .select('student_id, student_name, total_minutes')
      .eq('org_id', orgId)
      .gte('date', monthStartStr)
      .lte('date', today)

    // Aggregate monthly data
    const monthlyMap = new Map<string, { student_name: string; total_minutes: number }>()
    monthlyRaw?.forEach((r: any) => {
      const existing = monthlyMap.get(r.student_id)
      if (existing) {
        existing.total_minutes += r.total_minutes
      } else {
        monthlyMap.set(r.student_id, { student_name: r.student_name, total_minutes: r.total_minutes })
      }
    })
    const monthlyData = Array.from(monthlyMap.entries())
      .map(([student_id, data]) => ({ student_id, ...data }))
      .sort((a, b) => b.total_minutes - a.total_minutes)
      .slice(0, 10)

    // Format rankings
    // 학생 학교 정보 보강용 조회
    const studentIds = new Set<string>()
    ;(dailyData || []).forEach((r: any) => studentIds.add(r.student_id))
    weeklyData.forEach((r: any) => studentIds.add(r.student_id))
    monthlyData.forEach((r: any) => studentIds.add(r.student_id))

    let studentSchools: Record<string, string | null> = {}
    if (studentIds.size > 0) {
      const { data: students } = await db
        .from('students')
        .select('id, school')
        .eq('org_id', orgId)
        .in('id', Array.from(studentIds))
      if (students) {
        studentSchools = Object.fromEntries(students.map((s: any) => [s.id, s.school ?? null]))
      }
    }

    const formatRankings = (data: any[], periodType: string, period: string) =>
      data?.map((r: any, idx: number) => ({
        student_id: r.student_id,
        student_name: r.student_name,
        surname: r.student_name ? `${r.student_name.charAt(0)}**` : '**',
        student_school: studentSchools[r.student_id] ?? null,
        total_minutes: r.total_minutes,
        rank: idx + 1,
        period_type: periodType,
        period,
      })) || []

    return Response.json({
      rankings: {
        daily: formatRankings(dailyData, 'daily', today),
        weekly: formatRankings(weeklyData, 'weekly', `${today.substring(0, 4)}-W${Math.ceil(new Date().getDate() / 7)}`),
        monthly: formatRankings(monthlyData, 'monthly', today.substring(0, 7)),
      }
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[StudyTimeRankings GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
