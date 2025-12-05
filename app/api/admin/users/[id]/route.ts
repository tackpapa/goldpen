import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('[Supabase Admin] Missing env')
  return createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function checkSuperAdmin(request: Request) {
  const supabase = await createAuthenticatedClient(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { authorized: false, error: 'Unauthorized', status: 401 }

  const adminClient = createAdminClient()
  const { data: userData, error: userError } = await adminClient.from('users').select('role').eq('id', user.id).single()
  if (userError || !userData || userData.role !== 'super_admin') return { authorized: false, error: 'Forbidden', status: 403 }

  return { authorized: true, user }
}

/**
 * DELETE /api/admin/users/[id]
 * 슈퍼 어드민 - 사용자 삭제
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminClient = createAdminClient()
    const authCheck = await checkSuperAdmin(request)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    // 삭제 대상 사용자 확인
    const { data: targetUser, error: targetError } = await adminClient
      .from('users')
      .select('id, email, role, org_id')
      .eq('id', id)
      .single()

    if (targetError || !targetUser) {
      return Response.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })
    }

    // super_admin은 삭제 불가
    if (targetUser.role === 'super_admin') {
      return Response.json({ error: '슈퍼 어드민은 삭제할 수 없습니다' }, { status: 403 })
    }

    // 1. users 테이블에서 삭제
    const { error: deleteUserError } = await adminClient
      .from('users')
      .delete()
      .eq('id', id)

    if (deleteUserError) {
      console.error('[User DELETE] DB Error:', deleteUserError)
      return Response.json({ error: '사용자 삭제에 실패했습니다' }, { status: 500 })
    }

    // 2. Supabase Auth에서도 삭제 (선택사항 - 완전 삭제)
    try {
      await adminClient.auth.admin.deleteUser(id)
    } catch (authDeleteError) {
      // Auth 삭제 실패해도 DB 삭제는 성공했으므로 경고만 로그
      console.warn('[User DELETE] Auth delete warning:', authDeleteError)
    }

    // 3. 감사 로그 기록
    await adminClient.from('audit_logs').insert({
      admin_id: authCheck.user!.id,
      action: 'delete',
      target_type: 'user',
      target_id: id,
      changes: { deleted_user: targetUser },
      metadata: {
        user_agent: request.headers.get('user-agent'),
      },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('[User DELETE] Error:', error)
    return Response.json({ error: '사용자 삭제 중 오류가 발생했습니다' }, { status: 500 })
  }
}
