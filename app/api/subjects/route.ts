import { createAuthenticatedClient } from '@/lib/supabase/client-edge'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return Response.json({ error: 'studentId가 필요합니다' }, { status: 400 })
    }

    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .order('order', { ascending: true })

    if (error) {
      console.error('[Subjects GET] Error:', error)
      return Response.json({ error: '과목 조회 실패' }, { status: 500 })
    }

    return Response.json({ subjects: subjects || [] })
  } catch (error: any) {
    console.error('[Subjects GET] Error:', error)
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

    const body = await request.json()
    const { studentId, name, color, order } = body

    if (!studentId || !name) {
      return Response.json({ error: 'studentId와 name이 필요합니다' }, { status: 400 })
    }

    const { data: subject, error } = await supabase
      .from('subjects')
      .insert({
        org_id: userProfile.org_id,
        student_id: studentId,
        name,
        color: color || '#4A90E2',
        order: order || 0,
      })
      .select()
      .single()

    if (error) {
      console.error('[Subjects POST] Error:', error)
      return Response.json({ error: '과목 생성 실패' }, { status: 500 })
    }

    return Response.json({ subject })
  } catch (error: any) {
    console.error('[Subjects POST] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('id')

    if (!subjectId) {
      return Response.json({ error: 'id가 필요합니다' }, { status: 400 })
    }

    const { error } = await supabase
      .from('subjects')
      .update({ is_active: false })
      .eq('id', subjectId)

    if (error) {
      console.error('[Subjects DELETE] Error:', error)
      return Response.json({ error: '과목 삭제 실패' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('[Subjects DELETE] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
