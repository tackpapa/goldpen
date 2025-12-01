import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
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
 * 데모 org fallback 없음 - org_id를 확보하지 못하면 무조건 401 반환
 *
 * 우선순위:
 * 1. 미들웨어에서 주입된 x-org-id 헤더 (프로덕션 환경)
 * 2. orgSlug 쿼리 파라미터 (레거시 호환)
 * 3. 인증된 사용자의 org_id
 *
 * 위 방법으로 org_id를 확보하지 못하면 AUTH_REQUIRED 에러 발생
 */
export async function getSupabaseWithOrg(request: Request): Promise<OrgContext> {
  const supabase = await createAuthenticatedClient(request)
  const service = getServiceClient()

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
    // orgSlug가 있지만 해당 org를 찾지 못한 경우 → 에러
    throw new Error('ORG_NOT_FOUND')
  }

  // 3. 인증된 사용자 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    // 인증 없음 + org_id 헤더/파라미터도 없음 → 401
    throw new Error('AUTH_REQUIRED')
  }

  // 4. 사용자의 org_id 조회
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('PROFILE_NOT_FOUND')
  }

  if (!profile.org_id) {
    throw new Error('ORG_NOT_FOUND')
  }

  return { db: service || supabase, supabase, orgId: profile.org_id, user, role: profile.role || null }
}
