import { createAuthenticatedClient } from '@/lib/supabase/client-edge'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return Response.json({ error: '인증이 필요합니다' }, { status: 401 })

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()
    if (profileError || !profile) return Response.json({ error: '프로필 없음' }, { status: 404 })

    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('id, name')
      .eq('org_id', profile.org_id)
      .order('name', { ascending: true })

    if (error) {
      return Response.json({ error: '강의실 조회 실패', details: error.message }, { status: 500 })
    }

    return Response.json({ rooms })
  } catch (error: any) {
    return Response.json({ error: '서버 오류', details: error.message }, { status: 500 })
  }
}
