import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const updateHomeworkSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  due_date: z.string().optional(),
  attachments: z.array(z.any()).optional(),
  status: z.enum(['active', 'completed', 'overdue']).optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createAuthenticatedClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    const body = await request.json()
    const validated = updateHomeworkSchema.parse(body)

    const { data: homework, error: updateError } = await supabase
      .from('homework')
      .update(validated)
      .eq('id', params.id)
      .eq('org_id', userProfile.org_id)
      .select()
      .single()

    if (updateError) {
      console.error('[Homework PUT] Error:', updateError)
      return Response.json({ error: '숙제 수정 실패', details: updateError.message }, { status: 500 })
    }

    if (!homework) {
      return Response.json({ error: '숙제를 찾을 수 없습니다' }, { status: 404 })
    }

    return Response.json({ homework, message: '숙제가 수정되었습니다' })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Homework PUT] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createAuthenticatedClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    if (!['owner', 'manager', 'teacher'].includes(userProfile.role)) {
      return Response.json({ error: '숙제를 삭제할 권한이 없습니다' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('homework')
      .delete()
      .eq('id', params.id)
      .eq('org_id', userProfile.org_id)

    if (deleteError) {
      console.error('[Homework DELETE] Error:', deleteError)
      return Response.json({ error: '숙제 삭제 실패', details: deleteError.message }, { status: 500 })
    }

    return Response.json({ message: '숙제가 삭제되었습니다' })
  } catch (error: any) {
    console.error('[Homework DELETE] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
