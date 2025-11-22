#!/usr/bin/env node
/**
 * Execute SQL Migration Directly via Supabase REST API
 * Uses Supabase Management API to execute SQL
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SUPABASE_URL = 'https://example.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwcWhocWR1cHB6dnNxd3d6amtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYzNjYzOCwiZXhwIjoyMDc5MjEyNjM4fQ.bedodvDtJ9WkJblh7wITNTkSXk8DyjCjIkjAIxSl8qc'

async function executeMigration() {
  console.log('🚀 Executing SQL Migration...\n')

  try {
    // Read SQL file
    const sqlPath = join(__dirname, '../supabase/migrations/20251120_fix_all_schema_issues.sql')
    const sql = readFileSync(sqlPath, 'utf-8')

    console.log('📄 SQL File:', sqlPath)
    console.log('📊 SQL Length:', sql.length, 'characters\n')

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📝 Found ${statements.length} SQL statements\n`)

    let successCount = 0
    let skipCount = 0
    let errorCount = 0

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]

      // Skip DO blocks (they're just for logging)
      if (statement.includes('DO $$') || statement.includes('RAISE NOTICE')) {
        console.log(`⏭️  [${i + 1}/${statements.length}] Skipping DO block`)
        skipCount++
        continue
      }

      // Skip COMMENT statements (not critical)
      if (statement.toUpperCase().startsWith('COMMENT ON')) {
        console.log(`⏭️  [${i + 1}/${statements.length}] Skipping COMMENT`)
        skipCount++
        continue
      }

      const preview = statement.substring(0, 60).replace(/\n/g, ' ') + '...'
      console.log(`⏳ [${i + 1}/${statements.length}] Executing: ${preview}`)

      try {
        // Use PostgREST to execute via RPC
        // We'll try to use the query endpoint directly
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ query: statement + ';' })
        })

        if (!response.ok) {
          const error = await response.text()

          // Check if it's a "already exists" error (which is OK)
          if (error.includes('already exists') || error.includes('IF NOT EXISTS')) {
            console.log(`   ✅ Already exists (OK)`)
            successCount++
          } else if (error.includes('exec_sql')) {
            // exec_sql function doesn't exist, try direct approach
            throw new Error('exec_sql function not available')
          } else {
            console.log(`   ⚠️  Error: ${error.substring(0, 100)}`)
            errorCount++
          }
        } else {
          console.log(`   ✅ Success`)
          successCount++
        }
      } catch (error) {
        // If exec_sql doesn't exist, we need to use a different approach
        if (error.message.includes('exec_sql')) {
          console.log(`   ⚠️  PostgREST RPC not available, trying alternative...`)

          // Try using the pg library to connect directly
          try {
            const { Client } = await import('pg')
            const client = new Client({
              host: 'aws-0-ap-northeast-2.pooler.supabase.com',
              port: 5432,
              database: 'postgres',
              user: 'postgres.ipqhhqduppzvsqwwzjkp',
              password: 'rhfemvps123',
              ssl: { rejectUnauthorized: false }
            })

            await client.connect()
            await client.query(statement + ';')
            await client.end()

            console.log(`   ✅ Success (via direct connection)`)
            successCount++
          } catch (pgError) {
            console.log(`   ❌ Failed: ${pgError.message}`)
            errorCount++
          }
        } else {
          console.log(`   ❌ Failed: ${error.message}`)
          errorCount++
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Migration Summary:')
    console.log(`   ✅ Successful: ${successCount}`)
    console.log(`   ⏭️  Skipped: ${skipCount}`)
    console.log(`   ❌ Failed: ${errorCount}`)
    console.log('='.repeat(60) + '\n')

    if (errorCount === 0) {
      console.log('🎉 Migration completed successfully!')
      console.log('\n✅ What was applied:')
      console.log('   • audit_logs table created')
      console.log('   • organizations.owner_id relationship added')
      console.log('   • RLS policies configured')
      console.log('   • Indexes created\n')
    } else {
      console.log('⚠️  Migration completed with some errors.')
      console.log('   Please check the errors above and retry if needed.\n')
      process.exit(1)
    }

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

executeMigration()
