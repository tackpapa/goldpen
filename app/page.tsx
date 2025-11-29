export const runtime = 'edge'

import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  MessageSquare,
  CheckSquare,
  UserCheck,
  CalendarDays,
  DoorOpen,
  Armchair,
  CreditCard,
  Wallet,
  Settings,
  Activity,
  ChevronRight,
  Sparkles,
  Zap,
  Shield,
  Clock,
  BarChart3,
  Bell,
  Grid3x3,
} from 'lucide-react'
import { FeatureShowcase } from '@/components/landing/FeatureShowcase'

// 타겟별 기능 그룹
const targetSolutions = [
  {
    id: 'academy',
    title: '학원',
    subtitle: '체계적인 학원 운영의 시작',
    description: '학생 관리부터 수업, 출결, 정산까지 학원 운영에 필요한 모든 기능을 제공합니다.',
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600',
    bgGradient: 'from-blue-50 to-blue-100',
    features: [
      { icon: Users, name: '학생 관리', desc: '학생 정보, 수강 이력, 학습 현황' },
      { icon: BookOpen, name: '수업/반 관리', desc: '반별 커리큘럼, 수업 일정' },
      { icon: UserCheck, name: '강사 관리', desc: '강사 배정, 급여 정산' },
      { icon: CalendarDays, name: '강사 시간표', desc: '시간표 자동 생성' },
      { icon: Grid3x3, name: '전체 스케줄', desc: '한눈에 보는 모든 수업' },
      { icon: CheckSquare, name: '출결 관리', desc: '실시간 출결 체크, 알림' },
    ],
  },
  {
    id: 'studyroom',
    title: '독서실',
    subtitle: '스마트한 독서실 관리',
    description: '좌석 배정, 출입 관리, 이용권 결제까지 독서실 운영을 자동화합니다.',
    color: 'green',
    gradient: 'from-green-500 to-green-600',
    bgGradient: 'from-green-50 to-green-100',
    features: [
      { icon: Armchair, name: '좌석 관리', desc: '실시간 좌석 현황, 배정' },
      { icon: CheckSquare, name: '출결 관리', desc: 'QR/앱 체크인, 자동 체크아웃' },
      { icon: DoorOpen, name: '교실 스케줄', desc: '열람실/스터디룸 예약' },
      { icon: Users, name: '회원 관리', desc: '이용권, 잔여 시간 관리' },
      { icon: CreditCard, name: '매출 정산', desc: '이용료, 연체료 자동 계산' },
      { icon: Bell, name: '알림 발송', desc: '입퇴실, 연장 안내' },
    ],
  },
  {
    id: 'studycafe',
    title: '공부방',
    subtitle: '소규모 맞춤 관리',
    description: '공부방, 과외방에 최적화된 간편하고 효율적인 관리 시스템입니다.',
    color: 'orange',
    gradient: 'from-orange-500 to-orange-600',
    bgGradient: 'from-orange-50 to-orange-100',
    features: [
      { icon: Users, name: '학생 관리', desc: '소수 정예 맞춤 관리' },
      { icon: Armchair, name: '좌석 배정', desc: '지정석 / 자유석 관리' },
      { icon: CheckSquare, name: '출결 관리', desc: '간편 출결 체크' },
      { icon: MessageSquare, name: '상담 관리', desc: '학부모 상담 일정' },
      { icon: Wallet, name: '지출 정산', desc: '운영비 관리' },
      { icon: CreditCard, name: '매출 정산', desc: '수강료 관리' },
    ],
  },
]

// 공통 기능
const commonFeatures = [
  {
    icon: LayoutDashboard,
    title: '통합 대시보드',
    description: '한눈에 보는 운영 현황. 출결률, 매출, 상담 일정을 한 화면에서 확인하세요.',
  },
  {
    icon: MessageSquare,
    title: '상담 관리',
    description: '상담 신청 접수부터 등록까지. 상담 일정 관리와 자동 알림을 제공합니다.',
  },
  {
    icon: CreditCard,
    title: '매출 정산',
    description: '수강료, 이용료 자동 계산. 미납 관리와 정산 리포트를 생성합니다.',
  },
  {
    icon: Wallet,
    title: '지출 정산',
    description: '운영비, 인건비 관리. 수입/지출 내역을 한눈에 파악하세요.',
  },
  {
    icon: Settings,
    title: '맞춤 설정',
    description: '우리 기관에 맞는 메뉴 구성. 필요한 기능만 활성화하세요.',
  },
  {
    icon: Activity,
    title: '활동 로그',
    description: '모든 활동 기록 추적. 누가, 언제, 무엇을 했는지 확인하세요.',
  },
]

// 핵심 가치
const coreValues = [
  {
    icon: Zap,
    title: '업무 자동화',
    description: '반복되는 출결 체크, 알림 발송, 정산 작업을 자동화합니다.',
  },
  {
    icon: BarChart3,
    title: '데이터 기반 운영',
    description: '출결률, 매출 추이, 학생 현황을 데이터로 분석합니다.',
  },
  {
    icon: Sparkles,
    title: 'AI 피드백',
    description: 'AI가 수업 내용을 분석해 학부모 리포트를 자동 생성합니다.',
  },
  {
    icon: Shield,
    title: '안전한 데이터',
    description: '학생 정보를 안전하게 보호하고 기관별로 분리 관리합니다.',
  },
  {
    icon: Clock,
    title: '24시간 운영',
    description: '언제 어디서든 모바일로 접속해 운영 현황을 확인하세요.',
  },
  {
    icon: Bell,
    title: '실시간 알림',
    description: '출결, 상담, 결제 등 중요한 이벤트를 실시간으로 알려드립니다.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center">
            <img
              src="https://ipqhhqduppzvsqwwzjkp.supabase.co/storage/v1/object/public/logos/goldpen.png"
              alt="GoldPen"
              className="h-10"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#solutions" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              솔루션
            </a>
            <a href="#showcase" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              핵심기능
            </a>
            <a href="#teacher" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              출결/좌석
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              무료 시작
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="container relative py-24 md:py-32 lg:py-40">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              AI 기반 학습 리포트 자동 생성
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              진짜 쉬운 거 써보세요
              <br />
              <span className="text-blue-600">학원, 스까 운영엔 골드펜</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
              학원, 독서실, 공부방 운영에 필요한 모든 것.
              <br className="hidden sm:block" />
              출결부터 정산까지 하나의 플랫폼에서 관리하세요.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:shadow-xl"
              >
                무료로 시작하기
              </Link>
              <Link
                href="/api/auth/demo"
                className="w-full sm:w-auto rounded-lg border border-input bg-background px-8 py-3 text-base font-semibold hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                데모사이트 보기
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              말이 필요없어요, 직접보세요
            </p>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </section>

      {/* Target Solutions */}
      <section id="solutions" className="py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">우리 기관에 맞는 솔루션</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              학원, 독서실, 공부방 각각에 최적화된 기능을 제공합니다
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {targetSolutions.map((solution) => (
              <div
                key={solution.id}
                className="group relative rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-lg"
              >
                <div className={`inline-flex rounded-xl bg-gradient-to-r ${solution.gradient} p-3 text-white mb-6`}>
                  <span className="text-2xl font-bold">{solution.title}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{solution.subtitle}</h3>
                <p className="text-muted-foreground mb-6">{solution.description}</p>

                <div className="space-y-4">
                  {solution.features.map((feature) => (
                    <div key={feature.name} className="flex items-start gap-3">
                      <div className={`rounded-lg bg-gradient-to-r ${solution.bgGradient} p-2`}>
                        <feature.icon className={`h-4 w-4 text-${solution.color}-600`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{feature.name}</p>
                        <p className="text-xs text-muted-foreground">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  href="/signup"
                  className={`mt-8 flex items-center justify-center gap-2 w-full rounded-lg bg-gradient-to-r ${solution.gradient} px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90`}
                >
                  {solution.title}용 시작하기
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Showcase - 10가지 핵심 기능 */}
      <FeatureShowcase />

      {/* Core Values */}
      <section className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">왜 GoldPen인가요?</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              단순한 관리 도구를 넘어, 운영 효율을 혁신합니다
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {coreValues.map((value) => (
              <div
                key={value.title}
                className="group relative rounded-xl border bg-card p-6 transition-all hover:shadow-md"
              >
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <value.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Common Features */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">모든 기관이 사용하는 핵심 기능</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              학원, 독서실, 공부방 모두에서 활용할 수 있는 공통 기능입니다
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {commonFeatures.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-4 rounded-xl border bg-card p-6 transition-all hover:shadow-md"
              >
                <div className="shrink-0 rounded-lg bg-primary/10 p-3">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Attendance & Seats Management */}
      <section id="teacher" className="py-24">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-100 to-green-100 px-4 py-1.5 text-sm font-medium text-gray-700 mb-6">
              <CheckSquare className="h-4 w-4 text-blue-600" />
              실시간 출결 & 실시간 좌석 관리
            </div>
            <h2 className="text-3xl font-bold sm:text-4xl mb-4">
              현장에서 바로 확인하는
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                스마트 운영 시스템
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              학생 체크인부터 좌석 현황까지, 한눈에 파악하고 실시간으로 관리하세요.
            </p>
          </div>

          {/* 50% 50% Split Mock UI */}
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Left: Live Attendance Check-in */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/screenshots/liveattendance.png"
                alt="실시간 출결 체크 화면"
                className="w-full h-auto object-cover"
              />
              {/* Label */}
              <div className="absolute top-4 left-4 bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
                실시간 출결 체크
              </div>
            </div>

            {/* Right: Seats Management */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/screenshots/seats.png"
                alt="독서실 좌석 관리 화면"
                className="w-full h-auto object-cover"
              />
              {/* Label */}
              <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
                독서실 좌석 관리
              </div>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <div className="rounded-lg bg-blue-100 p-2">
                <CheckSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">터치 한 번으로 출석</p>
                <p className="text-xs text-muted-foreground">4자리 번호 입력으로 즉시 체크인</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <div className="rounded-lg bg-green-100 p-2">
                <Armchair className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">실시간 좌석 현황</p>
                <p className="text-xs text-muted-foreground">등원/하원/외출 상태 즉시 확인</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <div className="rounded-lg bg-orange-100 p-2">
                <Bell className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-sm">자동 알림 발송</p>
                <p className="text-xs text-muted-foreground">입퇴실 시 학부모 알림 자동 전송</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <div className="rounded-lg bg-purple-100 p-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-sm">이용 시간 분석</p>
                <p className="text-xs text-muted-foreground">학생별 이용 패턴 통계 제공</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center text-primary-foreground">
            <h2 className="text-3xl font-bold sm:text-4xl mb-4">
              지금 바로 시작하세요
            </h2>
            <p className="text-lg opacity-90 mb-8">
              복잡한 설정 없이 5분 만에 시작할 수 있습니다.
              <br />
              우리 기관에 맞게 필요한 기능만 선택하세요.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto rounded-lg bg-white px-8 py-3 text-base font-semibold text-primary shadow-lg hover:bg-white/90 transition-all"
              >
                무료로 시작하기
              </Link>
              <Link
                href="/consultation/new"
                className="w-full sm:w-auto rounded-lg border border-white/30 bg-white/10 px-8 py-3 text-base font-semibold text-white hover:bg-white/20 transition-colors"
              >
                도입 상담 받기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="container">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center mb-4">
                <img
                  src="https://ipqhhqduppzvsqwwzjkp.supabase.co/storage/v1/object/public/logos/goldpen.png"
                  alt="GoldPen"
                  className="h-10"
                />
              </Link>
              <p className="text-sm text-muted-foreground">
                학원/러닝센터/스터디카페
                <br />
                통합 운영 시스템
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">솔루션</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">학원용</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">독서실용</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">공부방용</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">강사용</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">고객지원</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/consultation/new" className="hover:text-foreground transition-colors">도입 상담</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">사용 가이드</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">자주 묻는 질문</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">문의하기</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">회사</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">회사 소개</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">이용약관</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">개인정보처리방침</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 GoldPen. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
