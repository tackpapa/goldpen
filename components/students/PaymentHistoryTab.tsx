'use client'

import { useState } from 'react'
import type { Student } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Trash2, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PaymentHistoryTabProps {
  student: Student
  payments?: any[]
  loading?: boolean
  onRefresh?: () => void
}

export function PaymentHistoryTab({
  student,
  payments = [],
  loading = false,
  onRefresh,
}: PaymentHistoryTabProps) {
  const { toast } = useToast()
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [cancelling, setCancelling] = useState(false)

  // 안전 필터: 현재 학생 결제만 표시
  const filtered = payments.filter(p => p.student_id === student.id)
  // 완료된 결제만 금액 합산 (취소 제외)
  const totalAmount = filtered
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  const handleCancelClick = (payment: any) => {
    setSelectedPayment(payment)
    setCancelModalOpen(true)
  }

  const handleCancelConfirm = async () => {
    if (!selectedPayment) return

    setCancelling(true)
    try {
      const response = await fetch(`/api/payments/${selectedPayment.id}`, {
        method: 'PATCH',
      })

      const result = await response.json() as { error?: string }

      if (!response.ok) {
        throw new Error(result.error || '결제 취소에 실패했습니다.')
      }

      toast({
        title: '결제 취소 완료',
        description: '결제가 취소되고 제공 내역이 환수되었습니다.',
      })

      setCancelModalOpen(false)
      setSelectedPayment(null)
      onRefresh?.()
    } catch (error) {
      console.error('Cancel error:', error)
      toast({
        title: '결제 취소 실패',
        description: error instanceof Error ? error.message : '결제 취소에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setCancelling(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">완료</Badge>
      case 'cancelled':
        return <Badge variant="secondary">결제취소</Badge>
      case 'refunded':
        return <Badge variant="destructive">환불</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 통계 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 결제 횟수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filtered.filter(p => p.status === 'completed').length}회</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">결제 누적 금액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAmount.toLocaleString()}원</div>
          </CardContent>
        </Card>
      </div>

      {/* 결제 내역 테이블 */}
      <Card>
          <CardHeader>
            <CardTitle>결제 내역</CardTitle>
            <CardDescription>최근 결제 기록 ({filtered.length}건)</CardDescription>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                결제 내역이 없습니다.
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>항목</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>날짜</TableHead>
                    <TableHead>결제수단</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead className="text-center">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...filtered].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()).map(payment => (
                    <TableRow key={payment.id} className={payment.status === 'cancelled' ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">
                        {payment.revenue_category_name || payment.category || payment.description || '결제'}
                        {payment.notes && (
                          <div className="text-xs text-muted-foreground mt-1">{payment.notes}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.status)}
                      </TableCell>
                      <TableCell>
                        {new Date(payment.payment_date).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        {payment.payment_method === 'card' ? '카드' : payment.payment_method === 'cash' ? '현금' : '계좌이체'}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {(payment.amount || 0).toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-center">
                        {payment.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancelClick(payment)
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 결제 취소 확인 모달 */}
      <AlertDialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <AlertDialogContent
          onClick={(e: any) => e.stopPropagation()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>결제 취소</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <span>결제내역을 삭제하고 제공내역을 되돌리시겠습니까?</span>
                {selectedPayment && (
                  <div className="mt-4 p-3 bg-muted rounded-md text-sm space-y-1">
                    <div><strong>결제 항목:</strong> {selectedPayment.revenue_category_name || '결제'}</div>
                    <div><strong>결제 금액:</strong> {(selectedPayment.amount || 0).toLocaleString()}원</div>
                    <div className="pt-2 border-t mt-2">
                      <div className="font-medium mb-1">제공 내역:</div>
                      {selectedPayment.granted_credits_hours > 0 ? (
                        <div className="text-orange-600">
                          • 수업 크레딧: {selectedPayment.granted_credits_hours}시간 (환수 예정)
                        </div>
                      ) : (
                        <div className="text-muted-foreground">• 수업 크레딧: 없음</div>
                      )}
                      {selectedPayment.granted_pass_amount > 0 ? (
                        <div className="text-orange-600">
                          • 독서실 시간: {selectedPayment.granted_pass_amount}
                          {selectedPayment.granted_pass_type === 'hours' ? '시간' : '일'} (환수 예정)
                        </div>
                      ) : (
                        <div className="text-muted-foreground">• 독서실 시간: 없음</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                '예, 취소합니다'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
