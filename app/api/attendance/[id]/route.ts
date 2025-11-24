import { updateAttendanceSchema } from '@/lib/validations/attendance'
import { ZodError } from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { data: attendanceData, error } = await db
      .from('attendance')
      .select('*, student:student_id(id, name), class:class_id(id, name)')
      .eq('id', params.id)
      .eq('org_id', orgId)
      .single()

    if (error || !attendanceData) return Response.json({ error: '출결 기록을 찾을 수 없습니다' }, { status: 404 })
    return Response.json({ attendance: attendanceData })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    return Response.json({ error: '서버 오류가 발생했습니다', details: error?.message }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = updateAttendanceSchema.parse(body)

    if (Object.keys(validated).length === 0) {
      return Response.json({ error: '수정할 데이터가 없습니다' }, { status: 400 })
    }

    const { data: attendanceData, error } = await db
      .from('attendance')
      .update(validated)
      .eq('id', params.id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) return Response.json({ error: '출결 정보 수정 실패' }, { status: 500 })
    return Response.json({ attendance: attendanceData, message: '출결 정보가 수정되었습니다' })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    return Response.json({ error: '서버 오류가 발생했습니다', details: error?.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { db, orgId, role } = await getSupabaseWithOrg(request)
    if (!['owner', 'manager', 'service_role'].includes(role || '')) {
      return Response.json({ error: '출결 삭제 권한이 없습니다' }, { status: 403 })
    }

    const { error } = await db.from('attendance').delete().eq('id', params.id).eq('org_id', orgId)
    if (error) return Response.json({ error: '출결 삭제 실패' }, { status: 500 })
    return Response.json({ message: '출결 기록이 삭제되었습니다' })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    return Response.json({ error: '서버 오류가 발생했습니다', details: error?.message }, { status: 500 })
  }
}
