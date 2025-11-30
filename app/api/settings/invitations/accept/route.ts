import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface AcceptInvitationBody {
  token: string
  name: string
  password: string
}

// POST: 초대 수락 및 계정 생성
export async function POST(request: Request) {
  try {
    if (!supabaseServiceKey) {
      return Response.json({ error: '서버 설정 오류' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const body = await request.json() as AcceptInvitationBody
    const { token, name, password } = body

    if (!token || !name || !password) {
      return Response.json({ error: '모든 필드가 필요합니다' }, { status: 400 })
    }

    if (password.length < 6) {
      return Response.json({ error: '비밀번호는 최소 6자 이상이어야 합니다' }, { status: 400 })
    }

    // 초대 조회
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('id, org_id, email, role, status, expires_at')
      .eq('token', token)
      .single()

    if (inviteError || !invitation) {
      return Response.json({ error: '유효하지 않은 초대입니다' }, { status: 404 })
    }

    // 상태 확인
    if (invitation.status !== 'pending') {
      return Response.json({ error: '이미 처리된 초대입니다' }, { status: 400 })
    }

    // 만료 확인
    if (new Date(invitation.expires_at) < new Date()) {
      // 만료 상태로 업데이트
      await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)

      return Response.json({ error: '만료된 초대입니다' }, { status: 400 })
    }

    // Supabase Auth로 사용자 생성
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true, // 이메일 인증 건너뛰기 (초대로 가입)
      user_metadata: {
        name,
        org_id: invitation.org_id,
        role: invitation.role
      }
    })

    if (authError) {
      // 이미 등록된 사용자인 경우
      if (authError.message.includes('already been registered')) {
        return Response.json({ error: '이미 등록된 이메일입니다' }, { status: 409 })
      }
      console.error('[Invitation Accept] Auth Error:', authError)
      return Response.json({ error: '계정 생성 실패' }, { status: 500 })
    }

    if (!authData.user) {
      return Response.json({ error: '사용자 생성 실패' }, { status: 500 })
    }

    // users 테이블에 사용자 정보 추가
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: invitation.email,
        name,
        org_id: invitation.org_id,
        role: invitation.role,
        status: 'active'
      })

    if (userError) {
      console.error('[Invitation Accept] User Insert Error:', userError)
      // 롤백: Auth 사용자 삭제
      await supabase.auth.admin.deleteUser(authData.user.id)
      return Response.json({ error: '사용자 정보 저장 실패' }, { status: 500 })
    }

    // 초대 상태 업데이트
    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_by: authData.user.id,
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    if (updateError) {
      console.error('[Invitation Accept] Update Error:', updateError)
      // 이 경우 사용자는 이미 생성되었으므로 경고만
    }

    // 기관 정보 조회 (리다이렉트용)
    const { data: org } = await supabase
      .from('organizations')
      .select('slug, name')
      .eq('id', invitation.org_id)
      .single()

    return Response.json({
      success: true,
      message: '초대를 수락하고 계정이 생성되었습니다',
      user: {
        id: authData.user.id,
        email: invitation.email,
        name,
        role: invitation.role
      },
      organization: org
    })
  } catch (error: unknown) {
    console.error('[Invitation Accept] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// GET: 토큰으로 초대 정보 조회 (수락 페이지에서 사용)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return Response.json({ error: '토큰이 필요합니다' }, { status: 400 })
    }

    if (!supabaseServiceKey) {
      return Response.json({ error: '서버 설정 오류' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 초대 조회
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('id, org_id, email, role, status, expires_at, created_at')
      .eq('token', token)
      .single()

    if (inviteError || !invitation) {
      return Response.json({ error: '유효하지 않은 초대입니다' }, { status: 404 })
    }

    // 상태 확인
    if (invitation.status !== 'pending') {
      return Response.json({
        error: invitation.status === 'accepted' ? '이미 수락된 초대입니다' : '처리된 초대입니다',
        status: invitation.status
      }, { status: 400 })
    }

    // 만료 확인
    if (new Date(invitation.expires_at) < new Date()) {
      return Response.json({
        error: '만료된 초대입니다',
        status: 'expired'
      }, { status: 400 })
    }

    // 기관 정보 조회
    const { data: org } = await supabase
      .from('organizations')
      .select('name, slug')
      .eq('id', invitation.org_id)
      .single()

    return Response.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        created_at: invitation.created_at
      },
      organization: org
    })
  } catch (error: unknown) {
    console.error('[Invitation Accept GET] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
