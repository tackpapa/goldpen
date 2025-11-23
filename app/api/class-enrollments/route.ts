import { createAuthenticatedClient } from '@/lib/supabase/client-edge'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/class-enrollments - class_enrollments 목록 조회 (class_id로 필터 가능)
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
    const classId = searchParams.get('class_id')

    let query = supabase
      .from('class_enrollments')
      .select('*, students:student_id(id, name, grade, school, credit, seatsremainingtime)')
      .eq('status', 'active')

    if (classId) {
      query = query.eq('class_id', classId)
    }

    const { data: enrollments, error } = await query

    if (error) {
      console.error('Error fetching class enrollments:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ enrollments })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
