export const runtime = 'edge'

import { createClient } from '@/lib/supabase/client-edge'
import { NextRequest, NextResponse } from 'next/server'

// GET - 학생 파일 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await params
  const supabase = createClient()

  const { data, error } = await supabase
    .from('student_files')
    .select('*')
    .eq('student_id', studentId)
    .order('uploaded_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Generate signed URLs for each file
  const filesWithUrls = await Promise.all(
    data.map(async (file) => {
      const { data: urlData } = await supabase.storage
        .from('student-files')
        .createSignedUrl(file.storage_path, 3600) // 1 hour

      return {
        ...file,
        url: urlData?.signedUrl || null
      }
    })
  )

  return NextResponse.json({ files: filesWithUrls })
}

// POST - 파일 업로드
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await params
  const supabase = createClient()

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const orgId = formData.get('org_id') as string

    if (!file || !orgId) {
      return NextResponse.json(
        { error: 'File and org_id are required' },
        { status: 400 }
      )
    }

    // Generate unique file path
    const timestamp = Date.now()
    const ext = file.name.split('.').pop()
    const storagePath = `${orgId}/${studentId}/${timestamp}.${ext}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('student-files')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Save metadata to database
    const { data, error: dbError } = await supabase
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
      await supabase.storage.from('student-files').remove([storagePath])
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Get signed URL
    const { data: urlData } = await supabase.storage
      .from('student-files')
      .createSignedUrl(storagePath, 3600)

    return NextResponse.json({
      file: { ...data, url: urlData?.signedUrl }
    })
  } catch (error) {
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
  const { id: studentId } = await params
  const supabase = createClient()

  try {
    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 })
    }

    // Get file info
    const { data: file, error: fetchError } = await supabase
      .from('student_files')
      .select('storage_path')
      .eq('id', fileId)
      .eq('student_id', studentId)
      .single()

    if (fetchError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('student-files')
      .remove([file.storage_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('student_files')
      .delete()
      .eq('id', fileId)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}
