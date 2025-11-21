#!/usr/bin/env node
/**
 * Add student_code column to students table
 * Run: node scripts/add-student-code-column.mjs
 */

import pg from 'pg'
const { Client } = pg

const DB_URL = process.env.SUPABASE_DB_URL ||
  "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

console.log('🚀 students 테이블에 student_code 컬럼 추가\n')

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Postgres 연결 성공!\n')

    // RLS 일시 비활성화
    await client.query("SET session_replication_role = replica;")

    // 1. student_code 컬럼 추가
    console.log('📦 student_code 컬럼 추가 중...')
    await client.query(`
      ALTER TABLE students
      ADD COLUMN IF NOT EXISTS student_code VARCHAR(10) UNIQUE;
    `)
    console.log('✅ student_code 컬럼 추가 완료\n')

    // 2. 기존 학생들에게 자동 코드 생성 (4자리 숫자)
    console.log('📦 기존 학생들에게 코드 자동 생성 중...')
    const { rows: students } = await client.query(`
      SELECT id FROM students WHERE student_code IS NULL;
    `)

    for (let i = 0; i < students.length; i++) {
      const code = String(1001 + i).padStart(4, '0')
      await client.query(`
        UPDATE students SET student_code = $1 WHERE id = $2;
      `, [code, students[i].id])
    }
    console.log(`✅ ${students.length}명의 학생에게 코드 할당 완료\n`)

    // 3. 인덱스 추가
    console.log('📦 인덱스 추가 중...')
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_students_student_code ON students(student_code);
    `)
    console.log('✅ 인덱스 추가 완료\n')

    // RLS 다시 활성화
    await client.query("SET session_replication_role = DEFAULT;")

    // Schema reload trigger
    await client.query("NOTIFY pgrst, 'reload schema'")
    console.log('✅ Schema reload triggered\n')

    console.log('🎉 student_code 컬럼 마이그레이션 완료!')

  } catch (error) {
    console.error('❌ 오류 발생:', error)
    throw error
  } finally {
    await client.end()
  }
}

main().catch(console.error)
