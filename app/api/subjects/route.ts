import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return Response.json({ error: 'studentId가 필요합니다' }, { status: 400 })
    }

    const { data: subjects, error } = await db
      .from('subjects')
      .select('*')
      .eq('student_id', studentId)
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('order', { ascending: true })

    if (error) {
      console.error('[Subjects GET] Error:', error)
      return Response.json({ error: '과목 조회 실패' }, { status: 500 })
    }

    return Response.json({ subjects: subjects || [] })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[Subjects GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const body = await request.json() as { studentId: string; name: string; color?: string; order?: number }
    const { studentId, name, color, order } = body

    if (!studentId || !name) {
      return Response.json({ error: 'studentId와 name이 필요합니다' }, { status: 400 })
    }

    const { data: subject, error } = await db
      .from('subjects')
      .insert({
        org_id: orgId,
        student_id: studentId,
        name,
        color: color || '#4A90E2',
        order: order || 0,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[Subjects POST] Error:', error)
      return Response.json({ error: '과목 생성 실패' }, { status: 500 })
    }

    return Response.json({ subject })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[Subjects POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('id')
    const body = await request.json() as { name?: string; color?: string; order?: number }

    if (!subjectId) {
      return Response.json({ error: 'id가 필요합니다' }, { status: 400 })
    }

    const updateData: any = {}
    if (body.name) updateData.name = body.name
    if (body.color) updateData.color = body.color
    if (typeof body.order === 'number') updateData.order = body.order

    const { data: subject, error } = await db
      .from('subjects')
      .update(updateData)
      .eq('id', subjectId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) {
      console.error('[Subjects PUT] Error:', error)
      return Response.json({ error: '과목 수정 실패' }, { status: 500 })
    }

    return Response.json({ subject })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[Subjects PUT] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('id')

    if (!subjectId) {
      return Response.json({ error: 'id가 필요합니다' }, { status: 400 })
    }

    const { error } = await db
      .from('subjects')
      .update({ is_active: false })
      .eq('id', subjectId)
      .eq('org_id', orgId)

    if (error) {
      console.error('[Subjects DELETE] Error:', error)
      return Response.json({ error: '과목 삭제 실패' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[Subjects DELETE] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
