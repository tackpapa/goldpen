import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { data, error } = await db
      .from('kakao_talk_usages')
      .select('*')
      .eq('org_id', orgId)
      .order('sent_at', { ascending: false })
      .limit(200)
    if (error) throw error
    return Response.json({ kakaoTalkUsages: data || [] })
  } catch (e: any) {
    const code = e.message === 'AUTH_REQUIRED' ? 401 : 500
    return Response.json({ error: '카카오톡 내역 조회 실패', details: e.message }, { status: code })
  }
}

export async function POST(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const body = await request.json() as Record<string, any>
    const payload = { ...body, org_id: orgId }
    const { data, error } = await db.from('kakao_talk_usages').insert(payload).select('*').single()
    if (error) throw error
    return Response.json({ usage: data }, { status: 201 })
  } catch (e: any) {
    const code = e.message === 'AUTH_REQUIRED' ? 401 : 500
    return Response.json({ error: '카카오톡 내역 저장 실패', details: e.message }, { status: code })
  }
}
