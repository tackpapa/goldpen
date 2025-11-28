import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: Request) {
  try {
    const isDev = process.env.NODE_ENV !== 'production'
    const demoOrgId = process.env.DEMO_ORG_ID || process.env.NEXT_PUBLIC_DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'
    const { searchParams } = new URL(request.url)
    const allowService = isDev && (searchParams.get('service') === '1' || searchParams.get('service') === null)

    let supabase: any = await createAuthenticatedClient(request)
    let { data: { user }, error: authError } = await supabase.auth.getUser()

    let orgId: string | null = null
    const orgParam = searchParams.get('orgId')

    if ((!user || authError) && allowService && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any
      orgId = orgParam || demoOrgId
    } else {
      if (authError || !user) {
        return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
      }
      const { data: userProfile } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()

      if (!userProfile) {
        if (supabaseServiceKey) {
          supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any
          orgId = orgParam || demoOrgId
        } else {
          return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
        }
      } else {
        orgId = userProfile.org_id
      }
    }

    if (!orgId) {
      return Response.json({ error: 'orgId가 필요합니다' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Fetch daily rankings
    const { data: dailyData } = await supabase
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

    const { data: weeklyRaw } = await supabase
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

    const { data: monthlyRaw } = await supabase
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
    const formatRankings = (data: any[], periodType: string, period: string) =>
      data?.map((r: any, idx: number) => ({
        student_id: r.student_id,
        student_name: r.student_name,
        surname: r.student_name ? `${r.student_name.charAt(0)}**` : '**',
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
    console.error('[StudyTimeRankings GET] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
