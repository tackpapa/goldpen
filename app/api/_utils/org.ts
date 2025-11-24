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
 * 인증 + org_id 확보를 공통 처리한다.
 * - E2E_NO_AUTH / service-role / e2e-user: demoOrg + service client 반환
 * - 인증 사용자: users.org_id 조회, 실패 시 demoOrg(서비스키 있는 경우)
 */
export async function getSupabaseWithOrg(request: Request): Promise<OrgContext> {
  const supabase = await createAuthenticatedClient(request)
  const service = getServiceClient()
  const anon = getAnonClient()

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
