import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const demoOrgId = process.env.DEMO_ORG_ID || process.env.NEXT_PUBLIC_DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '500', 10), 2000)
    const serviceParam = searchParams.get('service')
    // orgSlug 파라미터 지원 (프로덕션 대시보드용)
    const orgSlug = searchParams.get('orgSlug')
    // service=1 또는 orgSlug가 있으면 서비스 모드 사용 (프로덕션에서도 허용)
    const allowService = serviceParam === '1' || !!orgSlug

    let supabase: any = await createAuthenticatedClient(request)
    let { data: { user }, error: authError } = await supabase.auth.getUser()

    let orgId: string | null = null
    if ((!user || authError) && allowService) {
      if (!supabaseUrl || !supabaseServiceKey) {
        return Response.json({ logs: [], note: 'service role missing' })
      }
      supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any

      // orgSlug로 org_id 조회 (프로덕션 지원)
      if (orgSlug) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', orgSlug)
          .single()

        if (orgError || !org) {
          console.error('[AttendanceLogs GET] Organization not found for slug:', orgSlug)
          return Response.json({ logs: [], error: '기관을 찾을 수 없습니다' })
        }
        orgId = org.id
      } else {
        orgId = searchParams.get('org_id') || demoOrgId
      }
    } else {
      if (authError || !user) {
        // 인증 실패 시 빈 배열 반환 (새로 가입한 사용자도 페이지 로드 가능)
        return Response.json({ logs: [], note: '인증이 필요합니다. 로그인 후 출결 데이터를 확인할 수 있습니다.' })
      }
      const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).maybeSingle()
      orgId = profile?.org_id || null
    }

    // org_id가 없으면 빈 배열 반환
    if (!orgId) return Response.json({ logs: [], note: '기관 정보가 없습니다.' })

    // 날짜 필터 적용 (check_in_time이 해당 날짜에 포함되는 로그만 조회)
    // 한국 시간 기준으로 변환 (UTC+9)
    const startOfDay = `${date}T00:00:00+09:00`
    const endOfDay = `${date}T23:59:59.999+09:00`

    const { data, error } = await supabase
      .from('attendance_logs')
      .select('id, student_id, org_id, check_in_time, check_out_time, duration_minutes')
      .eq('org_id', orgId)
      .gte('check_in_time', startOfDay)
      .lte('check_in_time', endOfDay)
      .order('check_in_time', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[AttendanceLogs GET] error', error)
      return Response.json({ logs: [], error: '로그 조회 실패', details: error.message })
    }

    return Response.json({ logs: data || [] })
  } catch (error: any) {
    console.error('[AttendanceLogs GET] Unexpected error', error)
    return Response.json({ logs: [], error: '서버 오류', details: error?.message })
  }
}

// POST: 학생 코드로 등/하원 처리 (liveattendance 페이지용)
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgSlug = searchParams.get('orgSlug')

    if (!orgSlug) {
      return Response.json({ error: 'orgSlug가 필요합니다' }, { status: 400 })
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'service role missing' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // orgSlug로 org_id 조회
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', orgSlug)
      .single()

    if (orgError || !org) {
      console.error('[AttendanceLogs POST] Organization not found for slug:', orgSlug)
      return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
    }

    const orgId = org.id
    const body = await request.json()
    const { code, action } = body as { code: string; action: 'check_in' | 'check_out' }

    if (!code || !action) {
      return Response.json({ error: 'code와 action이 필요합니다' }, { status: 400 })
    }

    // 학생 코드로 학생 조회
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, name, student_code')
      .eq('org_id', orgId)
      .eq('student_code', code)
      .single()

    if (studentError || !student) {
      console.error('[AttendanceLogs POST] Student not found for code:', code)
      return Response.json({ error: '학생을 찾을 수 없습니다' }, { status: 404 })
    }

    const now = new Date()

    if (action === 'check_in') {
      // 이미 열린 세션이 있는지 확인
      const { data: openSession } = await supabase
        .from('attendance_logs')
        .select('id')
        .eq('org_id', orgId)
        .eq('student_id', student.id)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .single()

      if (openSession) {
        // 이미 체크인 상태면 무시
        return Response.json({
          message: '이미 등원 상태입니다',
          student: { name: student.name }
        })
      }

      // 새 체크인 기록 생성
      const { error: insertError } = await supabase
        .from('attendance_logs')
        .insert({
          org_id: orgId,
          student_id: student.id,
          check_in_time: now.toISOString(),
          source: 'liveattendance',
        })

      if (insertError) {
        console.error('[AttendanceLogs POST] Insert error:', insertError)
        return Response.json({ error: '등원 처리 실패', details: insertError.message }, { status: 500 })
      }

      return Response.json({
        message: '등원 처리 완료',
        student: { name: student.name }
      })

    } else {
      // check_out
      // 열린 세션 찾기
      const { data: openSession, error: openError } = await supabase
        .from('attendance_logs')
        .select('id, check_in_time')
        .eq('org_id', orgId)
        .eq('student_id', student.id)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .single()

      if (openError || !openSession) {
        // 열린 세션이 없으면 그냥 성공 반환 (이미 하원 상태)
        return Response.json({
          message: '이미 하원 상태입니다',
          student: { name: student.name }
        })
      }

      // 체류 시간 계산
      const durationMinutes = Math.max(
        1,
        Math.ceil((now.getTime() - new Date(openSession.check_in_time).getTime()) / (1000 * 60))
      )

      // 체크아웃 처리
      const { error: updateError } = await supabase
        .from('attendance_logs')
        .update({
          check_out_time: now.toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq('id', openSession.id)

      if (updateError) {
        console.error('[AttendanceLogs POST] Update error:', updateError)
        return Response.json({ error: '하원 처리 실패', details: updateError.message }, { status: 500 })
      }

      return Response.json({
        message: '하원 처리 완료',
        student: { name: student.name },
        durationMinutes
      })
    }
  } catch (error: any) {
    console.error('[AttendanceLogs POST] Unexpected error', error)
    return Response.json({ error: '서버 오류', details: error?.message }, { status: 500 })
  }
}
