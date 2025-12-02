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

const getAnonClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const updateSettingsSchema = z.object({
  name: z.string().optional(),
  owner_name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  logo_url: z.string().optional(),
  settings: z.record(z.any()).optional(),
})

export async function GET(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const service = getServiceClient()
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('orgSlug') || searchParams.get('slug')

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    let orgId: string | null = null
    let db: any = service || supabase

    // slug가 제공된 경우 (프로덕션 대시보드 지원)
    if (slug && service) {
      const { data: orgBySlug } = await service
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (orgBySlug?.id) {
        orgId = orgBySlug.id
        db = service
      } else {
        return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
      }
    } else if (!authError && user) {
      // 인증된 사용자
      const { data: userProfile } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()
      if (!userProfile?.org_id) {
        return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
      }
      orgId = userProfile.org_id
    } else {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    if (!orgId) {
      return Response.json({ error: 'org_id가 필요합니다' }, { status: 400 })
    }

    // ensure org_settings row exists for this org
    try {
      await db.rpc('ensure_org_settings', { org: orgId })
    } catch (_) {
      /* ignore */
    }

    const { data: organization, error: orgError } = await db
      .from('organizations')
      .select('id, name, slug, logo_url')
      .eq('id', orgId)
      .single()

    const { data: orgSettings, error: settingsError } = await db
      .from('org_settings')
      .select('name, owner_name, address, phone, email, logo_url, settings')
      .eq('org_id', orgId)
      .maybeSingle()

    // owner_name은 항상 users 테이블에서 가져옴 (가입 시 입력, 변경 불가)
    const { data: ownerUser } = await db
      .from('users')
      .select('name')
      .eq('org_id', orgId)
      .eq('role', 'owner')
      .maybeSingle()
    const ownerName = ownerUser?.name || ''

    // Signed logo URL (path -> signed url) for private bucket
    const toSignedLogo = async (logo?: string | null) => {
      if (!logo) return undefined
      if (logo.startsWith('http')) return logo
      const service = getServiceClient()
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
      if (service) {
        const { data: signed, error: signedErr } = await service.storage
          .from('org-files')
          .createSignedUrl(logo, 60 * 60 * 24 * 7)
        if (!signedErr && signed?.signedUrl) return signed.signedUrl
      }
      if (baseUrl) {
        // fallback to public object URL to avoid 상대 경로 404
        return `${baseUrl}/storage/v1/object/public/org-files/${logo}`
      }
      return `/${logo}`
    }

    const logoUrl = await toSignedLogo(orgSettings?.logo_url || organization?.logo_url)

    if (orgError || settingsError) {
      console.error('[Settings GET] Error:', orgError || settingsError)
      return Response.json({ error: '설정 조회 실패', details: (orgError || settingsError)?.message }, { status: 500 })
    }

    if (!organization) {
      return Response.json({ error: '조직을 찾을 수 없습니다' }, { status: 404 })
    }

    return Response.json({
      organization: {
        id: organization.id,
        name: orgSettings?.name || organization.name,
        slug: organization.slug,
        logo_url: logoUrl,
        owner_name: ownerName,
        address: orgSettings?.address,
        phone: orgSettings?.phone,
        email: orgSettings?.email,
        settings: orgSettings?.settings || {},
      }
    })
  } catch (error: any) {
    console.error('[Settings GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const service = getServiceClient()
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('orgSlug') || searchParams.get('slug')

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    let orgId: string | null = null
    let role: string | null = null
    let db: any = service || supabase

    // slug가 제공된 경우 (프로덕션 대시보드 지원)
    if (slug && service) {
      const { data: orgBySlug } = await service
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (orgBySlug?.id) {
        orgId = orgBySlug.id
        role = 'owner' // slug로 접근한 경우 owner 권한 부여
        db = service
      } else {
        return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
      }
    } else if (!authError && user) {
      // 인증된 사용자
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('org_id, role')
        .eq('id', user.id)
        .single()
      if (profileError || !userProfile) {
        return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
      }
      orgId = userProfile.org_id
      role = userProfile.role
    } else {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    if (!orgId) {
      return Response.json({ error: 'org_id가 필요합니다' }, { status: 400 })
    }

    // Only owner and manager can update settings (테스트 모드에서는 허용)
    if (!['owner', 'manager'].includes(role || '')) {
      return Response.json({ error: '설정을 수정할 권한이 없습니다' }, { status: 403 })
    }

    const body = await request.json()
    const validated = updateSettingsSchema.parse(body)

    try {
      await db.rpc('ensure_org_settings', { org: orgId })
    } catch (_) {
      /* ignore */
    }

    // organizations: name/slug remain, logo_url optional sync
    if (validated.name || validated.logo_url) {
      const { error: orgUpErr } = await db
        .from('organizations')
        .update({
          name: validated.name,
          logo_url: validated.logo_url,
        })
        .eq('id', orgId)
      if (orgUpErr) {
        console.error('[Settings PUT] org update error', orgUpErr)
        return Response.json({ error: '설정 수정 실패', details: orgUpErr.message }, { status: 500 })
      }
    }

    const { data: orgSettings, error: settingsUpErr } = await db
      .from('org_settings')
      .update({
        name: validated.name,
        owner_name: validated.owner_name,
        address: validated.address,
        phone: validated.phone,
        email: validated.email,
        logo_url: validated.logo_url,
        settings: validated.settings,
      })
      .eq('org_id', orgId)
      .select('name, owner_name, address, phone, email, logo_url, settings')
      .maybeSingle()

    if (settingsUpErr) {
      console.error('[Settings PUT] settings update error', settingsUpErr)
      return Response.json({ error: '설정 수정 실패', details: settingsUpErr.message }, { status: 500 })
    }

    // fetch slug for response
    const { data: orgMeta } = await db
      .from('organizations')
      .select('id, slug')
      .eq('id', orgId)
      .single()

    return Response.json({
      organization: {
        id: orgId,
        name: orgSettings?.name,
        slug: orgMeta?.slug,
        logo_url: orgSettings?.logo_url,
        owner_name: orgSettings?.owner_name,
        address: orgSettings?.address,
        phone: orgSettings?.phone,
        email: orgSettings?.email,
        settings: orgSettings?.settings || {},
      },
      message: '설정이 수정되었습니다'
    })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Settings PUT] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
