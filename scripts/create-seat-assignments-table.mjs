#!/usr/bin/env node
/**
 * Create seat_assignments table
 * Run: node scripts/create-seat-assignments-table.mjs
 */

import pg from 'pg'
const { Client } = pg

const DB_URL = process.env.SUPABASE_DB_URL ||
  "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

console.log('🚀 seat_assignments 테이블 생성\n')

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

    // 1. seat_assignments 테이블 생성
    console.log('📦 seat_assignments 테이블 생성 중...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS seat_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        seat_number INTEGER NOT NULL CHECK (seat_number >= 1),
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'checked_out' CHECK (status IN ('checked_in', 'checked_out', 'vacant')),
        check_in_time TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(org_id, seat_number)
      );

      CREATE INDEX IF NOT EXISTS idx_seat_assignments_org_id ON seat_assignments(org_id);
      CREATE INDEX IF NOT EXISTS idx_seat_assignments_student_id ON seat_assignments(student_id);
    `)
    console.log('✅ seat_assignments 테이블 생성 완료\n')

    // 2. RLS 활성화
    console.log('🔒 RLS 활성화 중...')
    await client.query(`
      ALTER TABLE seat_assignments ENABLE ROW LEVEL SECURITY;
    `)
    console.log('✅ RLS 활성화 완료\n')

    // 3. RLS 정책 생성
    console.log('🔒 RLS 정책 생성 중...')
    await client.query(`
      DROP POLICY IF EXISTS "seat_assignments_select_own_org" ON seat_assignments;
      CREATE POLICY "seat_assignments_select_own_org" ON seat_assignments
        FOR SELECT USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

      DROP POLICY IF EXISTS "seat_assignments_insert_own_org" ON seat_assignments;
      CREATE POLICY "seat_assignments_insert_own_org" ON seat_assignments
        FOR INSERT WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

      DROP POLICY IF EXISTS "seat_assignments_update_own_org" ON seat_assignments;
      CREATE POLICY "seat_assignments_update_own_org" ON seat_assignments
        FOR UPDATE USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

      DROP POLICY IF EXISTS "seat_assignments_delete_own_org" ON seat_assignments;
      CREATE POLICY "seat_assignments_delete_own_org" ON seat_assignments
        FOR DELETE USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));
    `)
    console.log('✅ RLS 정책 생성 완료\n')

    // RLS 다시 활성화
    await client.query("SET session_replication_role = DEFAULT;")

    // Schema reload trigger
    await client.query("NOTIFY pgrst, 'reload schema'")
    console.log('✅ Schema reload triggered\n')

    console.log('🎉 seat_assignments 테이블 생성 완료!')

  } catch (error) {
    console.error('❌ 오류 발생:', error)
    throw error
  } finally {
    await client.end()
  }
}

main().catch(console.error)
