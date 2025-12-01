import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/class-enrollments - class_enrollments 목록 조회 (class_id로 필터 가능)
export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('class_id')

    let query = db
      .from('class_enrollments')
      .select('*, students:student_id(id, name, grade, school, credit, seatsremainingtime)')
      .eq('org_id', orgId)
      .or('status.eq.active,status.is.null')
      .limit(1000)

    if (classId) {
      query = query.eq('class_id', classId)
    }

    const { data: enrollments, error } = await query

    if (error) {
      console.error('[ClassEnrollments GET] Error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ enrollments })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[ClassEnrollments GET] Unexpected error:', error)
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
