import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const storageBucket = 'org-files'
    const serviceClient = serviceUrl && serviceKey
      ? createClient(serviceUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : null

    // ensure org_settings row
    try {
      await db.rpc('ensure_org_settings', { org: orgId })
    } catch (_) {
      // 함수 존재하지 않거나 실패해도 조회는 계속 진행
    }

    const { data, error } = await db
      .from('org_settings')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle()

    if (error) throw error

    // logo_path를 signed URL로 변환
    let org = data || null
    if (org?.logo_url && serviceClient) {
      const logoPath = org.logo_url as string
      const { data: signed } = await serviceClient.storage.from(storageBucket).createSignedUrl(logoPath, 60 * 60 * 24 * 7)
      if (signed?.signedUrl) {
        org = { ...org, logo_url: signed.signedUrl }
      }
    }

    return Response.json({ organization: org })
  } catch (e: any) {
    const code = e.message === 'AUTH_REQUIRED' ? 401 : 500
    return Response.json({ error: '설정 조회 실패', details: e.message }, { status: code })
  }
}

export async function PUT(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const body = await request.json() as Record<string, any>

    const payload: Record<string, any> = { ...body }
    delete payload.org_id
    payload.updated_at = new Date().toISOString()

    const { data, error } = await db
      .from('org_settings')
      .upsert({ org_id: orgId, ...payload }, { onConflict: 'org_id' })
      .select('*')
      .single()

    if (error) throw error
    return Response.json({ organization: data })
  } catch (e: any) {
    const code = e.message === 'AUTH_REQUIRED' ? 401 : 500
    return Response.json({ error: '설정 저장 실패', details: e.message }, { status: code })
  }
}
