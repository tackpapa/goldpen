import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { updateClassSchema } from '@/lib/validations/class'
import { ZodError } from 'zod'
import { syncSchedulesHelper } from './sync-schedule'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return Response.json({ error: '인증이 필요합니다' }, { status: 401 })

    const { data: userProfile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
    if (!userProfile) return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })

    const { data: classData, error } = await supabase
      .from('classes')
      .select('*, teacher:teacher_id(id, name, email)')
      .eq('id', params.id)
      .eq('org_id', userProfile.org_id)
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
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return Response.json({ error: '인증이 필요합니다' }, { status: 401 })

    const { data: userProfile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
    if (!userProfile) return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })

    const body = await request.json()
    const validated = updateClassSchema.parse(body)

    let teacher_name: string | null | undefined = undefined
    if (validated.teacher_id) {
      const { data: teacherRow } = await supabase
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

    const { data: classData, error } = await supabase
      .from('classes')
      .update(payload)
      .eq('id', params.id)
      .eq('org_id', userProfile.org_id)
      .select()
      .single()

    if (error) return Response.json({ error: '반 정보 수정 실패' }, { status: 500 })

    if (validated.schedule) {
      await syncSchedulesHelper({
        supabase,
        orgId: userProfile.org_id,
        classId: params.id,
        schedule: validated.schedule,
        roomName: validated.room,
      })
    }
    const normalized = {
      ...classData,
      schedule: Array.isArray(classData.schedule) ? classData.schedule : [],
    }
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
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return Response.json({ error: '인증이 필요합니다' }, { status: 401 })

    const { data: userProfile } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
    if (!userProfile) return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
    if (!['owner', 'manager'].includes(userProfile.role)) {
      return Response.json({ error: '반 삭제 권한이 없습니다' }, { status: 403 })
    }

    const { error } = await supabase.from('classes').delete().eq('id', params.id).eq('org_id', userProfile.org_id)
    if (error) return Response.json({ error: '반 삭제 실패' }, { status: 500 })
    return Response.json({ message: '반이 삭제되었습니다' })
  } catch (error: any) {
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
