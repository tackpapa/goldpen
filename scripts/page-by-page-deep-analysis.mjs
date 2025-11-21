#!/usr/bin/env node
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'

const DATABASE_URL = "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
})

const DEMO_ORG_ID = 'dddd0000-0000-0000-0000-000000000000'

// 모든 대시보드 페이지 목록
const DASHBOARD_PAGES = [
  { name: 'Overview', path: 'app/[institutionname]/(dashboard)/overview/page.tsx', priority: 1 },
  { name: 'Classes', path: 'app/[institutionname]/(dashboard)/classes/page.tsx', priority: 1 },
  { name: 'Students', path: 'app/[institutionname]/(dashboard)/students/page.tsx', priority: 1 },
  { name: 'Teachers', path: 'app/[institutionname]/(dashboard)/teachers/page.tsx', priority: 1 },
  { name: 'Consultations', path: 'app/[institutionname]/(dashboard)/consultations/page.tsx', priority: 1 },
  { name: 'Homework', path: 'app/[institutionname]/(dashboard)/homework/page.tsx', priority: 1 },
  { name: 'Attendance', path: 'app/[institutionname]/(dashboard)/attendance/page.tsx', priority: 1 },
  { name: 'Exams', path: 'app/[institutionname]/(dashboard)/exams/page.tsx', priority: 2 },
  { name: 'Lessons', path: 'app/[institutionname]/(dashboard)/lessons/page.tsx', priority: 2 },
  { name: 'Rooms', path: 'app/[institutionname]/(dashboard)/rooms/page.tsx', priority: 2 },
  { name: 'Expenses', path: 'app/[institutionname]/(dashboard)/expenses/page.tsx', priority: 2 },
  { name: 'Seats', path: 'app/[institutionname]/(dashboard)/seats/page.tsx', priority: 2 },
  { name: 'Billing', path: 'app/[institutionname]/(dashboard)/billing/page.tsx', priority: 2 },
  { name: 'Schedule', path: 'app/[institutionname]/(dashboard)/schedule/page.tsx', priority: 3 },
  { name: 'Settings', path: 'app/[institutionname]/(dashboard)/settings/page.tsx', priority: 3 },
]

// 데이터 소스 패턴 감지 함수
function analyzeDataSource(content) {
  const hasMockData = content.includes('// Mock') ||
                      content.includes('//Mock') ||
                      content.includes('const mock') ||
                      content.includes('mockData') ||
                      content.includes('Mock data')

  const hasDbQuery = content.includes('supabase.from') ||
                     content.includes('createClient') ||
                     content.includes('useQuery') ||
                     content.includes('useMutation')

  // Supabase 쿼리에서 테이블명 추출
  const tableMatches = content.matchAll(/supabase\.from\(['"](\w+)['"]\)/g)
  const tables = [...new Set([...tableMatches].map(m => m[1]))]

  // Interface/Type 정의에서 필요한 필드 추출
  const interfaceMatches = content.match(/interface\s+\w+\s*\{[^}]+\}/g) || []
  const typeMatches = content.match(/type\s+\w+\s*=\s*\{[^}]+\}/g) || []

  return {
    hasMockData,
    hasDbQuery,
    tables,
    dataStructures: [...interfaceMatches, ...typeMatches]
  }
}

// 테이블 데이터 완전성 검증
async function checkTableCompleteness(tableName, orgId) {
  try {
    // 테이블 존재 여부 확인
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
      ) as exists
    `

    if (!tableExists[0].exists) {
      return { exists: false, count: 0, columns: [], sample: null }
    }

    // 컬럼 목록 확인
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName}
      ORDER BY ordinal_position
    `

    const columnNames = columns.map(c => c.column_name)
    const hasOrgId = columnNames.includes('org_id')

    // 데이터 개수 확인
    let count = 0
    let sample = null

    if (hasOrgId) {
      const countResult = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM "${tableName}" WHERE org_id = $1::uuid`,
        orgId
      )
      count = parseInt(countResult[0].count)

      if (count > 0) {
        sample = await prisma.$queryRawUnsafe(
          `SELECT * FROM "${tableName}" WHERE org_id = $1::uuid LIMIT 1`,
          orgId
        )
      }
    } else {
      const countResult = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM "${tableName}"`
      )
      count = parseInt(countResult[0].count)

      if (count > 0) {
        sample = await prisma.$queryRawUnsafe(
          `SELECT * FROM "${tableName}" LIMIT 1`
        )
      }
    }

    return {
      exists: true,
      hasOrgId,
      count,
      columns: columnNames,
      sample: sample ? sample[0] : null
    }

  } catch (error) {
    return { exists: false, error: error.message, count: 0, columns: [], sample: null }
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 Ultra Think: 페이지별 심층 데이터 분석 및 누락 데이터 발견')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const analysisResults = []
  const missedDataFindings = []

  for (const page of DASHBOARD_PAGES) {
    console.log(`\n${'═'.repeat(80)}`)
    console.log(`📄 ${page.name} 페이지 분석`)
    console.log(`${'═'.repeat(80)}`)
    console.log(`📁 경로: ${page.path}`)
    console.log(`🎯 우선순위: ${page.priority === 1 ? '높음 (DB 백엔드)' : page.priority === 2 ? '중간 (Mock/Hybrid)' : '낮음'}`)

    try {
      // 소스코드 읽기
      const content = readFileSync(page.path, 'utf-8')

      // 데이터 소스 분석
      const analysis = analyzeDataSource(content)

      console.log(`\n📊 데이터 소스 분석:`)
      console.log(`   Mock 데이터 사용: ${analysis.hasMockData ? '✅ 예' : '❌ 아니오'}`)
      console.log(`   DB 쿼리 사용: ${analysis.hasDbQuery ? '✅ 예' : '❌ 아니오'}`)

      if (analysis.tables.length > 0) {
        console.log(`\n🗄️  사용 중인 테이블: ${analysis.tables.join(', ')}`)

        // 각 테이블 완전성 검증
        for (const tableName of analysis.tables) {
          console.log(`\n   ━━━ ${tableName} 테이블 검증 ━━━`)

          const tableInfo = await checkTableCompleteness(tableName, DEMO_ORG_ID)

          if (!tableInfo.exists) {
            console.log(`   ❌ 테이블 없음${tableInfo.error ? ': ' + tableInfo.error : ''}`)
            missedDataFindings.push({
              page: page.name,
              table: tableName,
              issue: 'TABLE_MISSING',
              priority: page.priority
            })
          } else {
            console.log(`   ✅ 테이블 존재함`)
            console.log(`   org_id 컬럼: ${tableInfo.hasOrgId ? '✅' : '❌'}`)
            console.log(`   컬럼 개수: ${tableInfo.columns.length}개`)
            console.log(`   컬럼 목록: ${tableInfo.columns.join(', ')}`)
            console.log(`   데이터 개수: ${tableInfo.count}건`)

            if (tableInfo.count === 0) {
              console.log(`   ⚠️  데이터 없음 - 시딩 필요!`)
              missedDataFindings.push({
                page: page.name,
                table: tableName,
                issue: 'NO_DATA',
                columns: tableInfo.columns,
                priority: page.priority
              })
            } else {
              console.log(`   ✅ 데이터 있음`)

              // 샘플 데이터 표시
              if (tableInfo.sample) {
                console.log(`\n   📋 샘플 데이터:`)
                const sampleStr = JSON.stringify(tableInfo.sample, null, 2)
                const preview = sampleStr.substring(0, 300)
                console.log(`   ${preview}${sampleStr.length > 300 ? '...' : ''}`)
              }
            }
          }
        }
      } else {
        console.log(`\n🗄️  사용 중인 테이블: 없음 (Mock 데이터만 사용)`)
      }

      // 데이터 구조 분석
      if (analysis.dataStructures.length > 0) {
        console.log(`\n📐 데이터 구조 정의: ${analysis.dataStructures.length}개`)
        analysis.dataStructures.forEach((struct, idx) => {
          const preview = struct.substring(0, 200).replace(/\n/g, ' ')
          console.log(`   ${idx + 1}. ${preview}...`)
        })
      }

      // 페이지 상태 결정
      let status = 'UNKNOWN'
      let recommendation = ''

      if (analysis.hasMockData && !analysis.hasDbQuery) {
        status = 'MOCK_ONLY'
        recommendation = 'Mock 데이터만 사용. DB 마이그레이션 고려 필요'
      } else if (!analysis.hasMockData && analysis.hasDbQuery) {
        if (analysis.tables.length > 0) {
          const allTablesHaveData = await Promise.all(
            analysis.tables.map(async t => {
              const info = await checkTableCompleteness(t, DEMO_ORG_ID)
              return info.exists && info.count > 0
            })
          )

          if (allTablesHaveData.every(v => v)) {
            status = 'DB_COMPLETE'
            recommendation = 'DB 데이터 완전함. 추가 작업 불필요'
          } else {
            status = 'DB_INCOMPLETE'
            recommendation = '일부 테이블 데이터 부족. 시딩 필요'
          }
        }
      } else if (analysis.hasMockData && analysis.hasDbQuery) {
        status = 'HYBRID'
        recommendation = 'Mock + DB 혼용. DB 전환 작업 진행 중'
      }

      console.log(`\n💡 페이지 상태: ${status}`)
      console.log(`📝 권장 사항: ${recommendation}`)

      analysisResults.push({
        page: page.name,
        priority: page.priority,
        status,
        analysis,
        recommendation
      })

    } catch (error) {
      console.log(`\n❌ 분석 실패: ${error.message}`)
      analysisResults.push({
        page: page.name,
        priority: page.priority,
        status: 'ERROR',
        error: error.message
      })
    }
  }

  // 최종 요약
  console.log(`\n\n${'━'.repeat(80)}`)
  console.log('📊 최종 분석 결과 요약')
  console.log(`${'━'.repeat(80)}\n`)

  const dbComplete = analysisResults.filter(r => r.status === 'DB_COMPLETE')
  const dbIncomplete = analysisResults.filter(r => r.status === 'DB_INCOMPLETE')
  const mockOnly = analysisResults.filter(r => r.status === 'MOCK_ONLY')
  const hybrid = analysisResults.filter(r => r.status === 'HYBRID')
  const errors = analysisResults.filter(r => r.status === 'ERROR')

  console.log(`✅ DB 완전 (${dbComplete.length}개):`)
  dbComplete.forEach(r => console.log(`   - ${r.page}`))

  console.log(`\n⚠️  DB 불완전 (${dbIncomplete.length}개):`)
  dbIncomplete.forEach(r => console.log(`   - ${r.page}`))

  console.log(`\n📝 Mock 전용 (${mockOnly.length}개):`)
  mockOnly.forEach(r => console.log(`   - ${r.page}`))

  console.log(`\n🔄 Hybrid (${hybrid.length}개):`)
  hybrid.forEach(r => console.log(`   - ${r.page}`))

  if (errors.length > 0) {
    console.log(`\n❌ 오류 (${errors.length}개):`)
    errors.forEach(r => console.log(`   - ${r.page}: ${r.error}`))
  }

  // 누락 데이터 리포트
  console.log(`\n\n${'━'.repeat(80)}`)
  console.log('🔍 누락 데이터 발견 보고서')
  console.log(`${'━'.repeat(80)}\n`)

  if (missedDataFindings.length === 0) {
    console.log('🎉 모든 페이지 데이터 완전함! 누락 데이터 없음.\n')
  } else {
    console.log(`⚠️  총 ${missedDataFindings.length}개 데이터 이슈 발견\n`)

    // 우선순위별 정렬
    const sortedFindings = missedDataFindings.sort((a, b) => a.priority - b.priority)

    let currentPriority = -1
    for (const finding of sortedFindings) {
      if (finding.priority !== currentPriority) {
        currentPriority = finding.priority
        console.log(`\n🎯 우선순위 ${currentPriority} (${currentPriority === 1 ? '높음' : currentPriority === 2 ? '중간' : '낮음'}):`)
      }

      console.log(`\n   📄 ${finding.page} - ${finding.table}`)
      console.log(`      이슈: ${finding.issue === 'TABLE_MISSING' ? '테이블 없음' : '데이터 없음'}`)

      if (finding.columns) {
        console.log(`      필요 컬럼: ${finding.columns.join(', ')}`)
      }
    }

    // 마이그레이션/시딩 계획
    console.log(`\n\n${'━'.repeat(80)}`)
    console.log('📋 마이그레이션/시딩 작업 계획')
    console.log(`${'━'.repeat(80)}\n`)

    const tableMissing = sortedFindings.filter(f => f.issue === 'TABLE_MISSING')
    const dataMissing = sortedFindings.filter(f => f.issue === 'NO_DATA')

    if (tableMissing.length > 0) {
      console.log(`\n1️⃣  테이블 생성 필요 (${tableMissing.length}개):`)
      tableMissing.forEach((f, idx) => {
        console.log(`   ${idx + 1}. ${f.table} (${f.page} 페이지용)`)
      })
    }

    if (dataMissing.length > 0) {
      console.log(`\n2️⃣  데이터 시딩 필요 (${dataMissing.length}개):`)
      dataMissing.forEach((f, idx) => {
        console.log(`   ${idx + 1}. ${f.table} (${f.page} 페이지용)`)
        console.log(`      컬럼: ${f.columns.slice(0, 5).join(', ')}${f.columns.length > 5 ? '...' : ''}`)
      })
    }
  }

  console.log(`\n${'━'.repeat(80)}`)
  console.log('✅ 페이지별 심층 분석 완료\n')

  await prisma.$disconnect()
}

main().catch(error => {
  console.error('❌ 분석 실패:', error.message)
  console.error(error.stack)
  process.exit(1)
})
