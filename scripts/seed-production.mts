#!/usr/bin/env node --loader ts-node/esm

/**
 * 프로덕션 Supabase DB에 Mock 데이터 직접 삽입
 * Postgres 직접 연결 방식 사용 (pg 라이브러리)
 */

import { readFileSync } from 'fs'
import pkg from 'pg'
const { Client } = pkg

// Supabase DB Connection String
// Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
const DB_URL = process.env.SUPABASE_DB_URL ||
  'postgresql://postgres.ipqhhqduppzvsqwwzjkp:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres'

console.log('🚀 프로덕션 Supabase DB 마이그레이션 시작...\n')

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    // 1. DB 연결
    console.log('📡 Postgres 연결 중...')
    await client.connect()
    console.log('✅ Postgres 연결 성공!\n')

    // 2. SQL 파일 읽기
    console.log('📄 SQL 파일 읽는 중...')
    const sql = readFileSync('supabase/migrations/20251121_comprehensive_seed_data.sql', 'utf-8')
    console.log(`✅ SQL 파일 로드 완료 (${(sql.length / 1024).toFixed(1)}KB)\n`)

    // 3. SQL 실행
    console.log('⚡ SQL 실행 중...')
    const startTime = Date.now()

    await client.query(sql)

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

    const result = await client.query(verifyQuery)

    console.log('┌──────────────────┬───────┐')
    console.log('│   Table Name     │ Count │')
    console.log('├──────────────────┼───────┤')
    result.rows.forEach(row => {
      console.log(`│ ${row.table_name.padEnd(16)} │ ${String(row.count).padStart(5)} │`)
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
    const gradeResult = await client.query(gradeQuery)

    gradeResult.rows.forEach(row => {
      console.log(`  ${row.grade_group}: ${row.count}명`)
    })

    console.log('\n✨ 마이그레이션 완료!\n')

  } catch (error: any) {
    console.error('\n❌ 오류 발생:', error.message)
    console.error('\n상세:', error.stack)
    process.exit(1)
  } finally {
    await client.end()
    console.log('🔌 Postgres 연결 종료\n')
  }
}

main().catch(console.error)
