#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs'

// "데이터 없음"이라고 보고된 페이지들
const pendingPages = [
  { page: 'Exams', path: 'app/[institutionname]/(dashboard)/exams/page.tsx' },
  { page: 'Lessons', path: 'app/[institutionname]/(dashboard)/lessons/page.tsx' },
  { page: 'Rooms', path: 'app/[institutionname]/(dashboard)/rooms/page.tsx' },
  { page: 'Seats', path: 'app/[institutionname]/(dashboard)/seats/page.tsx' },
  { page: 'Expenses', path: 'app/[institutionname]/(dashboard)/expenses/page.tsx' },
  { page: 'Billing', path: 'app/[institutionname]/(dashboard)/billing/page.tsx' },
  { page: 'Waitlist', path: 'app/[institutionname]/(dashboard)/waitlist/page.tsx' },
  { page: 'Schedules', path: 'app/[institutionname]/(dashboard)/schedules/page.tsx' },
]

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🔍 Mock 데이터 사용 여부 검증')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

const results = {
  mockOnly: [],
  dbOnly: [],
  hybrid: [],
  notFound: []
}

for (const { page, path } of pendingPages) {
  console.log(`\n━━━ ${page} ━━━`)

  if (!existsSync(path)) {
    console.log(`   ❌ 파일을 찾을 수 없음: ${path}`)
    results.notFound.push(page)
    continue
  }

  const content = readFileSync(path, 'utf-8')

  // Mock 데이터 패턴 확인
  const hasMockData = content.includes('// Mock') ||
                      content.includes('//Mock') ||
                      content.includes('const mock') ||
                      content.includes('mockData') ||
                      content.includes('Mock data')

  // Supabase/DB 쿼리 패턴 확인
  const hasDbQuery = content.includes('supabase.from') ||
                     content.includes('createClient') ||
                     content.includes('useQuery') ||
                     content.includes('useMutation') ||
                     content.includes('fetch(')

  let status = ''
  if (hasMockData && !hasDbQuery) {
    status = 'MOCK_ONLY'
    results.mockOnly.push(page)
  } else if (!hasMockData && hasDbQuery) {
    status = 'DB_ONLY'
    results.dbOnly.push(page)
  } else if (hasMockData && hasDbQuery) {
    status = 'HYBRID'
    results.hybrid.push(page)
  } else {
    status = 'UNKNOWN'
  }

  console.log(`   Mock 데이터: ${hasMockData ? '✅ 있음' : '❌ 없음'}`)
  console.log(`   DB 쿼리: ${hasDbQuery ? '✅ 있음' : '❌ 없음'}`)
  console.log(`   🎯 결론: ${status}`)

  // Mock 데이터가 있으면 샘플 추출
  if (hasMockData) {
    const mockMatch = content.match(/const mock\w+.*?=.*?\[[\s\S]{0,500}\]/m)
    if (mockMatch) {
      console.log(`\n   📋 Mock 데이터 샘플:`)
      console.log(`   ${mockMatch[0].substring(0, 300)}...`)
    }
  }
}

// Final Summary
console.log(`\n\n${'━'.repeat(70)}`)
console.log('📊 최종 분석 결과')
console.log(`${'━'.repeat(70)}\n`)

console.log(`✅ MOCK_ONLY (Mock 데이터만 사용): ${results.mockOnly.length}개`)
results.mockOnly.forEach(page => {
  console.log(`   - ${page}`)
})

console.log(`\n🔵 DB_ONLY (DB 쿼리만 사용): ${results.dbOnly.length}개`)
results.dbOnly.forEach(page => {
  console.log(`   - ${page}`)
})

console.log(`\n🟡 HYBRID (Mock + DB 혼용): ${results.hybrid.length}개`)
results.hybrid.forEach(page => {
  console.log(`   - ${page}`)
})

if (results.notFound.length > 0) {
  console.log(`\n❌ 파일 없음: ${results.notFound.length}개`)
  results.notFound.forEach(page => {
    console.log(`   - ${page}`)
  })
}

console.log(`\n${'━'.repeat(70)}`)
console.log(`\n🎯 핵심 발견:`)
console.log(`   - ${results.mockOnly.length}개 페이지는 Mock 데이터로 작동 중 (DB 불필요)`)
console.log(`   - ${results.dbOnly.length}개 페이지는 DB 데이터 필요 (시딩 필요)`)
console.log(`   - ${results.hybrid.length}개 페이지는 Mock → DB 전환 준비 중\n`)
