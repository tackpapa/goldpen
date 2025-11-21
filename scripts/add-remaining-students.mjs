#!/usr/bin/env node

/**
 * 나머지 학생 89명 추가 (35명 → 124명)
 * 초등 13명, 중1 17명, 중2 20명, 중3 15명, 고1 10명, 고2 7명, 고3 7명
 */

import pg from 'pg'
const { Client } = pg

const DB_URL = process.env.SUPABASE_DB_URL ||
  "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

console.log('📦 나머지 학생 89명 추가 중...\n')
console.log(`📍 Target: ${DB_URL.replace(/:[^:]*@/, ':****@')}\n`)

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

    console.log('📊 학생 데이터 삽입 중...\n')

    // 초등 13명 추가 (기존 5명 + 13명 = 18명)
    console.log('  • 초등 13명 추가...')
    await client.query(`
      INSERT INTO students (org_id, name, grade, phone, status, created_at) VALUES
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '이서윤', '초등4', '010-1001-0002', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '박민준', '초등5', '010-1001-0003', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '최서연', '초등5', '010-1001-0004', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '정예준', '초등5', '010-1001-0005', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '강지우', '초등6', '010-1001-0006', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '조서준', '초등6', '010-1001-0007', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '윤하은', '초등6', '010-1001-0008', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '임도현', '초등4', '010-1001-0009', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '한지민', '초등4', '010-1001-0010', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '오승우', '초등5', '010-1001-0011', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '서예린', '초등5', '010-1001-0012', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '신우진', '초등6', '010-1001-0013', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '권수아', '초등6', '010-1001-0014', 'active', NOW())
    `)
    console.log('    ✅ 완료')

    // 중1 17명 추가 (기존 5명 + 17명 = 22명)
    console.log('  • 중1 17명 추가...')
    await client.query(`
      INSERT INTO students (org_id, name, grade, phone, status, created_at) VALUES
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '김민준', '중1', '010-2001-0001', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '이서연', '중1', '010-2001-0002', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '박지우', '중1', '010-2001-0003', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '최하은', '중1', '010-2001-0004', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '정예준', '중1', '010-2001-0005', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '강민서', '중1', '010-2001-0006', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '조서윤', '중1', '010-2001-0007', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '윤도현', '중1', '010-2001-0008', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '임지호', '중1', '010-2001-0009', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '한유나', '중1', '010-2001-0010', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '오승현', '중1', '010-2001-0011', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '서지안', '중1', '010-2001-0012', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '신준혁', '중1', '010-2001-0013', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '권나영', '중1', '010-2001-0014', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '황시우', '중1', '010-2001-0015', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '안채원', '중1', '010-2001-0016', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '송현우', '중1', '010-2001-0017', 'active', NOW())
    `)
    console.log('    ✅ 완료')

    // 중2 20명 추가 (기존 5명 + 20명 = 25명)
    console.log('  • 중2 20명 추가...')
    await client.query(`
      INSERT INTO students (org_id, name, grade, phone, status, created_at) VALUES
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '김지훈', '중2', '010-2002-0001', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '이수아', '중2', '010-2002-0002', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '박현준', '중2', '010-2002-0003', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '최다은', '중2', '010-2002-0004', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '정시우', '중2', '010-2002-0005', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '강윤서', '중2', '010-2002-0006', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '조준호', '중2', '010-2002-0007', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '윤채은', '중2', '010-2002-0008', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '임은우', '중2', '010-2002-0009', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '한소율', '중2', '010-2002-0010', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '오태양', '중2', '010-2002-0011', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '서나연', '중2', '010-2002-0012', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '신동현', '중2', '010-2002-0013', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '권지율', '중2', '010-2002-0014', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '황민재', '중2', '010-2002-0015', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '안서현', '중2', '010-2002-0016', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '송하율', '중2', '010-2002-0017', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '홍예성', '중2', '010-2002-0018', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '장아인', '중2', '010-2002-0019', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '문지혜', '중2', '010-2002-0020', 'active', NOW())
    `)
    console.log('    ✅ 완료')

    // 중3 15명 추가 (기존 5명 + 15명 = 20명)
    console.log('  • 중3 15명 추가...')
    await client.query(`
      INSERT INTO students (org_id, name, grade, phone, status, created_at) VALUES
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '김철수', '중3', '010-2003-0001', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '이영희', '중3', '010-2003-0002', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '박성훈', '중3', '010-2003-0003', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '최가은', '중3', '010-2003-0004', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '정우진', '중3', '010-2003-0005', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '강예나', '중3', '010-2003-0006', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '조민재', '중3', '010-2003-0007', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '윤하영', '중3', '010-2003-0008', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '임지훈', '중3', '010-2003-0009', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '한서윤', '중3', '010-2003-0010', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '오민석', '중3', '010-2003-0011', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '서유진', '중3', '010-2003-0012', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '신재현', '중3', '010-2003-0013', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '권다윤', '중3', '010-2003-0014', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '황지호', '중3', '010-2003-0015', 'active', NOW())
    `)
    console.log('    ✅ 완료')

    // 고1 10명 추가 (기존 5명 + 10명 = 15명)
    console.log('  • 고1 10명 추가...')
    await client.query(`
      INSERT INTO students (org_id, name, grade, phone, status, created_at) VALUES
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '김민수', '고1', '010-3001-0001', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '이하린', '고1', '010-3001-0002', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '박준영', '고1', '010-3001-0003', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '최서아', '고1', '010-3001-0004', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '정도윤', '고1', '010-3001-0005', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '강예원', '고1', '010-3001-0006', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '조현수', '고1', '010-3001-0007', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '윤지우', '고1', '010-3001-0008', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '임태민', '고1', '010-3001-0009', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '한다인', '고1', '010-3001-0010', 'active', NOW())
    `)
    console.log('    ✅ 완료')

    // 고2 7명 추가 (기존 5명 + 7명 = 12명)
    console.log('  • 고2 7명 추가...')
    await client.query(`
      INSERT INTO students (org_id, name, grade, phone, status, created_at) VALUES
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '김태현', '고2', '010-3002-0001', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '이수진', '고2', '010-3002-0002', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '박정훈', '고2', '010-3002-0003', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '최윤아', '고2', '010-3002-0004', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '정준서', '고2', '010-3002-0005', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '강소율', '고2', '010-3002-0006', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '조시현', '고2', '010-3002-0007', 'active', NOW())
    `)
    console.log('    ✅ 완료')

    // 고3 7명 추가 (기존 5명 + 7명 = 12명)
    console.log('  • 고3 7명 추가...')
    await client.query(`
      INSERT INTO students (org_id, name, grade, phone, status, created_at) VALUES
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '김준혁', '고3', '010-3003-0001', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '이서영', '고3', '010-3003-0002', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '박재현', '고3', '010-3003-0003', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '최예린', '고3', '010-3003-0004', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '정현준', '고3', '010-3003-0005', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '강지아', '고3', '010-3003-0006', 'active', NOW()),
      ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '조태윤', '고3', '010-3003-0007', 'active', NOW())
    `)
    console.log('    ✅ 완료\n')

    // RLS 재활성화
    await client.query("SET session_replication_role = DEFAULT;")

    // 결과 검증
    console.log('📊 최종 데이터 확인...\n')
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

    // 학년별 분포
    console.log('📚 학년별 학생 분포:\n')
    const gradeQuery = `
      SELECT
        CASE
          WHEN grade LIKE '초등%' THEN '초등'
          ELSE grade
        END as grade_group,
        COUNT(*) as count
      FROM students
      GROUP BY grade_group
      ORDER BY
        CASE
          WHEN grade_group LIKE '초등' THEN 1
          WHEN grade_group = '중1' THEN 2
          WHEN grade_group = '중2' THEN 3
          WHEN grade_group = '중3' THEN 4
          WHEN grade_group = '고1' THEN 5
          WHEN grade_group = '고2' THEN 6
          WHEN grade_group = '고3' THEN 7
        END
    `
    const gradeResult = await client.query(gradeQuery)

    gradeResult.rows.forEach(row => {
      const count = typeof row.count === 'bigint' ? Number(row.count) : row.count
      console.log(`  ${row.grade_group}: ${count}명`)
    })

    console.log('\n✨ 나머지 학생 데이터 추가 완료!\n')

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
