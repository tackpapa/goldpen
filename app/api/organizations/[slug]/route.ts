import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('[Supabase Admin] Missing env')
  return createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

// GET /api/organizations/[slug] - 기관 정보 조회 (공개)
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const adminClient = createAdminClient()
    const slug = params.slug

    // slug 컬럼으로 먼저 조회, 없으면 name/id로 폴백
    let { data: organization, error } = await adminClient
      .from('organizations')
      .select('id, name, logo_url')
      .eq('slug', slug)
      .maybeSingle()

    // slug로 못 찾으면 name/id로 폴백 (레거시 호환)
    if (!organization) {
      const fallbackResult = await adminClient
        .from('organizations')
        .select('id, name, logo_url')
        .or(`name.eq.${slug},id.eq.${slug}`)
        .maybeSingle()
      organization = fallbackResult.data
      error = fallbackResult.error
    }

    if (error || !organization) {
      return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
    }

    return Response.json({ organization })
  } catch (error: any) {
    console.error('[Organizations GET] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
