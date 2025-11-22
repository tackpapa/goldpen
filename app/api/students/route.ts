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

    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching students:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ students })
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
    const { campuses, branch, ...rest } = body || {}

    // campuses/branch은 현재 스키마에 컬럼이 없을 수 있어 notes에 병합 저장
    let notes = rest.notes || ''
    const extra: string[] = []
    if (branch) extra.push(`지점:${branch}`)
    if (Array.isArray(campuses) && campuses.length > 0) extra.push(`캠퍼스:${campuses.join(',')}`)
    if (extra.length) notes = notes ? `${notes}\n${extra.join('\n')}` : extra.join('\n')

    const insertPayload = { ...rest, org_id: profile.org_id, notes }

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
