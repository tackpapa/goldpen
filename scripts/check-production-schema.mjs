#!/usr/bin/env node

/**
 * 프로덕션 Supabase DB 스키마 확인
 */

import pg from 'pg'
const { Client } = pg

const DB_URL = process.env.SUPABASE_DB_URL ||
  "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

console.log('🔍 프로덕션 DB 스키마 확인 중...\n')

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    await client.connect()
    console.log('✅ Postgres 연결 성공!\n')

    // 1. 모든 테이블 목록 조회
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `
    const tables = await client.query(tablesQuery)

    console.log('📋 현재 테이블 목록:')
    console.log('─────────────────────')
    if (tables.rows.length === 0) {
      console.log('  (테이블 없음)')
    } else {
      tables.rows.forEach(row => {
        console.log(`  • ${row.table_name}`)
      })
    }
    console.log()

    // 2. users 테이블이 있으면 컬럼 확인
    const usersTable = tables.rows.find(r => r.table_name === 'users')
    if (usersTable) {
      console.log('👤 users 테이블 컬럼:')
      console.log('─────────────────────')
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
        ORDER BY ordinal_position
      `
      const columns = await client.query(columnsQuery)
      columns.rows.forEach(col => {
        console.log(`  • ${col.column_name} (${col.data_type})`)
      })
      console.log()
    }

    // 3. 마이그레이션 기록 확인
    const migrationsTable = tables.rows.find(r => r.table_name === 'schema_migrations')
    if (migrationsTable) {
      console.log('📜 마이그레이션 기록:')
      console.log('─────────────────────')
      const migrationsQuery = `
        SELECT version
        FROM schema_migrations
        ORDER BY version DESC
        LIMIT 10
      `
      const migrations = await client.query(migrationsQuery)
      if (migrations.rows.length === 0) {
        console.log('  (마이그레이션 없음)')
      } else {
        migrations.rows.forEach(row => {
          console.log(`  • ${row.version}`)
        })
      }
      console.log()
    }

  } catch (error) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch(console.error)
