import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { data, error } = await db
      .from('service_usages')
      .select('*')
      .eq('org_id', orgId)
      .order('occurred_at', { ascending: false })
      .limit(200)
    if (error) throw error
    return Response.json({ serviceUsages: data || [] })
  } catch (e: any) {
    const code = e.message === 'AUTH_REQUIRED' ? 401 : 500
    return Response.json({ error: '서비스 이용내역 조회 실패', details: e.message }, { status: code })
  }
}

export async function POST(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const body = await request.json() as Record<string, any>
    const payload = { ...body, org_id: orgId }
    const { data, error } = await db.from('service_usages').insert(payload).select('*').single()
    if (error) throw error
    return Response.json({ usage: data }, { status: 201 })
  } catch (e: any) {
    const code = e.message === 'AUTH_REQUIRED' ? 401 : 500
    return Response.json({ error: '서비스 이용내역 저장 실패', details: e.message }, { status: code })
  }
}
