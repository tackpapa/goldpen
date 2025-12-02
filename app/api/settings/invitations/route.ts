import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'
import { sendInvitationEmail } from '@/lib/email/send-invitation'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) as string
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

// Invitation 타입 정의 (Supabase 타입에 없는 테이블)
interface Invitation {
  id: string
  org_id: string
  email: string
  role: string
  token: string
  status: 'pending' | 'accepted' | 'expired'
  created_at: string
  expires_at: string
}

// Organization 타입 정의
interface Organization {
  id: string
  name: string
  slug: string
}

// User 타입 정의
interface UserProfile {
  id: string
  org_id: string
  email: string
  role: string
}

// Request body types
interface CreateInvitationBody {
  email: string
  role: string
}

interface DeleteInvitationBody {
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

// GET: 초대 목록 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgSlug = searchParams.get('orgSlug')

    let supabase: ReturnType<typeof createClient> = await createAuthenticatedClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    let orgId: string | null = null

    if (orgSlug && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .single() as { data: Pick<Organization, 'id'> | null; error: unknown }

      if (orgError || !org) {
        return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
      }
      orgId = org.id
    } else if (user && !authError) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single() as { data: Pick<UserProfile, 'org_id'> | null; error: unknown }

      if (!userProfile) {
        return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
      }
      orgId = userProfile.org_id
    } else {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('id, email, role, status, created_at, expires_at')
      .eq('org_id', orgId!)
      .order('created_at', { ascending: false }) as { data: Invitation[] | null; error: unknown }

    if (error) {
      console.error('[Invitations GET] Error:', error)
      return Response.json({ error: '초대 조회 실패' }, { status: 500 })
    }

    return Response.json({ invitations: invitations || [] })
  } catch (error: unknown) {
    console.error('[Invitations GET] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// POST: 초대 생성 및 이메일 전송
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
        .single() as { data: Pick<Organization, 'id' | 'name'> | null; error: unknown }

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
        .single() as { data: Pick<UserProfile, 'org_id' | 'role'> | null; error: unknown }

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
        .single() as { data: Pick<Organization, 'name'> | null; error: unknown }
      orgName = org?.name || ''
    } else {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const body = await request.json() as CreateInvitationBody
    const { email, role } = body

    if (!email) {
      return Response.json({ error: '이메일은 필수입니다' }, { status: 400 })
    }

    if (!['owner', 'manager', 'teacher'].includes(role)) {
      return Response.json({ error: '유효하지 않은 역할입니다' }, { status: 400 })
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return Response.json({ error: '올바른 이메일 형식이 아닙니다' }, { status: 400 })
    }

    // 이미 초대된 이메일인지 확인
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('org_id', orgId!)
      .eq('email', email)
      .eq('status', 'pending')
      .single() as { data: Pick<Invitation, 'id'> | null; error: unknown }

    if (existingInvitation) {
      return Response.json({ error: '이미 초대된 이메일입니다' }, { status: 409 })
    }

    // 이미 등록된 사용자인지 확인 (같은 기관 내)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('org_id', orgId!)
      .eq('email', email)
      .single() as { data: Pick<UserProfile, 'id'> | null; error: unknown }

    if (existingUser) {
      return Response.json({ error: '이미 등록된 사용자입니다' }, { status: 409 })
    }

    // Supabase Auth에 이미 등록된 이메일인지 확인 (전역)
    // Service Role Key로 public.users 테이블 전체 조회 (org_id 관계없이)
    if (supabaseServiceKey) {
      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      // public.users 테이블에서 이메일 존재 여부 확인 (모든 기관)
      const { data: authUser } = await adminSupabase
        .from('users')
        .select('id, email, org_id')
        .eq('email', email)
        .maybeSingle()

      if (authUser) {
        return Response.json({ error: '이미 등록된 이메일입니다. 로그인 후 기관 참여를 요청해주세요.' }, { status: 409 })
      }
    }

    // 초대 토큰 생성
    const token = generateInviteToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7일 후 만료

    // 초대 레코드 생성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invitationsTable = supabase.from('invitations') as any
    const { data: invitation, error } = await invitationsTable
      .insert({
        org_id: orgId!,
        email,
        role,
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })
      .select('id, email, role, status, created_at, expires_at')
      .single() as { data: Invitation | null; error: unknown }

    if (error) {
      console.error('[Invitations POST] Error:', error)
      return Response.json({ error: '초대 생성 실패' }, { status: 500 })
    }

    // 이메일 전송
    const emailResult = await sendInvitationEmail({
      to: email,
      orgName,
      role,
      token,
      expiresAt: expiresAt.toISOString()
    })

    if (!emailResult.success) {
      console.error(`[Invitations] 이메일 발송 실패: ${email}, 에러: ${emailResult.error}`)
      // 이메일 발송 실패해도 초대 레코드는 유지 (재전송 가능)
    } else {
    }

    return Response.json({
      invitation,
      emailSent: emailResult.success,
      message: emailResult.success
        ? '초대 이메일이 발송되었습니다'
        : '초대가 생성되었지만 이메일 발송에 실패했습니다. 재전송을 시도해 주세요.'
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('[Invitations POST] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// DELETE: 초대 취소
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgSlug = searchParams.get('orgSlug')

    let supabase: ReturnType<typeof createClient> = await createAuthenticatedClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    let orgId: string | null = null

    // orgSlug 서비스 모드 지원
    if (orgSlug && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .single() as { data: Pick<Organization, 'id'> | null; error: unknown }

      if (orgError || !org) {
        return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
      }
      orgId = org.id
    } else if (user && !authError) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('org_id, role')
        .eq('id', user.id)
        .single() as { data: Pick<UserProfile, 'org_id' | 'role'> | null; error: unknown }

      if (!userProfile) {
        return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
      }

      if (!['admin', 'owner'].includes(userProfile.role)) {
        return Response.json({ error: '권한이 없습니다' }, { status: 403 })
      }
      orgId = userProfile.org_id
    } else {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const body = await request.json() as DeleteInvitationBody
    const { id } = body

    if (!id) {
      return Response.json({ error: 'ID는 필수입니다' }, { status: 400 })
    }

    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId!)

    if (error) {
      console.error('[Invitations DELETE] Error:', error)
      return Response.json({ error: '초대 취소 실패' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error: unknown) {
    console.error('[Invitations DELETE] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
