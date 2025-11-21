#!/usr/bin/env node
import { PrismaClient } from '@prisma/client'

const DATABASE_URL = "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
})

const DEMO_ORG_ID = 'dddd0000-0000-0000-0000-000000000000'

// mockData.ts의 모든 데이터 구조를 페이지/섹션별로 매핑
const PAGE_DATA_MAPPING = {
  // Admin Dashboard Pages
  'admin_dashboard': {
    name: 'Admin 대시보드',
    requiredData: ['organizations', 'users', 'audit_logs'],
    mockData: ['stats (admin)'],
    tables: ['organizations', 'users', 'audit_logs']
  },
  'admin_organizations': {
    name: 'Admin 조직 관리',
    requiredData: ['organizations'],
    mockData: [],
    tables: ['organizations']
  },
  'admin_users': {
    name: 'Admin 사용자 관리',
    requiredData: ['users'],
    mockData: [],
    tables: ['users']
  },
  'admin_audit_logs': {
    name: 'Admin 감사 로그',
    requiredData: ['audit_logs'],
    mockData: [],
    tables: ['audit_logs']
  },
  'admin_settings': {
    name: 'Admin 설정',
    tabs: ['general', 'email', 'security', 'features'],
    requiredData: ['org_settings'],
    mockData: ['settings (hardcoded)'],
    tables: ['org_settings']
  },

  // Dashboard Pages (Organization Level) - mockData에서 발견된 모든 데이터 소스
  'overview_page': {
    name: 'Overview (대시보드 메인)',
    requiredData: [
      'revenueData',
      'studentTrendData',
      'attendanceData',
      'todayClasses',
      'stats',
      'recentActivities',
      'announcements',
      'gradeDistribution',
      'upcomingConsultations',
      'conversionData',
      'classCapacity'
    ],
    mockData: ['All from mockData.ts'],
    tables: ['classes', 'students', 'teachers', 'consultations', 'attendance']
  },
  'classes_page': {
    name: 'Classes (수업 관리)',
    requiredData: ['todayClasses', 'classCapacity'],
    mockData: ['todayClasses', 'classCapacity'],
    tables: ['classes', 'teachers', 'students']
  },
  'students_page': {
    name: 'Students (학생 관리)',
    requiredData: ['students', 'gradeDistribution'],
    mockData: ['gradeDistribution'],
    tables: ['students']
  },
  'teachers_page': {
    name: 'Teachers (강사 관리)',
    requiredData: ['teachers', 'teacherStats'],
    mockData: ['teacherStats'],
    tables: ['teachers']
  },
  'consultations_page': {
    name: 'Consultations (상담 관리)',
    requiredData: ['upcomingConsultations', 'conversionData'],
    mockData: ['upcomingConsultations', 'conversionData'],
    tables: ['consultations', 'students']
  },
  'homework_page': {
    name: 'Homework (과제 관리)',
    requiredData: ['homeworkData', 'homeworkSubmission'],
    mockData: ['homeworkData', 'homeworkSubmission'],
    tables: ['homework', 'homework_submissions']
  },
  'exams_page': {
    name: 'Exams (시험 관리)',
    requiredData: ['examData', 'recentExams'],
    mockData: ['examData', 'recentExams'],
    tables: ['exams']
  },
  'attendance_page': {
    name: 'Attendance (출결 관리)',
    requiredData: ['todayAttendance', 'attendanceAlerts', 'attendanceData'],
    mockData: ['todayAttendance', 'attendanceAlerts', 'attendanceData'],
    tables: ['attendance', 'students']
  },
  'lessons_page': {
    name: 'Lessons (수업일지)',
    requiredData: ['lessonLogs', 'recentLessons'],
    mockData: ['lessonLogs', 'recentLessons'],
    tables: ['lessons']
  },
  'rooms_page': {
    name: 'Rooms (강의실 관리)',
    requiredData: ['roomUsage'],
    mockData: ['roomUsage'],
    tables: ['rooms', 'room_schedules']
  },
  'seats_page': {
    name: 'Seats (좌석 관리)',
    requiredData: ['seatStatus'],
    mockData: ['seatStatus'],
    tables: ['seats']
  },
  'expenses_page': {
    name: 'Expenses (지출 관리)',
    requiredData: ['expenseCategory', 'expenseTrend'],
    mockData: ['expenseCategory', 'expenseTrend'],
    tables: ['expenses', 'expense_categories']
  },
  'billing_page': {
    name: 'Billing (정산 관리)',
    requiredData: ['billing_records', 'teacher_salaries', 'transactions'],
    mockData: [],
    tables: ['billing_records', 'teacher_salaries', 'transactions']
  },
  'waitlist_page': {
    name: 'Waitlist (대기 명단)',
    requiredData: ['waitlists'],
    mockData: [],
    tables: ['waitlists']
  },
  'schedules_page': {
    name: 'Schedules (스케줄 관리)',
    requiredData: ['schedules'],
    mockData: [],
    tables: ['schedules']
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 Ultra Think: 전체 15+ 페이지/섹션 데이터 교차검증')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const allPages = Object.entries(PAGE_DATA_MAPPING)
  console.log(`📊 총 ${allPages.length}개 페이지/섹션 발견\n`)

  let totalPages = 0
  let pagesWithData = 0
  let pagesReady = 0
  let pagesPending = 0

  const results = []

  for (const [pageKey, page] of allPages) {
    totalPages++
    console.log(`\n${'='.repeat(70)}`)
    console.log(`📄 ${totalPages}. ${page.name}`)
    console.log(`${'='.repeat(70)}`)

    const pageResult = {
      name: page.name,
      status: 'unknown',
      dbTables: [],
      mockData: page.mockData || [],
      dataExists: {},
      missingTables: [],
      recommendation: ''
    }

    // Check database tables
    if (page.tables && page.tables.length > 0) {
      console.log(`\n📦 필요 테이블: ${page.tables.join(', ')}`)

      for (const tableName of page.tables) {
        try {
          // Use $queryRawUnsafe for dynamic table name, $queryRaw for parameters
          const count = await prisma.$queryRawUnsafe(
            `SELECT COUNT(*) as count FROM "${tableName}" WHERE org_id = $1::uuid`,
            DEMO_ORG_ID
          )
          const recordCount = parseInt(count[0].count)

          pageResult.dbTables.push({
            name: tableName,
            count: recordCount,
            exists: recordCount > 0
          })

          pageResult.dataExists[tableName] = recordCount > 0

          if (recordCount > 0) {
            console.log(`   ✅ ${tableName}: ${recordCount}건`)
          } else {
            console.log(`   ❌ ${tableName}: 데이터 없음`)
          }
        } catch (error) {
          console.log(`   ⚠️  ${tableName}: 테이블 없음 또는 org_id 컬럼 없음`)
          pageResult.missingTables.push(tableName)
          pageResult.dataExists[tableName] = false
        }
      }
    }

    // Check mock data
    if (page.mockData && page.mockData.length > 0) {
      console.log(`\n📝 Mock 데이터 사용: ${page.mockData.join(', ')}`)
      console.log(`   ℹ️  프론트엔드에서 처리 (DB 불필요)`)
    }

    // Determine status
    const hasData = page.tables && page.tables.length > 0
      ? page.tables.some(t => pageResult.dataExists[t] === true)
      : true  // No tables required = always ready

    const allTablesReady = page.tables && page.tables.length > 0
      ? page.tables.every(t => pageResult.dataExists[t] === true || pageResult.missingTables.includes(t))
      : true

    const mockOnly = (!page.tables || page.tables.length === 0) && page.mockData && page.mockData.length > 0

    if (mockOnly) {
      pageResult.status = 'MOCK_ONLY'
      pageResult.recommendation = 'Mock 데이터만 사용, DB 불필요'
      console.log(`\n💡 상태: MOCK_ONLY (DB 불필요)`)
    } else if (allTablesReady && hasData) {
      pageResult.status = 'READY'
      pageResult.recommendation = '모든 데이터 준비 완료'
      pagesReady++
      console.log(`\n✅ 상태: READY (100% 완료)`)
    } else if (hasData) {
      pageResult.status = 'PARTIAL'
      pageResult.recommendation = '일부 테이블 데이터 부족'
      pagesPending++
      console.log(`\n⚠️  상태: PARTIAL (일부 완료)`)
    } else {
      pageResult.status = 'PENDING'
      pageResult.recommendation = '데이터 시딩 필요'
      pagesPending++
      console.log(`\n❌ 상태: PENDING (시딩 필요)`)
    }

    if (hasData) pagesWithData++

    results.push(pageResult)
  }

  // Final Summary
  console.log(`\n\n${'━'.repeat(70)}`)
  console.log('📊 Ultra Think 최종 분석 결과')
  console.log(`${'━'.repeat(70)}\n`)

  console.log(`전체 페이지/섹션: ${totalPages}개\n`)

  console.log(`✅ READY (완료): ${pagesReady}개`)
  results.filter(r => r.status === 'READY').forEach(r => {
    console.log(`   - ${r.name}`)
  })

  console.log(`\n🔵 MOCK_ONLY (DB 불필요): ${results.filter(r => r.status === 'MOCK_ONLY').length}개`)
  results.filter(r => r.status === 'MOCK_ONLY').forEach(r => {
    console.log(`   - ${r.name}`)
  })

  console.log(`\n⚠️  PARTIAL/PENDING (작업 필요): ${pagesPending}개`)
  results.filter(r => r.status === 'PARTIAL' || r.status === 'PENDING').forEach(r => {
    console.log(`   - ${r.name}`)
    if (r.missingTables.length > 0) {
      console.log(`     누락 테이블: ${r.missingTables.join(', ')}`)
    }
  })

  const readyRate = ((pagesReady + results.filter(r => r.status === 'MOCK_ONLY').length) / totalPages * 100).toFixed(1)
  console.log(`\n📈 전체 준비율: ${readyRate}% (${pagesReady + results.filter(r => r.status === 'MOCK_ONLY').length}/${totalPages})`)

  console.log(`\n${'━'.repeat(70)}\n`)

  // Recommendations
  console.log('💡 권장 작업:\n')

  const pendingPages = results.filter(r => r.status === 'PENDING' || r.status === 'PARTIAL')
  if (pendingPages.length === 0) {
    console.log('   🎉 모든 페이지 데이터 준비 완료! 추가 작업 불필요\n')
  } else {
    pendingPages.forEach((r, idx) => {
      console.log(`   ${idx + 1}. ${r.name}`)
      console.log(`      ${r.recommendation}`)
      if (r.missingTables.length > 0) {
        console.log(`      테이블 생성 필요: ${r.missingTables.join(', ')}`)
      }
    })
    console.log()
  }

  console.log(`${'━'.repeat(70)}\n`)

  await prisma.$disconnect()
}

main().catch(error => {
  console.error('❌ 분석 실패:', error.message)
  process.exit(1)
})
