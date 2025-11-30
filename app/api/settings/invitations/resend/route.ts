import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'
import { sendInvitationEmail } from '@/lib/email/send-invitation'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface ResendInvitationBody {
  id: string
}

// 초대 토큰 생성 (간단한 랜덤 문자열)
function generateInviteToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

// POST: 초대 재전송
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgSlug = searchParams.get('orgSlug')

    let supabase: ReturnType<typeof createClient> = await createAuthenticatedClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    let orgId: string | null = null
    let orgName: string = ''

    // orgSlug 서비스 모드 지원
    if (orgSlug && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('slug', orgSlug)
        .single()

      if (orgError || !org) {
        return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
      }
      orgId = org.id
      orgName = org.name
    } else if (user && !authError) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('org_id, role')
        .eq('id', user.id)
        .single()

      if (!userProfile) {
        return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
      }

      // 권한 확인 (admin, owner만)
      if (!['admin', 'owner'].includes(userProfile.role)) {
        return Response.json({ error: '권한이 없습니다' }, { status: 403 })
      }
      orgId = userProfile.org_id

      // 기관명 조회
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single()
      orgName = org?.name || ''
    } else {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const body = await request.json() as ResendInvitationBody
    const { id } = body

    if (!id) {
      return Response.json({ error: 'ID는 필수입니다' }, { status: 400 })
    }

    // 기존 초대 조회
    const { data: existingInvitation, error: fetchError } = await supabase
      .from('invitations')
      .select('id, email, role, status')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (fetchError || !existingInvitation) {
      return Response.json({ error: '초대를 찾을 수 없습니다' }, { status: 404 })
    }

    // pending 상태만 재전송 가능
    if (existingInvitation.status !== 'pending') {
      return Response.json({ error: '대기중인 초대만 재전송할 수 있습니다' }, { status: 400 })
    }

    // 새 토큰 생성 및 만료일 갱신
    const newToken = generateInviteToken()
    const newExpiresAt = new Date()
    newExpiresAt.setDate(newExpiresAt.getDate() + 7) // 7일 후 만료

    // 초대 업데이트
    const { data: invitation, error: updateError } = await supabase
      .from('invitations')
      .update({
        token: newToken,
        expires_at: newExpiresAt.toISOString()
      })
      .eq('id', id)
      .eq('org_id', orgId)
      .select('id, email, role, status, created_at, expires_at')
      .single()

    if (updateError) {
      console.error('[Invitations Resend] Error:', updateError)
      return Response.json({ error: '초대 재전송 실패' }, { status: 500 })
    }

    // 이메일 재전송
    const emailResult = await sendInvitationEmail({
      to: existingInvitation.email,
      orgName,
      role: existingInvitation.role,
      token: newToken,
      expiresAt: newExpiresAt.toISOString()
    })

    if (!emailResult.success) {
      console.error(`[Invitations] 재전송 이메일 발송 실패: ${existingInvitation.email}, 에러: ${emailResult.error}`)
    } else {
      console.log(`[Invitations] 재전송 이메일 발송 성공: ${existingInvitation.email}, messageId: ${emailResult.messageId}`)
    }

    return Response.json({
      invitation,
      emailSent: emailResult.success,
      message: emailResult.success
        ? '초대 이메일이 재전송되었습니다'
        : '초대가 업데이트되었지만 이메일 발송에 실패했습니다.'
    })
  } catch (error: unknown) {
    console.error('[Invitations Resend] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
