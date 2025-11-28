import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'
import { updateClassSchema } from '@/lib/validations/class'
import { ZodError } from 'zod'
import { syncSchedulesHelper } from './sync-schedule'
import { logActivity, actionDescriptions } from '@/app/api/_utils/activity-log'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const service = getServiceClient()
    const demoOrg = process.env.NEXT_PUBLIC_DEMO_ORG_ID || process.env.DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    let orgId: string | null = null
    if (service && (authError || !user || user.id === 'service-role' || user.id === 'e2e-user')) {
      orgId = demoOrg
    } else if (!authError && user) {
      const { data: userProfile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
      if (!userProfile) return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
      orgId = userProfile.org_id
    } else {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const db = service || supabase

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
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const service = getServiceClient()
    const demoOrg = process.env.NEXT_PUBLIC_DEMO_ORG_ID || process.env.DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    let orgId: string | null = null
    if (service && (authError || !user || user.id === 'service-role' || user.id === 'e2e-user')) {
      orgId = demoOrg
    } else if (!authError && user) {
      const { data: userProfile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
      if (!userProfile) return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
      orgId = userProfile.org_id
    } else {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    const db = service || supabase

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
        orgId: orgId || '',
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
      orgId: orgId!,
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
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const service = getServiceClient()
    const demoOrg = process.env.NEXT_PUBLIC_DEMO_ORG_ID || process.env.DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    let orgId: string | null = null
    let role: string | null = null
    if (service && (authError || !user || user.id === 'service-role' || user.id === 'e2e-user')) {
      orgId = demoOrg
      role = 'owner'
    } else if (!authError && user) {
      const { data: userProfile } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
      if (!userProfile) return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
      orgId = userProfile.org_id
      role = userProfile.role
    } else {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    const db = service || supabase

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
        orgId: orgId!,
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
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
