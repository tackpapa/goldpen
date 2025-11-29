'use client'

import { useState } from 'react'
import {
  Users,
  CheckSquare,
  BookOpen,
  MessageSquare,
  CreditCard,
  Sparkles,
  Armchair,
  CalendarDays,
  Bell,
  LayoutDashboard,
  TrendingUp,
  Clock,
  UserPlus,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  PieChart,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// 10가지 핵심 기능
const features = [
  {
    id: 'students',
    name: '학생 관리',
    icon: Users,
    color: 'blue',
    badge: '핵심',
    description: '학생 정보를 체계적으로 관리하고, 수강 이력과 학습 현황을 한눈에 파악하세요.',
    highlights: ['학생 프로필 및 연락처', '수강 이력 추적', '학습 진도 관리', '학부모 정보 연동'],
    mockUI: (
      <div className="space-y-3">
        <div className="rounded-lg bg-white p-4 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
              김
            </div>
            <div>
              <p className="font-semibold">김민준</p>
              <p className="text-xs text-muted-foreground">중등 2학년 · 수학/영어</p>
            </div>
            <span className="ml-auto px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">활성</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-blue-50 p-2">
              <p className="text-lg font-bold text-blue-600">24</p>
              <p className="text-xs text-muted-foreground">수강 개월</p>
            </div>
            <div className="rounded-lg bg-green-50 p-2">
              <p className="text-lg font-bold text-green-600">96%</p>
              <p className="text-xs text-muted-foreground">출석률</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-2">
              <p className="text-lg font-bold text-purple-600">A+</p>
              <p className="text-xs text-muted-foreground">평균 성적</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">최근 수업</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>수학 · 이차방정식</span>
              <span className="ml-auto text-xs text-muted-foreground">어제</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>영어 · 문법 복습</span>
              <span className="ml-auto text-xs text-muted-foreground">2일 전</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'attendance',
    name: '출결 관리',
    icon: CheckSquare,
    color: 'green',
    badge: '실시간',
    description: '실시간 출결 체크와 자동 알림으로 출결 관리를 간편하게.',
    highlights: ['QR/앱 체크인', '자동 출결 알림', '결석/지각 추적', '출결 리포트 생성'],
    mockUI: (
      <div className="space-y-3">
        <div className="rounded-lg bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold">오늘 출결 현황</p>
            <span className="text-xs text-muted-foreground">2024.01.15</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center mb-4">
            <div className="rounded-lg bg-green-50 p-2">
              <p className="text-xl font-bold text-green-600">28</p>
              <p className="text-xs text-muted-foreground">출석</p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-2">
              <p className="text-xl font-bold text-yellow-600">2</p>
              <p className="text-xs text-muted-foreground">지각</p>
            </div>
            <div className="rounded-lg bg-red-50 p-2">
              <p className="text-xl font-bold text-red-600">1</p>
              <p className="text-xs text-muted-foreground">결석</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2">
              <p className="text-xl font-bold text-gray-600">1</p>
              <p className="text-xs text-muted-foreground">미확인</p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-green-500" style={{ width: '87.5%' }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right">출석률 87.5%</p>
        </div>
        <div className="rounded-lg bg-white p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">실시간 체크인</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">김민준 학생이 체크인했습니다 · 방금</p>
        </div>
      </div>
    ),
  },
  {
    id: 'classes',
    name: '수업/반 관리',
    icon: BookOpen,
    color: 'indigo',
    badge: '체계적',
    description: '반별 커리큘럼과 수업 일정을 효율적으로 관리하세요.',
    highlights: ['반 생성 및 관리', '커리큘럼 설정', '수업 일정 관리', '강사 배정'],
    mockUI: (
      <div className="space-y-3">
        <div className="rounded-lg bg-white p-4 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold">중등 수학 A반</p>
              <p className="text-xs text-muted-foreground">화/목 16:00-18:00</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>12명</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>주 2회</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">진도</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: '65%' }} />
              </div>
              <span className="text-xs font-medium">65%</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white p-3 shadow-lg text-center">
            <p className="text-2xl font-bold text-indigo-600">8</p>
            <p className="text-xs text-muted-foreground">전체 반</p>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-lg text-center">
            <p className="text-2xl font-bold text-green-600">156</p>
            <p className="text-xs text-muted-foreground">총 수강생</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'consultation',
    name: '상담 관리',
    icon: MessageSquare,
    color: 'amber',
    badge: '자동화',
    description: '상담 신청 접수부터 등록까지 전 과정을 자동화하세요.',
    highlights: ['온라인 상담 신청', '상담 일정 관리', '자동 알림 발송', '상담 이력 추적'],
    mockUI: (
      <div className="space-y-3">
        <div className="rounded-lg bg-white p-4 shadow-lg">
          <p className="font-semibold mb-3">이번 주 상담</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-amber-50">
              <div className="h-8 w-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-medium text-sm">
                박
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">박지수 학부모</p>
                <p className="text-xs text-muted-foreground">수학 수강 상담</p>
              </div>
              <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded">오늘 14:00</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium text-sm">
                이
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">이서연 학부모</p>
                <p className="text-xs text-muted-foreground">영어 레벨테스트</p>
              </div>
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">내일 10:00</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-white p-2 shadow-lg text-center">
            <p className="text-lg font-bold text-amber-600">5</p>
            <p className="text-xs text-muted-foreground">대기</p>
          </div>
          <div className="rounded-lg bg-white p-2 shadow-lg text-center">
            <p className="text-lg font-bold text-green-600">12</p>
            <p className="text-xs text-muted-foreground">완료</p>
          </div>
          <div className="rounded-lg bg-white p-2 shadow-lg text-center">
            <p className="text-lg font-bold text-blue-600">80%</p>
            <p className="text-xs text-muted-foreground">등록률</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'billing',
    name: '매출 정산',
    icon: CreditCard,
    color: 'emerald',
    badge: '자동',
    description: '수강료 자동 계산, 미납 관리, 정산 리포트까지 한 번에.',
    highlights: ['수강료 자동 계산', '미납 관리', '결제 알림', '매출 리포트'],
    mockUI: (
      <div className="space-y-3">
        <div className="rounded-lg bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold">이번 달 매출</p>
            <span className="text-xs text-muted-foreground">2024년 1월</span>
          </div>
          <p className="text-3xl font-bold text-emerald-600 mb-2">₩12,450,000</p>
          <div className="flex items-center gap-1 text-sm text-green-600">
            <TrendingUp className="h-4 w-4" />
            <span>전월 대비 +8.5%</span>
          </div>
        </div>
        <div className="rounded-lg bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">결제 현황</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">결제 완료</span>
              <span className="font-medium text-green-600">45건</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">미납</span>
              <span className="font-medium text-red-600">3건</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">환불</span>
              <span className="font-medium text-gray-600">1건</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'ai-report',
    name: 'AI 리포트',
    icon: Sparkles,
    color: 'violet',
    badge: 'AI',
    description: 'AI가 수업 내용을 분석해 학부모 리포트를 자동 생성합니다.',
    highlights: ['수업 내용 자동 분석', '학습 피드백 생성', '학부모 리포트', '성적 추이 분석'],
    mockUI: (
      <div className="space-y-3">
        <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-4 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5" />
            <p className="font-semibold">AI 학습 리포트</p>
          </div>
          <p className="text-sm opacity-90 mb-2">김민준 학생 · 1월 2주차</p>
          <div className="rounded-lg bg-white/20 p-3 text-sm">
            "이번 주 수학 수업에서 이차방정식 풀이 능력이 크게 향상되었습니다. 특히 근의 공식 활용에서..."
          </div>
        </div>
        <div className="rounded-lg bg-white p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-violet-500" />
            <p className="text-sm font-medium">자동 생성 리포트</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">이번 주 생성</span>
              <span className="font-medium">24건</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">발송 완료</span>
              <span className="font-medium text-green-600">22건</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'seats',
    name: '좌석 관리',
    icon: Armchair,
    color: 'cyan',
    badge: '실시간',
    description: '실시간 좌석 현황 확인과 자동 배정으로 효율적인 공간 관리.',
    highlights: ['실시간 좌석 현황', '자동 좌석 배정', '이용권 관리', '연장 알림'],
    mockUI: (
      <div className="space-y-3">
        <div className="rounded-lg bg-white p-4 shadow-lg">
          <p className="font-semibold mb-3">좌석 현황</p>
          <div className="grid grid-cols-5 gap-1 mb-3">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-8 rounded flex items-center justify-center text-xs font-medium',
                  i < 14
                    ? 'bg-cyan-100 text-cyan-700'
                    : i < 18
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-yellow-100 text-yellow-700'
                )}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-cyan-100" />
              <span>사용중 14</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-gray-100" />
              <span>빈자리 4</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-yellow-100" />
              <span>예약 2</span>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <p className="text-sm font-medium">연장 알림</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">3번 좌석 · 30분 후 종료 예정</p>
        </div>
      </div>
    ),
  },
  {
    id: 'schedule',
    name: '강사 시간표',
    icon: CalendarDays,
    color: 'rose',
    badge: '자동화',
    description: '강사별 시간표 자동 생성과 충돌 방지로 효율적인 스케줄 관리.',
    highlights: ['시간표 자동 생성', '충돌 자동 감지', '대체 강사 관리', '급여 자동 계산'],
    mockUI: (
      <div className="space-y-3">
        <div className="rounded-lg bg-white p-4 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-rose-500 flex items-center justify-center text-white font-bold">
              김
            </div>
            <div>
              <p className="font-semibold">김선생님</p>
              <p className="text-xs text-muted-foreground">수학 · 이번 주 18시간</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-12 text-xs text-muted-foreground">월</div>
              <div className="flex-1 h-6 rounded bg-rose-100 flex items-center px-2 text-xs text-rose-700">
                14:00-18:00
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-12 text-xs text-muted-foreground">화</div>
              <div className="flex-1 h-6 rounded bg-rose-100 flex items-center px-2 text-xs text-rose-700">
                16:00-20:00
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-12 text-xs text-muted-foreground">수</div>
              <div className="flex-1 h-6 rounded bg-gray-50 flex items-center px-2 text-xs text-gray-400">
                휴무
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white p-2 shadow-lg text-center">
            <p className="text-lg font-bold text-rose-600">5</p>
            <p className="text-xs text-muted-foreground">전체 강사</p>
          </div>
          <div className="rounded-lg bg-white p-2 shadow-lg text-center">
            <p className="text-lg font-bold text-green-600">0</p>
            <p className="text-xs text-muted-foreground">충돌</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'notification',
    name: '실시간 알림',
    icon: Bell,
    color: 'orange',
    badge: '즉시',
    description: '출결, 상담, 결제 등 중요 이벤트를 실시간으로 알려드립니다.',
    highlights: ['출결 알림', '결제 알림', '상담 리마인더', '커스텀 알림'],
    mockUI: (
      <div className="space-y-3">
        <div className="rounded-lg bg-white p-4 shadow-lg">
          <p className="font-semibold mb-3">최근 알림</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <CheckSquare className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm">김민준 학생이 체크인했습니다</p>
                <p className="text-xs text-muted-foreground">방금 전</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm">수강료 결제가 완료되었습니다</p>
                <p className="text-xs text-muted-foreground">5분 전</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <MessageSquare className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm">새로운 상담 신청이 있습니다</p>
                <p className="text-xs text-muted-foreground">30분 전</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'dashboard',
    name: '통합 대시보드',
    icon: LayoutDashboard,
    color: 'slate',
    badge: '한눈에',
    description: '운영 현황을 한눈에 파악하고 데이터 기반 의사결정을 하세요.',
    highlights: ['실시간 현황', '매출 추이', '출결 통계', '상담 일정'],
    mockUI: (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white p-3 shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-muted-foreground">총 학생</p>
            </div>
            <p className="text-xl font-bold">156</p>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-500" />
              <p className="text-xs text-muted-foreground">이번 달 매출</p>
            </div>
            <p className="text-xl font-bold">₩12.4M</p>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckSquare className="h-4 w-4 text-emerald-500" />
              <p className="text-xs text-muted-foreground">출석률</p>
            </div>
            <p className="text-xl font-bold">94%</p>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-muted-foreground">상담 대기</p>
            </div>
            <p className="text-xl font-bold">5</p>
          </div>
        </div>
        <div className="rounded-lg bg-white p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">매출 추이</p>
          <div className="flex items-end gap-1 h-16">
            {[40, 55, 45, 60, 75, 65, 80].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>월</span>
            <span>화</span>
            <span>수</span>
            <span>목</span>
            <span>금</span>
            <span>토</span>
            <span>일</span>
          </div>
        </div>
      </div>
    ),
  },
]

const colorMap: Record<string, { bg: string; text: string; light: string; gradient: string }> = {
  blue: { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50', gradient: 'from-blue-100 to-blue-200' },
  green: { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50', gradient: 'from-green-100 to-green-200' },
  indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-50', gradient: 'from-indigo-100 to-indigo-200' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50', gradient: 'from-amber-100 to-amber-200' },
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50', gradient: 'from-emerald-100 to-emerald-200' },
  violet: { bg: 'bg-violet-500', text: 'text-violet-600', light: 'bg-violet-50', gradient: 'from-violet-100 to-violet-200' },
  cyan: { bg: 'bg-cyan-500', text: 'text-cyan-600', light: 'bg-cyan-50', gradient: 'from-cyan-100 to-cyan-200' },
  rose: { bg: 'bg-rose-500', text: 'text-rose-600', light: 'bg-rose-50', gradient: 'from-rose-100 to-rose-200' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50', gradient: 'from-orange-100 to-orange-200' },
  slate: { bg: 'bg-slate-500', text: 'text-slate-600', light: 'bg-slate-50', gradient: 'from-slate-100 to-slate-200' },
}

export function FeatureShowcase() {
  const [activeFeature, setActiveFeature] = useState(features[0])
  const colors = colorMap[activeFeature.color]

  return (
    <section id="showcase" className="py-24">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold sm:text-4xl mb-4">
            핵심 기능 살펴보기
          </h2>
          <p className="text-lg text-muted-foreground flex items-center justify-center gap-1">
            <img src="https://ipqhhqduppzvsqwwzjkp.supabase.co/storage/v1/object/public/logos/goldpen.png" alt="GoldPen" className="h-6 inline-block" />이 제공하는 10가지 핵심 기능을 확인해보세요
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {features.map((feature) => {
            const fColors = colorMap[feature.color]
            const isActive = activeFeature.id === feature.id
            return (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(feature)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                  isActive
                    ? `${fColors.bg} text-white shadow-lg`
                    : `${fColors.light} ${fColors.text} hover:shadow-md`
                )}
              >
                <feature.icon className="h-4 w-4" />
                {feature.name}
              </button>
            )
          })}
        </div>

        {/* Feature detail */}
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <div className={cn('inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-6', colors.light, colors.text)}>
              <activeFeature.icon className="h-4 w-4" />
              {activeFeature.badge}
            </div>
            <h3 className="text-3xl font-bold sm:text-4xl mb-4">
              {activeFeature.name}
            </h3>
            <p className="text-lg text-muted-foreground mb-8">
              {activeFeature.description}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {activeFeature.highlights.map((highlight) => (
                <div
                  key={highlight}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3"
                >
                  <div className={cn('rounded-lg p-1.5', colors.light)}>
                    <CheckCircle2 className={cn('h-4 w-4', colors.text)} />
                  </div>
                  <span className="text-sm font-medium">{highlight}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className={cn('aspect-square rounded-2xl bg-gradient-to-br p-8 flex items-center justify-center', colors.gradient)}>
              <div className="w-full max-w-sm">
                {activeFeature.mockUI}
              </div>
            </div>
            {/* Decorative */}
            <div className={cn('absolute -top-4 -right-4 h-24 w-24 rounded-full blur-2xl', colors.light)} />
            <div className={cn('absolute -bottom-4 -left-4 h-32 w-32 rounded-full blur-2xl opacity-50', colors.light)} />
          </div>
        </div>
      </div>
    </section>
  )
}
