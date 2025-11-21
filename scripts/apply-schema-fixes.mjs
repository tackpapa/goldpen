#!/usr/bin/env node
/**
 * Apply Schema Fixes to Supabase
 * - Creates audit_logs table
 * - Fixes organizations-users relationship
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase 설정
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ipqhhqduppzvsqwwzjkp.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function applySchemaMigration() {
  console.log('🚀 Applying schema fixes to Supabase...\n')

  try {
    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, '../supabase/migrations/20251120_fix_all_schema_issues.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')

    console.log('📄 SQL Migration File:')
    console.log('   ' + sqlPath)
    console.log('')

    // Supabase에 SQL 실행
    console.log('⏳ Executing SQL migration...')
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // exec_sql 함수가 없는 경우 대체 방법 시도
      if (error.message.includes('function public.exec_sql')) {
        console.log('⚠️  exec_sql function not found. Using alternative method...')

        // SQL을 여러 statement로 분리해서 실행
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'))

        for (const statement of statements) {
          if (statement.includes('DO $$')) {
            // DO 블록은 건너뛰기 (정보성 메시지)
            continue
          }

          try {
            // Postgrest를 통해 직접 실행은 불가능하므로 안내 메시지 출력
            console.log('ℹ️  Statement:', statement.substring(0, 50) + '...')
          } catch (e) {
            console.warn('⚠️  Skipping statement:', e.message)
          }
        }

        console.log('\n⚠️  Direct SQL execution is not available.')
        console.log('📌 Please apply the migration manually:')
        console.log('   1. Go to Supabase Dashboard → SQL Editor')
        console.log('   2. Open and run: supabase/migrations/20251120_fix_all_schema_issues.sql')
        console.log('')
        console.log('🔗 Supabase Dashboard:')
        console.log('   ' + SUPABASE_URL.replace('.supabase.co', '.supabase.co/project/_/sql'))
        return
      }

      throw error
    }

    console.log('✅ Schema fixes applied successfully!')
    console.log('')
    console.log('📊 What was fixed:')
    console.log('   ✓ audit_logs table created')
    console.log('   ✓ organizations.owner_id relationship added')
    console.log('   ✓ RLS policies configured')
    console.log('   ✓ Indexes created')
    console.log('')
    console.log('🎉 Database is ready!')

  } catch (error) {
    console.error('\n❌ Error applying schema fixes:')
    console.error('   ', error.message)
    console.error('')
    console.error('📌 Manual steps:')
    console.error('   1. Go to Supabase Dashboard')
    console.error('   2. Navigate to SQL Editor')
    console.error('   3. Run: supabase/migrations/20251120_fix_all_schema_issues.sql')
    process.exit(1)
  }
}

applySchemaMigration()
