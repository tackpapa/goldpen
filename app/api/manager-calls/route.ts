import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// DELETE: Delete manager call (매니저 호출 확인)
export async function DELETE(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const service = getServiceClient()
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('orgSlug') || searchParams.get('slug')

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    let orgId: string | null = null
    let db: any = service || supabase

    // slug가 제공된 경우
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

    const body = await request.json() as { seatNumber?: number }
    const { seatNumber } = body

    if (!seatNumber) {
      return Response.json({ error: 'seatNumber가 필요합니다' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]

    const { error } = await db
      .from('manager_calls')
      .delete()
      .eq('org_id', orgId)
      .eq('seat_number', seatNumber)
      .eq('date', today)
      .eq('status', 'calling')

    if (error) {
      console.error('[manager-calls DELETE] Delete error:', error)
      return Response.json({ error: '매니저 호출 삭제 실패', details: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('[manager-calls DELETE] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
