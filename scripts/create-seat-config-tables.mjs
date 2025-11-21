#!/usr/bin/env node
/**
 * Create seat_configs and seat_types tables
 * Run: node scripts/create-seat-config-tables.mjs
 */

import pg from 'pg'
const { Client } = pg

const DB_URL = process.env.SUPABASE_DB_URL ||
  "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

console.log('🚀 seat_configs, seat_types 테이블 생성\n')
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

    // 1. seat_configs 테이블 생성
    console.log('📦 seat_configs 테이블 생성 중...')
    const createSeatConfigsTable = `
      CREATE TABLE IF NOT EXISTS seat_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        total_seats INTEGER NOT NULL DEFAULT 20 CHECK (total_seats >= 1 AND total_seats <= 100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(org_id)
      );

      CREATE INDEX IF NOT EXISTS idx_seat_configs_org_id ON seat_configs(org_id);
    `
    await client.query(createSeatConfigsTable)
    console.log('✅ seat_configs 테이블 생성 완료\n')

    // 2. seat_types 테이블 생성
    console.log('📦 seat_types 테이블 생성 중...')
    const createSeatTypesTable = `
      CREATE TABLE IF NOT EXISTS seat_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        start_number INTEGER NOT NULL CHECK (start_number >= 1),
        end_number INTEGER NOT NULL CHECK (end_number >= 1),
        type_name VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT seat_types_range_check CHECK (start_number <= end_number)
      );

      CREATE INDEX IF NOT EXISTS idx_seat_types_org_id ON seat_types(org_id);
    `
    await client.query(createSeatTypesTable)
    console.log('✅ seat_types 테이블 생성 완료\n')

    // 3. RLS 활성화
    console.log('🔒 RLS 활성화 중...')
    await client.query(`
      ALTER TABLE seat_configs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE seat_types ENABLE ROW LEVEL SECURITY;
    `)
    console.log('✅ RLS 활성화 완료\n')

    // 4. RLS 정책 생성 - seat_configs
    console.log('🔒 seat_configs RLS 정책 생성 중...')
    await client.query(`
      DROP POLICY IF EXISTS "seat_configs_select_own_org" ON seat_configs;
      CREATE POLICY "seat_configs_select_own_org" ON seat_configs
        FOR SELECT USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

      DROP POLICY IF EXISTS "seat_configs_insert_own_org" ON seat_configs;
      CREATE POLICY "seat_configs_insert_own_org" ON seat_configs
        FOR INSERT WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

      DROP POLICY IF EXISTS "seat_configs_update_own_org" ON seat_configs;
      CREATE POLICY "seat_configs_update_own_org" ON seat_configs
        FOR UPDATE USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

      DROP POLICY IF EXISTS "seat_configs_delete_own_org" ON seat_configs;
      CREATE POLICY "seat_configs_delete_own_org" ON seat_configs
        FOR DELETE USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));
    `)
    console.log('✅ seat_configs RLS 정책 생성 완료\n')

    // 5. RLS 정책 생성 - seat_types
    console.log('🔒 seat_types RLS 정책 생성 중...')
    await client.query(`
      DROP POLICY IF EXISTS "seat_types_select_own_org" ON seat_types;
      CREATE POLICY "seat_types_select_own_org" ON seat_types
        FOR SELECT USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

      DROP POLICY IF EXISTS "seat_types_insert_own_org" ON seat_types;
      CREATE POLICY "seat_types_insert_own_org" ON seat_types
        FOR INSERT WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

      DROP POLICY IF EXISTS "seat_types_update_own_org" ON seat_types;
      CREATE POLICY "seat_types_update_own_org" ON seat_types
        FOR UPDATE USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

      DROP POLICY IF EXISTS "seat_types_delete_own_org" ON seat_types;
      CREATE POLICY "seat_types_delete_own_org" ON seat_types
        FOR DELETE USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));
    `)
    console.log('✅ seat_types RLS 정책 생성 완료\n')

    // RLS 다시 활성화
    await client.query("SET session_replication_role = DEFAULT;")

    console.log('🎉 모든 테이블 및 정책 생성 완료!')

  } catch (error) {
    console.error('❌ 오류 발생:', error)
    throw error
  } finally {
    await client.end()
  }
}

main().catch(console.error)
