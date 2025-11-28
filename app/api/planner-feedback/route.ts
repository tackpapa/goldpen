import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET - 학생의 피드백 조회
export async function GET(request: Request) {
  try {
    const isDev = process.env.NODE_ENV !== 'production'
    const demoOrgId = process.env.DEMO_ORG_ID || process.env.NEXT_PUBLIC_DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'
    const { searchParams } = new URL(request.url)
    const serviceParam = searchParams.get('service')
    const orgParam = searchParams.get('orgId')
    const studentIdParam = searchParams.get('studentId')

    // 개발 환경에서 service=1이면 강제로 서비스 모드 사용
    const forceService = isDev && serviceParam === '1'

    console.log('[PlannerFeedback GET] Params:', { serviceParam, orgParam, studentIdParam, isDev, forceService })

    let supabase: any
    let orgId: string | null = null

    if (forceService && supabaseServiceKey) {
      // service=1이면 무조건 서비스 모드 사용
      console.log('[PlannerFeedback GET] Using SERVICE MODE')
      supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any
      orgId = orgParam || demoOrgId
    } else {
      supabase = await createAuthenticatedClient(request)
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      console.log('[PlannerFeedback GET] Auth check:', { hasUser: !!user, authError: authError?.message })

      if (authError || !user) {
        if (isDev && supabaseServiceKey) {
          console.log('[PlannerFeedback GET] Fallback to SERVICE MODE (no auth)')
          supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any
          orgId = orgParam || demoOrgId
        } else {
          return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
        }
      } else {
        const { data: userProfile } = await supabase
          .from('users')
          .select('org_id')
          .eq('id', user.id)
          .single()

        if (!userProfile) {
          if (supabaseServiceKey) {
            console.log('[PlannerFeedback GET] Fallback to SERVICE MODE (no profile)')
            supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any
            orgId = orgParam || demoOrgId
          } else {
            return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
          }
        } else {
          orgId = userProfile.org_id
          console.log('[PlannerFeedback GET] Using user profile orgId:', orgId)
        }
      }
    }

    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return Response.json({ error: 'studentId가 필요합니다' }, { status: 400 })
    }

    if (!orgId) {
      return Response.json({ error: 'orgId가 필요합니다' }, { status: 400 })
    }

    console.log('[PlannerFeedback GET] Querying with:', { orgId, studentId })

    const { data: feedback, error } = await supabase
      .from('planner_feedback')
      .select('*')
      .eq('student_id', studentId)
      .eq('org_id', orgId)
      .single()

    console.log('[PlannerFeedback GET] Query result:', { feedback, error: error?.message, errorCode: error?.code })

    if (error && error.code !== 'PGRST116') {
      console.error('[PlannerFeedback GET] Error:', error)
      return Response.json({ error: '피드백 조회 실패' }, { status: 500 })
    }

    return Response.json({ feedback: feedback || null })
  } catch (error: any) {
    console.error('[PlannerFeedback GET] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// POST - 피드백 생성/업데이트 (upsert)
export async function POST(request: Request) {
  try {
    const isDev = process.env.NODE_ENV !== 'production'
    const demoOrgId = process.env.DEMO_ORG_ID || process.env.NEXT_PUBLIC_DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'
    const { searchParams } = new URL(request.url)
    const forceService = searchParams.get('service') === '1'
    const orgParam = searchParams.get('orgId')

    let supabase: any
    let orgId: string | null = null
    let teacherId: string | null = null
    let teacherName: string | null = null

    // service=1 이면 강제로 서비스 모드 사용 (개발 환경에서)
    if (isDev && forceService && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any
      orgId = orgParam || demoOrgId
      teacherName = '선생님'
    } else {
      supabase = await createAuthenticatedClient(request)
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
      }
      const { data: userProfile } = await supabase
        .from('users')
        .select('org_id, name')
        .eq('id', user.id)
        .single()

      if (!userProfile) {
        if (supabaseServiceKey) {
          supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any
          orgId = orgParam || demoOrgId
          teacherName = '선생님'
        } else {
          return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
        }
      } else {
        orgId = userProfile.org_id
        teacherId = user.id
        teacherName = userProfile.name || '선생님'
      }
    }

    const body = await request.json() as { studentId: string; feedback: string }
    const { studentId, feedback } = body

    if (!studentId) {
      return Response.json({ error: 'studentId가 필요합니다' }, { status: 400 })
    }

    if (!feedback || !feedback.trim()) {
      return Response.json({ error: '피드백 내용이 필요합니다' }, { status: 400 })
    }

    if (!orgId) {
      return Response.json({ error: 'orgId가 필요합니다' }, { status: 400 })
    }

    // Upsert - 기존 피드백이 있으면 업데이트, 없으면 생성
    const { data: result, error } = await supabase
      .from('planner_feedback')
      .upsert({
        org_id: orgId,
        student_id: studentId,
        feedback: feedback.trim(),
        teacher_id: teacherId,
        teacher_name: teacherName,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'org_id,student_id'
      })
      .select()
      .single()

    if (error) {
      console.error('[PlannerFeedback POST] Error:', error)
      return Response.json({ error: '피드백 저장 실패' }, { status: 500 })
    }

    return Response.json({ feedback: result })
  } catch (error: any) {
    console.error('[PlannerFeedback POST] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// DELETE - 피드백 삭제
export async function DELETE(request: Request) {
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
        return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
      }
      orgId = userProfile.org_id
    }

    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return Response.json({ error: 'studentId가 필요합니다' }, { status: 400 })
    }

    if (!orgId) {
      return Response.json({ error: 'orgId가 필요합니다' }, { status: 400 })
    }

    const { error } = await supabase
      .from('planner_feedback')
      .delete()
      .eq('student_id', studentId)
      .eq('org_id', orgId)

    if (error) {
      console.error('[PlannerFeedback DELETE] Error:', error)
      return Response.json({ error: '피드백 삭제 실패' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('[PlannerFeedback DELETE] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
