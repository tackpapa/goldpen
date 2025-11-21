#!/usr/bin/env node
/**
 * Direct migration for study data tables
 */

import pg from 'pg'
const { Client } = pg

const DB_URL = "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected\n')

    // 1. Create subjects table
    console.log('1. Creating subjects table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        org_id UUID NOT NULL,
        student_id UUID NOT NULL,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(7) NOT NULL DEFAULT '#4A90E2',
        "order" INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true
      )
    `)
    console.log('✓ subjects created')

    // 2. Create study_sessions table
    console.log('2. Creating study_sessions table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS study_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        org_id UUID NOT NULL,
        student_id UUID NOT NULL,
        subject_id UUID,
        subject_name VARCHAR(100) NOT NULL,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ,
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        time_slot VARCHAR(20) DEFAULT 'morning',
        status VARCHAR(20) NOT NULL DEFAULT 'active'
      )
    `)
    console.log('✓ study_sessions created')

    // 3. Create daily_study_stats table
    console.log('3. Creating daily_study_stats table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_study_stats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        org_id UUID NOT NULL,
        student_id UUID NOT NULL,
        subject_id UUID,
        subject_name VARCHAR(100) NOT NULL,
        subject_color VARCHAR(7) NOT NULL DEFAULT '#4A90E2',
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        total_seconds INTEGER NOT NULL DEFAULT 0,
        session_count INTEGER NOT NULL DEFAULT 0,
        morning_seconds INTEGER NOT NULL DEFAULT 0,
        afternoon_seconds INTEGER NOT NULL DEFAULT 0,
        night_seconds INTEGER NOT NULL DEFAULT 0
      )
    `)
    console.log('✓ daily_study_stats created')

    // 4. Create daily_planners table
    console.log('4. Creating daily_planners table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_planners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        org_id UUID NOT NULL,
        student_id UUID NOT NULL,
        seat_number INTEGER NOT NULL,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        study_plans JSONB NOT NULL DEFAULT '[]'::jsonb,
        notes TEXT
      )
    `)
    console.log('✓ daily_planners created')

    // 5. Create study_time_records table
    console.log('5. Creating study_time_records table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS study_time_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        org_id UUID NOT NULL,
        student_id UUID NOT NULL,
        student_name VARCHAR(100) NOT NULL,
        seat_number INTEGER,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        total_minutes INTEGER NOT NULL DEFAULT 0,
        morning_minutes INTEGER NOT NULL DEFAULT 0,
        afternoon_minutes INTEGER NOT NULL DEFAULT 0,
        night_minutes INTEGER NOT NULL DEFAULT 0
      )
    `)
    console.log('✓ study_time_records created')

    // 6. Create indexes
    console.log('\n6. Creating indexes...')
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_subjects_student_id ON subjects(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_subjects_org_id ON subjects(org_id)',
      'CREATE INDEX IF NOT EXISTS idx_study_sessions_student_id ON study_sessions(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON study_sessions(date)',
      'CREATE INDEX IF NOT EXISTS idx_daily_study_stats_student_date ON daily_study_stats(student_id, date)',
      'CREATE INDEX IF NOT EXISTS idx_daily_planners_student_date ON daily_planners(student_id, date)',
      'CREATE INDEX IF NOT EXISTS idx_study_time_records_student_date ON study_time_records(student_id, date)',
      'CREATE INDEX IF NOT EXISTS idx_study_time_records_org_date ON study_time_records(org_id, date)',
    ]
    for (const idx of indexes) {
      try {
        await client.query(idx)
        console.log('✓', idx.split(' ')[5])
      } catch (e) {
        console.log('⚠', e.message.substring(0, 50))
      }
    }

    // 7. Enable RLS
    console.log('\n7. Enabling RLS...')
    const tables = ['subjects', 'study_sessions', 'daily_study_stats', 'daily_planners', 'study_time_records']
    for (const table of tables) {
      try {
        await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`)
        console.log('✓ RLS enabled for', table)
      } catch (e) {
        console.log('⚠', table, e.message.substring(0, 40))
      }
    }

    // 8. Create RLS policies
    console.log('\n8. Creating RLS policies...')
    for (const table of tables) {
      try {
        await client.query(`DROP POLICY IF EXISTS "${table}_org_access" ON ${table}`)
        await client.query(`
          CREATE POLICY "${table}_org_access" ON ${table}
          FOR ALL USING (
            org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
          )
        `)
        console.log('✓ Policy for', table)
      } catch (e) {
        console.log('⚠', table, e.message.substring(0, 40))
      }
    }

    // 9. Add to realtime publication
    console.log('\n9. Adding to realtime publication...')
    for (const table of tables) {
      try {
        await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE ${table}`)
        console.log('✓ Added', table)
      } catch (e) {
        if (e.message.includes('already')) {
          console.log('⚠', table, 'already in publication')
        } else {
          console.log('⚠', table, e.message.substring(0, 40))
        }
      }
    }

    // 10. Set REPLICA IDENTITY FULL
    console.log('\n10. Setting REPLICA IDENTITY FULL...')
    for (const table of tables) {
      try {
        await client.query(`ALTER TABLE ${table} REPLICA IDENTITY FULL`)
        console.log('✓', table)
      } catch (e) {
        console.log('⚠', table, e.message.substring(0, 40))
      }
    }

    // Verify
    console.log('\n📊 Verifying tables...')
    const { rows } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('subjects', 'study_sessions', 'daily_study_stats', 'daily_planners', 'study_time_records')
      ORDER BY table_name
    `)
    console.log('Tables:', rows.map(t => t.table_name))

    await client.query("NOTIFY pgrst, 'reload schema'")
    console.log('\n✅ Migration complete!')

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await client.end()
  }
}

main()
