import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

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
    const service = getServiceClient()
    const demoOrg = process.env.NEXT_PUBLIC_DEMO_ORG_ID || process.env.DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    let orgId: string | null = null

    if (service && (authError || !user || user.id === 'service-role' || user.id === 'e2e-user')) {
      orgId = demoOrg
    } else if (!authError && user) {
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()
      if (profileError || !userProfile) {
        return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
      }
      orgId = userProfile.org_id
    } else {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const db = service || supabase
    const body = await request.json()
    const validated = updateHomeworkSchema.parse(body)

    const { data: homework, error: updateError } = await db
      .from('homework')
      .update(validated)
      .eq('id', params.id)
      .eq('org_id', orgId)
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
    const service = getServiceClient()
    const demoOrg = process.env.NEXT_PUBLIC_DEMO_ORG_ID || process.env.DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    let orgId: string | null = null

    if (service && (authError || !user || user.id === 'service-role' || user.id === 'e2e-user')) {
      // 데모 모드 또는 서비스 클라이언트 사용 시 권한 체크 건너뛰기
      orgId = demoOrg
    } else if (!authError && user) {
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

      orgId = userProfile.org_id
    } else {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const db = service || supabase
    const { error: deleteError } = await db
      .from('homework')
      .delete()
      .eq('id', params.id)
      .eq('org_id', orgId)

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
