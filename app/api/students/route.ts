import { createAuthenticatedClient } from '@/lib/supabase/client-edge'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/students - 학생 목록 조회 (org 필터)
export async function GET(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()
    if (profileError || !profile) return Response.json({ error: '프로필 없음' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const attendanceCode = searchParams.get('attendance_code') || searchParams.get('student_code') || undefined

    let query = supabase
      .from('students')
      .select('*', { count: 'exact' })
      .eq('org_id', profile.org_id)
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()
    if (profileError || !profile) return Response.json({ error: '프로필 없음' }, { status: 404 })

    const body = await request.json()
    const { campuses, branch_name, branch, attendance_code, student_code, ...rest } = body || {}

    const insertPayload = {
      ...rest,
      student_code: attendance_code || student_code || null,
      branch_name: branch_name || branch || null,
      campuses: Array.isArray(campuses) ? campuses : null,
      org_id: profile.org_id,
    }

    const { data: student, error } = await supabase
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
