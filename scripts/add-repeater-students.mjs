#!/usr/bin/env node

/**
 * 재수생 학생 추가
 */

import pg from 'pg'
const { Client } = pg

const DB_URL = "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

console.log('📦 재수생 학생 추가 중...\n')

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

    console.log('📊 재수생 데이터 삽입 중...')

    // 재수생 8명 추가
    await client.query(`
      INSERT INTO students (org_id, name, grade, phone, status, created_at) VALUES
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '김재수', '재수', '010-9001-0001', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '이다시', '재수', '010-9001-0002', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '박한번', '재수', '010-9001-0003', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '최또한', '재수', '010-9001-0004', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '정반드', '재수', '010-9001-0005', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '강시작', '재수', '010-9001-0006', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '조올해', '재수', '010-9001-0007', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '윤파이', '재수', '010-9001-0008', 'active', NOW())
    `)
    console.log('✅ 재수생 8명 추가 완료\n')

    // RLS 재활성화
    await client.query("SET session_replication_role = DEFAULT;")

    // 결과 확인
    const result = await client.query("SELECT COUNT(*) as count FROM students WHERE grade = '재수'")
    console.log(`📚 재수생: ${result.rows[0].count}명\n`)

    const total = await client.query("SELECT COUNT(*) as count FROM students")
    console.log(`📊 전체 학생: ${total.rows[0].count}명\n`)

  } catch (error) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  } finally {
    await client.end()
    console.log('🔌 Postgres 연결 종료\n')
  }
}

main().catch(console.error)
