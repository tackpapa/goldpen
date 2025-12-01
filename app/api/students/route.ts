import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'
import { logActivity, actionDescriptions } from '@/app/api/_utils/activity-log'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/students - 학생 목록 조회 (org 필터)
export async function GET(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const service = getServiceClient()

    const { searchParams } = new URL(request.url)
    const orgSlug = searchParams.get('orgSlug')
    const attendanceCode = searchParams.get('attendance_code') || searchParams.get('student_code') || undefined

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    const demoOrg = process.env.NEXT_PUBLIC_DEMO_ORG_ID || process.env.DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'

    let orgId: string | null = null
    let db = service || supabase

    // orgSlug가 제공된 경우 (프로덕션 livescreen/liveattendance 등) - organizations 테이블에서 org_id 조회
    if (orgSlug && service) {
      const { data: org, error: orgError } = await service
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .single()

      if (orgError || !org) {
        console.error('[Students GET] Organization not found for slug:', orgSlug)
        return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
      }
      orgId = org.id
      db = service
    } else if (!authError && user && user.id !== 'service-role' && user.id !== 'e2e-user') {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()
      if (profileError || !profile) return Response.json({ error: '프로필 없음' }, { status: 404 })
      orgId = profile.org_id
    } else if (service) {
      orgId = demoOrg
      db = service
    } else {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = db
      .from('students')
      .select('*', { count: 'exact' })
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (attendanceCode) {
      query = query.eq('student_code', attendanceCode)
    }

    const { data: students, error, count } = await query

    if (error) {
      console.error('Error fetching students:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ students, count }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

// POST /api/students - 학생 생성 (org 필터)
export async function POST(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const service = getServiceClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const demoOrg = process.env.NEXT_PUBLIC_DEMO_ORG_ID || process.env.DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'

    let orgId: string | null = null

    if (!authError && user && user.id !== 'service-role' && user.id !== 'e2e-user') {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()
      if (profileError || !profile) return Response.json({ error: '프로필 없음' }, { status: 404 })
      orgId = profile.org_id
    } else if (service) {
      orgId = demoOrg
    } else {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campuses, branch_name, branch, attendance_code, student_code, ...rest } = (body || {}) as any

    const insertPayload = {
      ...rest,
      student_code: attendance_code || student_code || null,
      branch_name: branch_name || branch || null,
      campuses: Array.isArray(campuses) ? campuses : null,
      org_id: orgId,
    }

    const db = service || supabase

    const { data: student, error } = await db
      .from('students')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      console.error('Error creating student:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // 활동 로그 기록 (await 필요 - Edge Runtime에서 fire-and-forget이 작동하지 않음)
    await logActivity({
      orgId: orgId!,
      userId: user?.id || null,
      userName: user?.email?.split('@')[0] || '시스템',
      userRole: null,
      actionType: 'create',
      entityType: 'student',
      entityId: student.id,
      entityName: student.name,
      description: actionDescriptions.student.create(student.name || '이름 없음'),
      request,
    })

    return Response.json({ student }, { status: 201 })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
