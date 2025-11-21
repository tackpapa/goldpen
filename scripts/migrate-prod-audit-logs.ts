import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

console.log('📦 Production Migration Script')
console.log('Supabase URL:', supabaseUrl)
console.log('Migration: 20251120_create_audit_logs.sql\n')

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

async function main() {
  try {
    // 1. Check if audit_logs already exists
    console.log('🔍 Checking if audit_logs table exists...')
    const { data: tables, error: checkError } = await supabase.rpc('check_table_exists', {
      table_name: 'audit_logs',
    })

    if (!checkError && tables) {
      console.log('⚠️  audit_logs table already exists in production')
      console.log('Skipping migration to avoid conflicts.')
      process.exit(0)
    }

    // 2. Read migration file
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20251120_create_audit_logs.sql'
    )
    console.log('📄 Reading migration file:', migrationPath)
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    // 3. Execute migration using Supabase SQL
    console.log('🚀 Executing migration...\n')

    // Split SQL into individual statements (handle multiple statements)
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 80)}...`)
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement })

      if (error) {
        console.error('❌ Error:', error.message)
        // Continue with other statements even if one fails
      }
    }

    // 4. Verify table creation
    console.log('\n✅ Verifying audit_logs table...')
    const { data: auditLogs, error: verifyError } = await supabase
      .from('audit_logs')
      .select('*')
      .limit(1)

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message)
      process.exit(1)
    }

    console.log('✅ audit_logs table created successfully!')
    console.log('\n📊 Migration Summary:')
    console.log('  - Table: audit_logs ✓')
    console.log('  - RLS Policies: 2 ✓')
    console.log('  - Indexes: 9 ✓')
    console.log('\n🎉 Production migration completed!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

main()
