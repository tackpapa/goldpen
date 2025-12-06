import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { NextResponse } from 'next/server'
import { logActivity, actionDescriptions } from '@/app/api/_utils/activity-log'

export const runtime = 'edge'

// GET /api/students/[id] - 학생 상세 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { data: student, error } = await db
      .from('students')
      .select(`
        *,
        classes:class_enrollments(
          class:classes(id, name, teacher_id)
        )
      `)
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (error) {
      console.error('Error fetching student:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json({ student })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/students/[id] - 학생 정보 수정
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db, orgId, user } = await getSupabaseWithOrg(request)

    const body = await request.json()

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
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
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
    const { db, orgId, user } = await getSupabaseWithOrg(request)

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
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
