import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET - Fetch daily planner for a student
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

    const studentId = searchParams.get('studentId')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const history = searchParams.get('history') // 'true' to get historical data

    if (!studentId) {
      return Response.json({ error: 'studentId가 필요합니다' }, { status: 400 })
    }

    if (!orgId) {
      return Response.json({ error: 'orgId가 필요합니다' }, { status: 400 })
    }

    if (history === 'true') {
      // Get last 30 days of planners for history view (teacher/admin)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: planners, error } = await supabase
        .from('daily_planners')
        .select('*')
        .eq('student_id', studentId)
        .eq('org_id', orgId)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (error) {
        console.error('[DailyPlanners GET history] Error:', error)
        return Response.json({ error: '플래너 이력 조회 실패' }, { status: 500 })
      }

      return Response.json({ planners: planners || [] })
    } else {
      // Get today's planner
      const { data: planner, error } = await supabase
        .from('daily_planners')
        .select('*')
        .eq('student_id', studentId)
        .eq('org_id', orgId)
        .eq('date', date)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('[DailyPlanners GET] Error:', error)
        return Response.json({ error: '플래너 조회 실패' }, { status: 500 })
      }

      return Response.json({ planner: planner || null })
    }
  } catch (error: any) {
    console.error('[DailyPlanners GET] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// POST - Create or update daily planner
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

    interface DailyPlannerBody {
      studentId: string
      seatNumber?: number
      studyPlans?: unknown[]
      notes?: string
      date?: string
    }
    const body = await request.json() as DailyPlannerBody
    const { studentId, seatNumber, studyPlans, notes, date } = body

    if (!studentId) {
      return Response.json({ error: 'studentId가 필요합니다' }, { status: 400 })
    }

    const planDate = date || new Date().toISOString().split('T')[0]

    // Check if planner exists for this date
    const { data: existing } = await supabase
      .from('daily_planners')
      .select('id')
          .eq('student_id', studentId)
          .eq('org_id', userProfile.org_id)
          .eq('date', planDate)
          .single()

    if (existing) {
      // Update existing planner
      const { data: planner, error } = await supabase
        .from('daily_planners')
        .update({
          study_plans: studyPlans || [],
          notes: notes || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('[DailyPlanners POST update] Error:', error)
        return Response.json({ error: '플래너 업데이트 실패' }, { status: 500 })
      }

      return Response.json({ planner })
    } else {
      // Create new planner
      const { data: planner, error } = await supabase
        .from('daily_planners')
        .insert({
          org_id: userProfile.org_id,
          student_id: studentId,
          seat_number: seatNumber || 0,
          date: planDate,
          study_plans: studyPlans || [],
          notes: notes || '',
        })
        .select()
        .single()

      if (error) {
        console.error('[DailyPlanners POST insert] Error:', error)
        return Response.json({ error: '플래너 생성 실패' }, { status: 500 })
      }

      return Response.json({ planner })
    }
  } catch (error: any) {
    console.error('[DailyPlanners POST] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// PATCH - Toggle task completion
export async function PATCH(request: Request) {
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

    interface PlannerPatchBody {
      plannerId: string
      taskId: string
      completed: boolean
      completedAt?: string | null
      elapsedSeconds?: number
    }
    const body = await request.json() as PlannerPatchBody
    const { plannerId, taskId, completed, completedAt, elapsedSeconds } = body

    if (!plannerId || !taskId) {
      return Response.json({ error: 'plannerId와 taskId가 필요합니다' }, { status: 400 })
    }

    // Get current planner
    const { data: planner, error: fetchError } = await supabase
      .from('daily_planners')
      .select('study_plans')
      .eq('id', plannerId)
      .eq('org_id', userProfile.org_id)
      .single()

    if (fetchError || !planner) {
      return Response.json({ error: '플래너를 찾을 수 없습니다' }, { status: 404 })
    }

    // Update the specific task
    const updatedPlans = (planner.study_plans as any[]).map((plan: any) => {
      if (plan.id === taskId) {
        return {
          ...plan,
          completed,
          completed_at: completedAt || (completed ? new Date().toISOString() : null),
          elapsed_seconds: elapsedSeconds ?? plan.elapsed_seconds,
        }
      }
      return plan
    })

    const { data: updated, error } = await supabase
      .from('daily_planners')
      .update({
        study_plans: updatedPlans,
        updated_at: new Date().toISOString(),
      })
      .eq('id', plannerId)
      .select()
      .single()

    if (error) {
      console.error('[DailyPlanners PATCH] Error:', error)
      return Response.json({ error: '완료 상태 변경 실패' }, { status: 500 })
    }

    return Response.json({ planner: updated })
  } catch (error: any) {
    console.error('[DailyPlanners PATCH] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
