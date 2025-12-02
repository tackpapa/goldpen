import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Request body types
interface UpdateUserBody {
  id: string
  name?: string
  role?: string
  status?: string
}

// GET: 사용자 목록 조회 (users 테이블에서)
export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    // users 테이블에서 사용자 조회
    const { data: users, error } = await db
      .from('users')
      .select('id, email, name, role, status, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[UserAccounts GET] Error:', error)
      return Response.json({ error: '사용자 조회 실패' }, { status: 500 })
    }

    // accounts 형식으로 변환 (프론트엔드 호환성 유지)
    // 슈퍼관리자 이메일(admin@goldpen.kr) 제외
    interface UserRecord {
      id: string
      email: string
      name: string
      role: string
      status: string
      created_at: string
    }
    const accounts = (users as UserRecord[] || [])
      .filter((user: UserRecord) => user.email !== 'admin@goldpen.kr')
      .map((user: UserRecord) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_active: user.status === 'active',
        created_at: user.created_at
      }))

    return Response.json({ accounts })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    if (error?.message === 'ORG_NOT_FOUND') {
      return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[UserAccounts GET] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// PUT: 사용자 정보 수정 (users 테이블)
export async function PUT(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const body = await request.json() as UpdateUserBody
    const { id, name, role, status } = body

    if (!id) {
      return Response.json({ error: 'ID는 필수입니다' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role
    if (status !== undefined) updateData.status = status

    const { data: user, error } = await db
      .from('users')
      .update(updateData)
      .eq('id', id)
      .eq('org_id', orgId)
      .select('id, email, name, role, status, created_at')
      .single()

    if (error) {
      console.error('[UserAccounts PUT] Error:', error)
      return Response.json({ error: '사용자 수정 실패' }, { status: 500 })
    }

    // account 형식으로 변환
    const account = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.status === 'active',
      created_at: user.created_at
    }

    return Response.json({ account })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    if (error?.message === 'ORG_NOT_FOUND') {
      return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[UserAccounts PUT] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// DELETE: 사용자 삭제 (users 테이블 + Supabase Auth)
export async function DELETE(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return Response.json({ error: 'ID는 필수입니다' }, { status: 400 })
    }

    // 먼저 사용자가 해당 기관 소속인지 확인
    const { data: user, error: userError } = await db
      .from('users')
      .select('id')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (userError || !user) {
      return Response.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })
    }

    // users 테이블에서 삭제
    const { error: deleteError } = await db
      .from('users')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (deleteError) {
      console.error('[UserAccounts DELETE] Error:', deleteError)
      return Response.json({ error: '사용자 삭제 실패' }, { status: 500 })
    }

    // Supabase Auth에서도 삭제
    const { error: authDeleteError } = await db.auth.admin.deleteUser(id)
    if (authDeleteError) {
      console.error('[UserAccounts DELETE] Auth delete error:', authDeleteError)
      // Auth 삭제 실패해도 users 테이블에서는 이미 삭제됨
    }

    return Response.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    if (error?.message === 'ORG_NOT_FOUND') {
      return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[UserAccounts DELETE] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
