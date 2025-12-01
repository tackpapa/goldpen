import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { updateClassSchema } from '@/lib/validations/class'
import { ZodError } from 'zod'
import { syncSchedulesHelper } from './sync-schedule'
import { logActivity, actionDescriptions } from '@/app/api/_utils/activity-log'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { data: classData, error } = await db
      .from('classes')
      .select('*, teacher:teacher_id(id, name, email)')
      .eq('id', params.id)
      .eq('org_id', orgId)
      .single()

    if (error || !classData) return Response.json({ error: '반을 찾을 수 없습니다' }, { status: 404 })

    const normalized = {
      ...classData,
      schedule: Array.isArray(classData.schedule) ? classData.schedule : [],
    }

    return Response.json({ class: normalized })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { db, orgId, user } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = updateClassSchema.parse(body)

    let teacher_name: string | null | undefined = undefined
    if (validated.teacher_id) {
      const { data: teacherRow } = await db
        .from('teachers')
        .select('name')
        .eq('id', validated.teacher_id)
        .single()
      teacher_name = teacherRow?.name || null
    }

    if (Object.keys(validated).length === 0) {
      return Response.json({ error: '수정할 데이터가 없습니다' }, { status: 400 })
    }

    const payload = {
      ...validated,
      ...(teacher_name !== undefined ? { teacher_name } : {}),
    }

    const { data: classData, error } = await db
      .from('classes')
      .update(payload)
      .eq('id', params.id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) return Response.json({ error: '반 정보 수정 실패' }, { status: 500 })

    if (validated.schedule) {
      await syncSchedulesHelper({
        supabase: db,
        orgId,
        classId: params.id,
        schedule: validated.schedule,
        roomName: validated.room,
      })
    }
    const normalized = {
      ...classData,
      schedule: Array.isArray(classData.schedule) ? classData.schedule : [],
    }

    // 활동 로그 기록
    await logActivity({
      orgId,
      userId: user?.id || null,
      userName: user?.email?.split('@')[0] || '시스템',
      userRole: null,
      actionType: 'update',
      entityType: 'class',
      entityId: classData.id,
      entityName: classData.name,
      description: actionDescriptions.class.update(classData.name || '이름 없음'),
      request,
    })

    return Response.json({ class: normalized, message: '반 정보가 수정되었습니다' })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { db, orgId, user, role } = await getSupabaseWithOrg(request)

    if (!['owner', 'manager'].includes(role || '')) {
      return Response.json({ error: '반 삭제 권한이 없습니다' }, { status: 403 })
    }

    // 삭제 전 반 정보 조회 (로그용)
    const { data: classToDelete } = await db
      .from('classes')
      .select('id, name')
      .eq('id', params.id)
      .eq('org_id', orgId)
      .single()

    const { error } = await db.from('classes').delete().eq('id', params.id).eq('org_id', orgId)
    if (error) return Response.json({ error: '반 삭제 실패' }, { status: 500 })

    // 활동 로그 기록
    if (classToDelete) {
      await logActivity({
        orgId,
        userId: user?.id || null,
        userName: user?.email?.split('@')[0] || '시스템',
        userRole: role,
        actionType: 'delete',
        entityType: 'class',
        entityId: params.id,
        entityName: classToDelete.name,
        description: actionDescriptions.class.delete(classToDelete.name || '이름 없음'),
        request,
      })
    }

    return Response.json({ message: '반이 삭제되었습니다' })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
