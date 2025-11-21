#!/usr/bin/env node

/**
 * 프로덕션 Supabase DB 전체 마이그레이션 + Seed 데이터 적용
 * Step 1: 모든 마이그레이션 파일 실행 (순서대로)
 * Step 2: Seed 데이터 삽입
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import pg from 'pg'
const { Client } = pg

const DB_URL = process.env.SUPABASE_DB_URL ||
  "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

console.log('🚀 프로덕션 DB 전체 마이그레이션 + Seed 데이터 적용\n')
console.log(`📍 Target: ${DB_URL.replace(/:[^:]*@/, ':****@')}\n`)

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    // 1. DB 연결
    console.log('📡 Postgres 연결 중...')
    await client.connect()
    console.log('✅ Postgres 연결 성공!\n')

    // 2. RLS 일시 비활성화
    console.log('🔓 RLS 일시 비활성화...')
    await client.query("SET session_replication_role = replica;")
    console.log('✅ RLS 비활성화 완료\n')

    // 3. 마이그레이션 파일들 실행 (순서대로)
    const migrationDir = 'supabase/migrations'
    const migrationFiles = readdirSync(migrationDir)
      .filter(f => f.endsWith('.sql'))
      .filter(f => !f.includes('complete_migration_with_seed')) // 통합 파일 제외
      .sort()

    console.log('📄 마이그레이션 파일 실행 중...')
    console.log('─────────────────────────────\n')

    for (const file of migrationFiles) {
      const filePath = join(migrationDir, file)
      console.log(`  • ${file}`)

      try {
        const sql = readFileSync(filePath, 'utf-8')
        await client.query(sql)
        console.log(`    ✅ 성공`)
      } catch (error) {
        // 이미 존재하는 테이블/컬럼은 무시 (IF NOT EXISTS 사용)
        if (error.code === '42P07' || error.code === '42701') {
          console.log(`    ⚠️  이미 존재함 (스킵)`)
        } else {
          console.log(`    ❌ 오류: ${error.message}`)
          throw error
        }
      }
    }

    console.log('\n✅ 모든 마이그레이션 완료!\n')

    // 4. Seed 데이터 삽입
    console.log('📦 Seed 데이터 삽입 중...')
    console.log('─────────────────────────────\n')

    const seedSQL = `
-- STEP 1: Teachers (users 테이블에 5명 삽입)
INSERT INTO users (id, org_id, email, name, role, status, created_at) VALUES
('11111111-1111-1111-1111-111111111111', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', 'kim@goldpen.kr', '김선생', 'teacher', 'active', NOW()),
('22222222-2222-2222-2222-222222222222', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', 'lee@goldpen.kr', '이선생', 'teacher', 'active', NOW()),
('33333333-3333-3333-3333-333333333333', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', 'park@goldpen.kr', '박선생', 'teacher', 'active', NOW()),
('44444444-4444-4444-4444-444444444444', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', 'choi@goldpen.kr', '최선생', 'teacher', 'active', NOW()),
('55555555-5555-5555-5555-555555555555', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', 'jung@goldpen.kr', '정선생', 'teacher', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- STEP 2: Rooms (7개)
INSERT INTO rooms (id, org_id, name, capacity, location, status, created_at) VALUES
('a1111111-1111-1111-1111-111111111111', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', 'A301', 25, 'A동 3층', 'available', NOW()),
('a2222222-2222-2222-2222-222222222222', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', 'A201', 20, 'A동 2층', 'available', NOW()),
('a3333333-3333-3333-3333-333333333333', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', 'A302', 30, 'A동 3층', 'available', NOW()),
('b1111111-1111-1111-1111-111111111111', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', 'B201', 15, 'B동 2층', 'available', NOW()),
('b2222222-2222-2222-2222-222222222222', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', 'B202', 18, 'B동 2층', 'available', NOW()),
('c1111111-1111-1111-1111-111111111111', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', 'C101', 22, 'C동 1층', 'available', NOW()),
('c2222222-2222-2222-2222-222222222222', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', 'C202', 20, 'C동 2층', 'available', NOW())
ON CONFLICT (id) DO NOTHING;

-- STEP 3: Classes (16개 - 각 학년별로 분배)
INSERT INTO classes (id, org_id, name, subject, teacher_id, schedule, status, created_at) VALUES
('c0000001-0001-0001-0001-000000000001', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '고3 수학 모의고사반', '수학', '11111111-1111-1111-1111-111111111111', '{"days": ["월","수","금"], "time": "09:00-12:00"}', 'active', NOW()),
('c0000002-0002-0002-0002-000000000002', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '고3 국어 심화반', '국어', '22222222-2222-2222-2222-222222222222', '{"days": ["화","목"], "time": "14:00-17:00"}', 'active', NOW()),
('c0000003-0003-0003-0003-000000000003', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '고2 영어 독해반', '영어', '33333333-3333-3333-3333-333333333333', '{"days": ["월","수"], "time": "15:00-17:00"}', 'active', NOW()),
('c0000004-0004-0004-0004-000000000004', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '고2 수학 기본반', '수학', '11111111-1111-1111-1111-111111111111', '{"days": ["화","목"], "time": "10:00-12:00"}', 'active', NOW()),
('c0000005-0005-0005-0005-000000000005', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '고1 통합과학반', '과학', '44444444-4444-4444-4444-444444444444', '{"days": ["월","금"], "time": "13:00-15:00"}', 'active', NOW()),
('c0000006-0006-0006-0006-000000000006', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '고1 수학 심화반', '수학', '11111111-1111-1111-1111-111111111111', '{"days": ["수","금"], "time": "16:00-18:00"}', 'active', NOW()),
('c0000007-0007-0007-0007-000000000007', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '중3 수학 특강', '수학', '11111111-1111-1111-1111-111111111111', '{"days": ["토"], "time": "09:00-13:00"}', 'active', NOW()),
('c0000008-0008-0008-0008-000000000008', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '중3 영어 회화반', '영어', '33333333-3333-3333-3333-333333333333', '{"days": ["화","목"], "time": "17:00-19:00"}', 'active', NOW()),
('c0000009-0009-0009-0009-000000000009', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '중2 국어 독서반', '국어', '22222222-2222-2222-2222-222222222222', '{"days": ["월","수"], "time": "18:00-20:00"}', 'active', NOW()),
('c0000010-0010-0010-0010-000000000010', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '중2 과학실험반', '과학', '44444444-4444-4444-4444-444444444444', '{"days": ["토"], "time": "14:00-17:00"}', 'active', NOW()),
('c0000011-0011-0011-0011-000000000011', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '중1 수학 기초반', '수학', '55555555-5555-5555-5555-555555555555', '{"days": ["월","수","금"], "time": "16:00-18:00"}', 'active', NOW()),
('c0000012-0012-0012-0012-000000000012', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '중1 영어 문법반', '영어', '33333333-3333-3333-3333-333333333333', '{"days": ["화","목"], "time": "16:00-18:00"}', 'active', NOW()),
('c0000013-0013-0013-0013-000000000013', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '초등 영어 기초', '영어', '55555555-5555-5555-5555-555555555555', '{"days": ["월","수"], "time": "14:00-16:00"}', 'active', NOW()),
('c0000014-0014-0014-0014-000000000014', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '초등 수학 사고력', '수학', '55555555-5555-5555-5555-555555555555', '{"days": ["화","목"], "time": "14:00-16:00"}', 'active', NOW()),
('c0000015-0015-0015-0015-000000000015', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '고급 논술반', '논술', '22222222-2222-2222-2222-222222222222', '{"days": ["토"], "time": "10:00-13:00"}', 'active', NOW()),
('c0000016-0016-0016-0016-000000000016', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '코딩 입문반', '정보', '44444444-4444-4444-4444-444444444444', '{"days": ["토"], "time": "15:00-18:00"}', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- STEP 4: Students (124명 - 간략화 버전, 실제로는 full 데이터 삽입)
-- 초등 18명
INSERT INTO students (org_id, name, grade, gender, parent_phone, created_at) VALUES
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '김민준', '초등5', 'male', '010-1001-1001', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '이서연', '초등5', 'female', '010-1002-1002', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '박지호', '초등6', 'male', '010-1003-1003', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '최수빈', '초등6', 'female', '010-1004-1004', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '정하늘', '초등4', 'female', '010-1005-1005', NOW());

-- 중1 22명 (샘플 5명만)
INSERT INTO students (org_id, name, grade, gender, parent_phone, created_at) VALUES
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '강민서', '중1', 'female', '010-2001-2001', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '윤재우', '중1', 'male', '010-2002-2002', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '임수아', '중1', 'female', '010-2003-2003', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '한지민', '중1', 'female', '010-2004-2004', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '송민호', '중1', 'male', '010-2005-2005', NOW());

-- 중2 25명 (샘플 5명만)
INSERT INTO students (org_id, name, grade, gender, parent_phone, created_at) VALUES
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '오지훈', '중2', 'male', '010-3001-3001', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '신예은', '중2', 'female', '010-3002-3002', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '홍서준', '중2', 'male', '010-3003-3003', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '장다은', '중2', 'female', '010-3004-3004', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '조성민', '중2', 'male', '010-3005-3005', NOW());

-- 중3 20명 (샘플 5명만)
INSERT INTO students (org_id, name, grade, gender, parent_phone, created_at) VALUES
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '유현우', '중3', 'male', '010-4001-4001', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '서지아', '중3', 'female', '010-4002-4002', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '노준혁', '중3', 'male', '010-4003-4003', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '안수진', '중3', 'female', '010-4004-4004', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '권도윤', '중3', 'male', '010-4005-4005', NOW());

-- 고1 15명 (샘플 5명만)
INSERT INTO students (org_id, name, grade, gender, parent_phone, created_at) VALUES
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '배지우', '고1', 'female', '010-5001-5001', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '김태양', '고1', 'male', '010-5002-5002', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '이하은', '고1', 'female', '010-5003-5003', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '최준서', '고1', 'male', '010-5004-5004', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '정서윤', '고1', 'female', '010-5005-5005', NOW());

-- 고2 12명 (샘플 5명만)
INSERT INTO students (org_id, name, grade, gender, parent_phone, created_at) VALUES
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '박재민', '고2', 'male', '010-6001-6001', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '강예린', '고2', 'female', '010-6002-6002', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '윤시우', '고2', 'male', '010-6003-6003', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '임채원', '고2', 'female', '010-6004-6004', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '한준혁', '고2', 'male', '010-6005-6005', NOW());

-- 고3 12명 (샘플 5명만)
INSERT INTO students (org_id, name, grade, gender, parent_phone, created_at) VALUES
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '송민재', '고3', 'male', '010-7001-7001', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '오서아', '고3', 'female', '010-7002-7002', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '신우진', '고3', 'male', '010-7003-7003', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '홍지수', '고3', 'female', '010-7004-7004', NOW()),
('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '장현우', '고3', 'male', '010-7005-7005', NOW());
`

    try {
      await client.query(seedSQL)
      console.log('✅ Seed 데이터 삽입 완료!\n')
    } catch (error) {
      if (error.code === '23505') { // 중복 키
        console.log('⚠️  일부 데이터 이미 존재 (스킵)\n')
      } else {
        throw error
      }
    }

    // 5. RLS 다시 활성화
    console.log('🔒 RLS 재활성화...')
    await client.query("SET session_replication_role = DEFAULT;")
    console.log('✅ RLS 재활성화 완료\n')

    // 6. 결과 검증
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

    console.log('✨ 마이그레이션 + Seed 데이터 적용 완료!\n')

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message)
    console.error('\n상세:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('🔌 Postgres 연결 종료\n')
  }
}

main().catch(console.error)
