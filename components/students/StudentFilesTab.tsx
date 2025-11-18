'use client'

import { useState } from 'react'
import type { Student, StudentFile } from '@/lib/types/database'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Upload, FileText, Image as ImageIcon, File, X, Eye, Download } from 'lucide-react'
import { format } from 'date-fns'

interface StudentFilesTabProps {
  student: Student
  onUpdate?: (student: Student) => void
}

export function StudentFilesTab({ student, onUpdate }: StudentFilesTabProps) {
  const { toast } = useToast()
  const [files, setFiles] = useState<StudentFile[]>(student.files || [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || [])

    uploadedFiles.forEach((file) => {
      // 파일 크기 체크 (9MB)
      if (file.size > 9 * 1024 * 1024) {
        toast({
          title: '파일 크기 초과',
          description: `${file.name}은(는) 9MB를 초과합니다.`,
          variant: 'destructive',
        })
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const newFile: StudentFile = {
          id: `file-${Date.now()}-${Math.random()}`,
          name: file.name,
          type: file.type,
          size: file.size,
          url: reader.result as string,
          uploaded_at: new Date().toISOString(),
        }

        setFiles((prev) => [...prev, newFile])

        // Update student in localStorage
        const studentsData = localStorage.getItem('students')
        if (studentsData) {
          const students = JSON.parse(studentsData) as Student[]
          const updatedStudents = students.map((s) =>
            s.id === student.id ? { ...s, files: [...(s.files || []), newFile] } : s
          )
          localStorage.setItem('students', JSON.stringify(updatedStudents))
          onUpdate?.({ ...student, files: [...(student.files || []), newFile] })
        }

        toast({
          title: '파일 업로드 완료',
          description: `${file.name}이(가) 업로드되었습니다.`,
        })
      }
      reader.readAsDataURL(file)
    })

    e.target.value = '' // Reset input
  }

  const handleDeleteFile = (fileId: string) => {
    const updatedFiles = files.filter((f) => f.id !== fileId)
    setFiles(updatedFiles)

    // Update student in localStorage
    const studentsData = localStorage.getItem('students')
    if (studentsData) {
      const students = JSON.parse(studentsData) as Student[]
      const updatedStudents = students.map((s) =>
        s.id === student.id ? { ...s, files: updatedFiles } : s
      )
      localStorage.setItem('students', JSON.stringify(updatedStudents))
      onUpdate?.({ ...student, files: updatedFiles })
    }

    toast({
      title: '파일 삭제 완료',
      description: '파일이 삭제되었습니다.',
    })
  }

  const handleViewFile = (file: StudentFile) => {
    window.open(file.url, '_blank', 'noopener,noreferrer')
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
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('student-file-upload')?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              파일 업로드
            </Button>
            <span className="text-sm text-muted-foreground">
              {files.length}개 파일 ({formatFileSize(files.reduce((sum, f) => sum + f.size, 0))})
            </span>
          </div>
        </div>

        {/* Files List */}
        {files.length === 0 ? (
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
