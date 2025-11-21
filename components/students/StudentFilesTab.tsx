'use client'

import { useState, useEffect } from 'react'
import type { Student } from '@/lib/types/database'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Upload, FileText, Image as ImageIcon, File, X, Eye, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface StudentFile {
  id: string
  name: string
  type: string
  size: number
  url: string | null
  uploaded_at: string
}

interface StudentFilesTabProps {
  student: Student
  onUpdate?: (student: Student) => void
  onRefresh?: () => void
}

export function StudentFilesTab({ student, onUpdate, onRefresh }: StudentFilesTabProps) {
  const { toast } = useToast()
  const [files, setFiles] = useState<StudentFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Fetch files on mount
  useEffect(() => {
    fetchFiles()
  }, [student.id])

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/students/${student.id}/files`)
      if (res.ok) {
        const data = await res.json()
        setFiles(data.files || [])
      }
    } catch (error) {
      console.error('Failed to fetch files:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || [])

    for (const file of uploadedFiles) {
      // 파일 크기 체크 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: '파일 크기 초과',
          description: `${file.name}은(는) 10MB를 초과합니다.`,
          variant: 'destructive',
        })
        continue
      }

      try {
        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('org_id', student.org_id)

        const res = await fetch(`/api/students/${student.id}/files`, {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          const data = await res.json()
          setFiles((prev) => [data.file, ...prev])
          toast({
            title: '파일 업로드 완료',
            description: `${file.name}이(가) 업로드되었습니다.`,
          })
        } else {
          const error = await res.json()
          toast({
            title: '업로드 실패',
            description: error.error || '파일 업로드에 실패했습니다.',
            variant: 'destructive',
          })
        }
      } catch (error) {
        toast({
          title: '업로드 실패',
          description: '파일 업로드 중 오류가 발생했습니다.',
          variant: 'destructive',
        })
      } finally {
        setUploading(false)
      }
    }

    e.target.value = '' // Reset input
    onRefresh?.()
  }

  const handleDeleteFile = async (fileId: string) => {
    try {
      const res = await fetch(`/api/students/${student.id}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      })

      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId))
        toast({
          title: '파일 삭제 완료',
          description: '파일이 삭제되었습니다.',
        })
        onRefresh?.()
      } else {
        toast({
          title: '삭제 실패',
          description: '파일 삭제에 실패했습니다.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '삭제 실패',
        description: '파일 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleViewFile = (file: StudentFile) => {
    if (file.url) {
      window.open(file.url, '_blank', 'noopener,noreferrer')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon
    if (type.includes('pdf')) return FileText
    return File
  }

  const isImage = (type: string) => type.startsWith('image/')
  const isPDF = (type: string) => type.includes('pdf')

  return (
    <Card>
      <CardHeader>
        <CardTitle>학생 자료</CardTitle>
        <CardDescription>
          학생 관련 문서, 이미지 등을 업로드하고 관리하세요 (최대 9MB)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              id="student-file-upload"
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('student-file-upload')?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {uploading ? '업로드 중...' : '파일 업로드'}
            </Button>
            <span className="text-sm text-muted-foreground">
              {files.length}개 파일 ({formatFileSize(files.reduce((sum, f) => sum + f.size, 0))})
            </span>
          </div>
        </div>

        {/* Files List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <File className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">업로드된 파일이 없습니다</p>
            <p className="text-xs text-muted-foreground">파일을 업로드하여 학생 자료를 관리하세요</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {files.map((file) => {
              const FileIconComponent = getFileIcon(file.type)

              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Preview */}
                  <div className="flex-shrink-0">
                    {isImage(file.type) ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="h-16 w-16 object-cover rounded border cursor-pointer hover:opacity-80"
                        onClick={() => handleViewFile(file)}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded border bg-muted flex items-center justify-center">
                        <FileIconComponent className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{file.name}</p>
                      {isImage(file.type) && (
                        <Badge variant="secondary" className="text-xs">이미지</Badge>
                      )}
                      {isPDF(file.type) && (
                        <Badge variant="secondary" className="text-xs">PDF</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{format(new Date(file.uploaded_at), 'yyyy-MM-dd HH:mm')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleViewFile(file)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
