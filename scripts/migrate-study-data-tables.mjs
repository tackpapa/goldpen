#!/usr/bin/env node
/**
 * Create study data tables for livescreen
 */

import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const { Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DB_URL = process.env.SUPABASE_DB_URL ||
  "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected\n')

    // Disable RLS for migration
    await client.query("SET session_replication_role = replica;")

    // Read and execute migration SQL
    const sqlPath = path.join(__dirname, '../supabase/migrations/20251121_create_study_data_tables.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    // Split by statements and execute one by one (skip empty)
    const statements = sql.split(';').filter(s => s.trim())

    for (const statement of statements) {
      const trimmed = statement.trim()
      if (!trimmed || trimmed.startsWith('--')) continue

      try {
        await client.query(trimmed)
        // Show first 50 chars of statement
        const preview = trimmed.replace(/\s+/g, ' ').substring(0, 60)
        console.log(`✓ ${preview}...`)
      } catch (err) {
        // Ignore "already exists" errors
        if (err.message.includes('already exists') ||
            err.message.includes('duplicate key') ||
            err.message.includes('already a member')) {
          console.log(`⚠ Skipped (exists): ${err.message.substring(0, 50)}`)
        } else {
          console.error(`❌ Error: ${err.message}`)
          console.error(`   Statement: ${trimmed.substring(0, 100)}...`)
        }
      }
    }

    // Re-enable RLS
    await client.query("SET session_replication_role = DEFAULT;")
    await client.query("NOTIFY pgrst, 'reload schema'")

    // Verify tables created
    console.log('\n📊 Verifying tables...')
    const { rows: tables } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('subjects', 'study_sessions', 'daily_study_stats', 'daily_planners', 'study_time_records')
      ORDER BY table_name
    `)
    console.log('Tables created:', tables.map(t => t.table_name))

    console.log('\n✅ Migration complete!')

  } catch (error) {
    console.error('Error:', error)
    throw error
  } finally {
    await client.end()
  }
}

main().catch(console.error)
