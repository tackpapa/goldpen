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
    const serviceParam = searchParams.get('service')
    // orgSlug 파라미터 지원 (프로덕션 livescreen용)
    const orgSlug = searchParams.get('orgSlug')
    const orgParam = searchParams.get('orgId')
    // service=1 또는 orgSlug가 있으면 서비스 모드 사용 (프로덕션에서도 허용)
    const allowService = serviceParam === '1' || !!orgSlug || (isDev && serviceParam === null)

    let supabase: any = await createAuthenticatedClient(request)
    let { data: { user }, error: authError } = await supabase.auth.getUser()

    let orgId: string | null = null

    if ((!user || authError) && allowService && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any

      // orgSlug로 org_id 조회 (프로덕션 지원)
      if (orgSlug) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', orgSlug)
          .single()

        if (orgError || !org) {
          console.error('[DailyStudyStats GET] Organization not found for slug:', orgSlug)
          return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
        }
        orgId = org.id
      } else {
        orgId = orgParam || demoOrgId
      }
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

    const studentId = searchParams.get('studentId')
    const date = searchParams.get('date')
    // 날짜 범위 조회 지원 (주간/월간 통계용)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!studentId) {
      return Response.json({ error: 'studentId가 필요합니다' }, { status: 400 })
    }

    if (!orgId) {
      return Response.json({ error: 'orgId가 필요합니다' }, { status: 400 })
    }

    let query = supabase
      .from('daily_study_stats')
      .select('*')
      .eq('student_id', studentId)
      .eq('org_id', orgId)

    // 날짜 범위 조회 (startDate, endDate 둘 다 있을 때)
    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    } else if (date) {
      // 단일 날짜 조회
      query = query.eq('date', date)
    } else {
      // 기본값: 오늘 날짜
      query = query.eq('date', new Date().toISOString().split('T')[0])
    }

    // 날짜순 정렬
    query = query.order('date', { ascending: true })

    const { data: stats, error } = await query

    if (error) {
      console.error('[DailyStudyStats GET] Error:', error)
      return Response.json({ error: '통계 조회 실패' }, { status: 500 })
    }

    return Response.json({ stats: stats || [] })
  } catch (error: any) {
    console.error('[DailyStudyStats GET] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

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

    interface DailyStudyStatsBody {
      studentId: string
      subjectId: string
      subjectName: string
      subjectColor?: string
      date: string
      totalSeconds: number
      sessionCount: number
      morningSeconds?: number
      afternoonSeconds?: number
      nightSeconds?: number
    }
    const body = await request.json() as DailyStudyStatsBody
    const { studentId, subjectId, subjectName, subjectColor, date, totalSeconds, sessionCount, morningSeconds, afternoonSeconds, nightSeconds } = body

    // Upsert - update if exists, insert if not
    const { data: existing } = await supabase
      .from('daily_study_stats')
      .select('id')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .eq('date', date)
      .single()

    if (existing) {
      const { data: stat, error } = await supabase
        .from('daily_study_stats')
        .update({
          total_seconds: totalSeconds,
          session_count: sessionCount,
          morning_seconds: morningSeconds || 0,
          afternoon_seconds: afternoonSeconds || 0,
          night_seconds: nightSeconds || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .eq('org_id', userProfile.org_id)
        .select()
        .single()

      if (error) {
        console.error('[DailyStudyStats POST] Update Error:', error)
        return Response.json({ error: '통계 업데이트 실패' }, { status: 500 })
      }
      return Response.json({ stat })
    } else {
      const { data: stat, error } = await supabase
        .from('daily_study_stats')
        .insert({
          org_id: userProfile.org_id,
          student_id: studentId,
          subject_id: subjectId,
          subject_name: subjectName,
          subject_color: subjectColor || '#4A90E2',
          date,
          total_seconds: totalSeconds,
          session_count: sessionCount,
          morning_seconds: morningSeconds || 0,
          afternoon_seconds: afternoonSeconds || 0,
          night_seconds: nightSeconds || 0,
        })
        .select()
        .single()

      if (error) {
        console.error('[DailyStudyStats POST] Insert Error:', error)
        return Response.json({ error: '통계 생성 실패' }, { status: 500 })
      }
      return Response.json({ stat })
    }
  } catch (error: any) {
    console.error('[DailyStudyStats POST] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
