#!/usr/bin/env node

/**
 * Prisma를 사용한 프로덕션 Supabase DB 마이그레이션
 * Connection Pooler를 통한 안전한 연결
 */

import { readFileSync } from 'fs'
import { PrismaClient } from '@prisma/client'

// Supabase Connection Pooler URL
// Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
const DB_URL = process.env.DATABASE_URL ||
  'postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true'

console.log('🚀 Prisma를 사용한 프로덕션 DB 마이그레이션 시작...\n')
console.log(`📍 Target: ${DB_URL.replace(/:[^:]*@/, ':****@')}\n`)

async function main() {
  // Prisma Client 초기화 (프로덕션 DB 연결)
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DB_URL
      }
    },
    log: ['error', 'warn']
  })

  try {
    // 1. DB 연결 확인
    console.log('📡 Prisma 연결 중...')
    await prisma.$connect()
    console.log('✅ Prisma 연결 성공!\n')

    // 2. SQL 파일 읽기
    console.log('📄 SQL 파일 읽는 중...')
    const sql = readFileSync('supabase/migrations/20251121_complete_migration_with_seed.sql', 'utf-8')
    console.log(`✅ SQL 파일 로드 완료 (${(sql.length / 1024).toFixed(1)}KB)\n`)

    // 3. SQL 실행 (Raw Query)
    console.log('⚡ SQL 실행 중...')
    const startTime = Date.now()

    // Prisma의 $executeRawUnsafe를 사용하여 전체 SQL 실행
    await prisma.$executeRawUnsafe(sql)

    const duration = Date.now() - startTime
    console.log(`✅ SQL 실행 완료 (${duration}ms)\n`)

    // 4. 결과 확인
    console.log('📊 데이터 검증 중...\n')

    const verifyQuery = `
      SELECT
        'users (teachers)' as table_name, COUNT(*) as count
      FROM users WHERE role = 'teacher'
      UNION ALL
      SELECT 'rooms', COUNT(*) FROM rooms
      UNION ALL
      SELECT 'students', COUNT(*) FROM students
      UNION ALL
      SELECT 'classes', COUNT(*) FROM classes
      ORDER BY table_name
    `

    const result = await prisma.$queryRawUnsafe(verifyQuery)

    console.log('┌──────────────────┬───────┐')
    console.log('│   Table Name     │ Count │')
    console.log('├──────────────────┼───────┤')
    result.forEach(row => {
      // BigInt를 Number로 변환
      const count = typeof row.count === 'bigint' ? Number(row.count) : row.count
      console.log(`│ ${String(row.table_name).padEnd(16)} │ ${String(count).padStart(5)} │`)
    })
    console.log('└──────────────────┴───────┘\n')

    // 5. 학년별 학생 분포 확인
    console.log('📊 학년별 학생 분포:\n')
    const gradeQuery = `
      SELECT
        CASE
          WHEN grade LIKE '초등%' THEN '초등'
          ELSE grade
        END as grade_group,
        COUNT(*) as count
      FROM students
      GROUP BY grade_group
      ORDER BY grade_group
    `
    const gradeResult = await prisma.$queryRawUnsafe(gradeQuery)

    gradeResult.forEach(row => {
      const count = typeof row.count === 'bigint' ? Number(row.count) : row.count
      console.log(`  ${row.grade_group}: ${count}명`)
    })

    console.log('\n✨ 마이그레이션 완료!\n')

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message)

    // Prisma 에러 상세 정보
    if (error.code) {
      console.error('   에러 코드:', error.code)
    }
    if (error.meta) {
      console.error('   메타 정보:', error.meta)
    }

    console.error('\n상세 스택:', error.stack)
    process.exit(1)

  } finally {
    await prisma.$disconnect()
    console.log('🔌 Prisma 연결 종료\n')
  }
}

main().catch(error => {
  console.error('❌ 치명적 오류:', error)
  process.exit(1)
})
