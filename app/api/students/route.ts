import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'

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

    const { searchParams } = new URL(request.url)
    const attendanceCode = searchParams.get('attendance_code') || searchParams.get('student_code') || undefined

    const db = service || supabase

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

    return Response.json({ students, count })
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
    const { campuses, branch_name, branch, attendance_code, student_code, ...rest } = body || {}

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

    return Response.json({ student }, { status: 201 })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
