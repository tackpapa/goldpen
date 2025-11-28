import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logActivity, actionDescriptions } from '@/app/api/_utils/activity-log'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export const runtime = 'edge'

// PUT /api/students/[id] - 학생 정보 수정
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createAuthenticatedClient(request)
    const service = getServiceClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const demoOrg = process.env.NEXT_PUBLIC_DEMO_ORG_ID || process.env.DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'

    let orgId: string | null = null

    if (!authError && user && user.id !== 'service-role' && user.id !== 'e2e-user') {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()
      if (profileError || !profile) return NextResponse.json({ error: '프로필 없음' }, { status: 404 })
      orgId = profile.org_id
    } else if (service) {
      orgId = demoOrg
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const db = service || supabase

    // 학생 정보 업데이트
    const { data: student, error } = await db
      .from('students')
      .update(body)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) {
      console.error('Error updating student:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // 활동 로그 기록
    await logActivity({
      orgId: orgId!,
      userId: user?.id || null,
      userName: user?.email?.split('@')[0] || '시스템',
      userRole: null,
      actionType: 'update',
      entityType: 'student',
      entityId: student.id,
      entityName: student.name,
      description: actionDescriptions.student.update(student.name || '이름 없음'),
      request,
    })

    return NextResponse.json({ student })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/students/[id] - 학생 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createAuthenticatedClient(request)
    const service = getServiceClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const demoOrg = process.env.NEXT_PUBLIC_DEMO_ORG_ID || process.env.DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'

    let orgId: string | null = null

    if (!authError && user && user.id !== 'service-role' && user.id !== 'e2e-user') {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()
      if (profileError || !profile) return NextResponse.json({ error: '프로필 없음' }, { status: 404 })
      orgId = profile.org_id
    } else if (service) {
      orgId = demoOrg
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = service || supabase

    // 삭제 전 학생 정보 조회 (로그용)
    const { data: studentToDelete } = await db
      .from('students')
      .select('id, name, org_id')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    // 학생 삭제
    const { error } = await db
      .from('students')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) {
      console.error('Error deleting student:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 활동 로그 기록
    if (studentToDelete?.org_id) {
      await logActivity({
        orgId: studentToDelete.org_id,
        userId: user?.id || null,
        userName: user?.email?.split('@')[0] || '시스템',
        userRole: null,
        actionType: 'delete',
        entityType: 'student',
        entityId: id,
        entityName: studentToDelete.name,
        description: actionDescriptions.student.delete(studentToDelete.name || '이름 없음'),
        request,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
