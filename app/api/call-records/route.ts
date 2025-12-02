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

// POST: Create call record (학생 호출)
export async function POST(request: Request) {
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

    const body = await request.json() as { studentId?: string; seatNumber?: number; message?: string }
    const { studentId, seatNumber, message } = body

    if (!studentId || !seatNumber) {
      return Response.json({ error: 'studentId와 seatNumber가 필요합니다' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await db
      .from('call_records')
      .insert({
        org_id: orgId,
        student_id: studentId,
        seat_number: seatNumber,
        date: today,
        call_time: new Date().toISOString(),
        message: message || '카운터로 와주세요',
        status: 'calling',
      })
      .select()
      .single()

    if (error) {
      console.error('[call-records POST] Insert error:', error)
      return Response.json({ error: '호출 등록 실패', details: error.message }, { status: 500 })
    }

    return Response.json({ success: true, callRecord: data })
  } catch (error: any) {
    console.error('[call-records POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

// DELETE: Delete call record (호출 확인/취소)
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

    const body = await request.json() as { id?: string }
    const { id } = body

    if (!id) {
      return Response.json({ error: 'id가 필요합니다' }, { status: 400 })
    }

    const { error } = await db
      .from('call_records')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) {
      console.error('[call-records DELETE] Delete error:', error)
      return Response.json({ error: '호출 삭제 실패', details: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('[call-records DELETE] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
