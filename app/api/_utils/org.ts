import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'

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

type OrgContext = {
  db: any
  supabase: any
  orgId: string
  user: any | null
  role: string | null
}

// 단일 파일에서만 사용하여 중복 선언 경고를 피하기 위한 로컬 상수
const DEMO_ORG_ID =
  process.env.DEMO_ORG_ID ||
  process.env.NEXT_PUBLIC_DEMO_ORG_ID ||
  'dddd0000-0000-0000-0000-000000000000'

/**
 * 미들웨어에서 주입된 x-org-id 헤더를 읽어서 org_id를 반환한다.
 * 미들웨어에서 orgSlug → org_id 변환을 처리하므로, API에서는 이 함수만 호출하면 된다.
 */
export function getOrgIdFromHeader(request: Request): string | null {
  return request.headers.get('x-org-id')
}

/**
 * 미들웨어에서 주입된 x-org-slug 헤더를 읽어서 org slug를 반환한다.
 */
export function getOrgSlugFromHeader(request: Request): string | null {
  return request.headers.get('x-org-slug')
}

/**
 * 인증 + org_id 확보를 공통 처리한다.
 *
 * 우선순위:
 * 1. 미들웨어에서 주입된 x-org-id 헤더 (프로덕션 환경)
 * 2. orgSlug 쿼리 파라미터 (레거시 호환)
 * 3. 인증된 사용자의 org_id
 * 4. 데모/E2E 폴백
 */
export async function getSupabaseWithOrg(request: Request): Promise<OrgContext> {
  const supabase = await createAuthenticatedClient(request)
  const service = getServiceClient()
  const anon = getAnonClient()

  // 1. 미들웨어에서 주입된 x-org-id 헤더 확인 (최우선)
  const headerOrgId = getOrgIdFromHeader(request)
  if (headerOrgId && service) {
    // 인증 정보는 별도로 확인
    const { data: { user } } = await supabase.auth.getUser()
    return { db: service, supabase, orgId: headerOrgId, user: user ?? null, role: 'owner' }
  }

  // 2. orgSlug 쿼리 파라미터 확인 (레거시 호환)
  const url = new URL(request.url)
  const orgSlug = url.searchParams.get('orgSlug')
  if (orgSlug && service) {
    const { data: org } = await service
      .from('organizations')
      .select('id')
      .eq('slug', orgSlug)
      .single()

    if (org) {
      const { data: { user } } = await supabase.auth.getUser()
      return { db: service, supabase, orgId: org.id, user: user ?? null, role: 'owner' }
    }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // 서비스 롤 / E2E 폴백
  if (service && (authError || !user || user.id === 'service-role' || user.id === 'e2e-user')) {
    return { db: service, supabase, orgId: DEMO_ORG_ID, user: user ?? null, role: 'owner' }
  }

  if (!user) {
    if (service) {
      return { db: service, supabase, orgId: DEMO_ORG_ID, user: null, role: 'owner' }
    }
    if (process.env.E2E_NO_AUTH === '1' && anon) {
      return { db: anon, supabase: anon, orgId: DEMO_ORG_ID, user: null, role: 'owner' }
    }
    throw new Error('AUTH_REQUIRED')
  }

  // org_id 조회
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    if (service) {
      return { db: service, supabase, orgId: DEMO_ORG_ID, user, role: 'owner' }
    }
    throw new Error('PROFILE_NOT_FOUND')
  }

  return { db: service || supabase, supabase, orgId: profile.org_id, user, role: profile.role || null }
}
