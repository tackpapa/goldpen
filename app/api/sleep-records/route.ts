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

// PUT: Update sleep record (잠자기 종료 - wake up)
export async function PUT(request: Request) {
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

    const body = await request.json() as { seatNumber?: number; action?: string }
    const { seatNumber, action } = body

    if (!seatNumber) {
      return Response.json({ error: 'seatNumber가 필요합니다' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]

    if (action === 'wake') {
      // Wake up student - update sleep record
      const { error } = await db
        .from('sleep_records')
        .update({
          wake_time: new Date().toISOString(),
          status: 'awake'
        })
        .eq('org_id', orgId)
        .eq('seat_number', seatNumber)
        .eq('date', today)
        .eq('status', 'sleeping')

      if (error) {
        console.error('[sleep-records PUT] Update error:', error)
        return Response.json({ error: '잠자기 종료 실패', details: error.message }, { status: 500 })
      }

      return Response.json({ success: true })
    }

    return Response.json({ error: '알 수 없는 action입니다' }, { status: 400 })
  } catch (error: any) {
    console.error('[sleep-records PUT] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
