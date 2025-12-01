import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Fetch daily planner for a student
export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const history = searchParams.get('history') // 'true' to get historical data

    if (!studentId) {
      return Response.json({ error: 'studentId가 필요합니다' }, { status: 400 })
    }

    if (history === 'true') {
      // Get last 30 days of planners for history view (teacher/admin)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: planners, error } = await db
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
      const { data: planner, error } = await db
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
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[DailyPlanners GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

// POST - Create or update daily planner
export async function POST(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

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
    const { data: existing } = await db
      .from('daily_planners')
      .select('id')
      .eq('student_id', studentId)
      .eq('org_id', orgId)
      .eq('date', planDate)
      .single()

    if (existing) {
      // Update existing planner
      const { data: planner, error } = await db
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
      const { data: planner, error } = await db
        .from('daily_planners')
        .insert({
          org_id: orgId,
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
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[DailyPlanners POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

// PATCH - Toggle task completion
export async function PATCH(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

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
    const { data: planner, error: fetchError } = await db
      .from('daily_planners')
      .select('study_plans')
      .eq('id', plannerId)
      .eq('org_id', orgId)
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

    const { data: updated, error } = await db
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
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[DailyPlanners PATCH] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
