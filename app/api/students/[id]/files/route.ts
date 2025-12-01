import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// GET - 학생 파일 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { data, error } = await db
      .from('student_files')
      .select('*')
      .eq('student_id', studentId)
      .eq('org_id', orgId)
      .order('uploaded_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Generate signed URLs for each file
    const filesWithUrls = await Promise.all(
      (data || []).map(async (file: any) => {
        const { data: urlData } = await db.storage
          .from('student-files')
          .createSignedUrl(file.storage_path, 3600)

        return {
          ...file,
          url: urlData?.signedUrl || null
        }
      })
    )

    return NextResponse.json({ files: filesWithUrls })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to get files' }, { status: 500 })
  }
}

// POST - 파일 업로드
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params
    const { db, orgId } = await getSupabaseWithOrg(request)

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    // Generate unique file path
    const timestamp = Date.now()
    const ext = file.name.split('.').pop()
    const storagePath = `${orgId}/${studentId}/${timestamp}.${ext}`

    // Upload to Supabase Storage
    const { error: uploadError } = await db.storage
      .from('student-files')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Save metadata to database
    const { data, error: dbError } = await db
      .from('student_files')
      .insert({
        org_id: orgId,
        student_id: studentId,
        name: file.name,
        type: file.type,
        size: file.size,
        storage_path: storagePath
      })
      .select()
      .single()

    if (dbError) {
      // Rollback - delete uploaded file
      await db.storage.from('student-files').remove([storagePath])
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Get signed URL
    const { data: urlData } = await db.storage
      .from('student-files')
      .createSignedUrl(storagePath, 3600)

    return NextResponse.json({
      file: { ...data, url: urlData?.signedUrl }
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

// DELETE - 파일 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { fileId } = await request.json() as { fileId: string }

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 })
    }

    // Get file info
    const { data: file, error: fetchError } = await db
      .from('student_files')
      .select('storage_path')
      .eq('id', fileId)
      .eq('student_id', studentId)
      .eq('org_id', orgId)
      .single()

    if (fetchError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Delete from storage
    const { error: storageError } = await db.storage
      .from('student-files')
      .remove([file.storage_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
    }

    // Delete from database
    const { error: dbError } = await db
      .from('student_files')
      .delete()
      .eq('id', fileId)
      .eq('org_id', orgId)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}
