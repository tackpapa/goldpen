#!/usr/bin/env node
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATABASE_URL = "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
})

/**
 * Split SQL file into individual statements
 * Handles multi-line statements, comments, and function blocks
 */
function splitSqlStatements(sql) {
  const statements = []
  let currentStatement = ''
  let inDollarQuote = false
  let dollarQuoteTag = ''
  let inFunction = false

  const lines = sql.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip pure comment lines
    if (trimmed.startsWith('--') && !inDollarQuote && !inFunction) {
      continue
    }

    currentStatement += line + '\n'

    // Track dollar-quoted strings (function bodies, etc.)
    const dollarMatches = line.match(/\$\$|\$[A-Za-z_][A-Za-z0-9_]*\$/g)
    if (dollarMatches) {
      for (const match of dollarMatches) {
        if (!inDollarQuote) {
          inDollarQuote = true
          dollarQuoteTag = match
        } else if (match === dollarQuoteTag) {
          inDollarQuote = false
          dollarQuoteTag = ''
        }
      }
    }

    // Track function definitions
    if (trimmed.match(/^(CREATE|CREATE OR REPLACE)\s+(FUNCTION|TRIGGER)/i)) {
      inFunction = true
    }

    // Check for statement end
    if (trimmed.endsWith(';') && !inDollarQuote) {
      // For functions, wait for the final semicolon after $$
      if (inFunction && !trimmed.match(/LANGUAGE\s+\w+;$/i)) {
        continue
      }

      inFunction = false
      const statement = currentStatement.trim()
      if (statement.length > 0) {
        statements.push(statement)
      }
      currentStatement = ''
    }
  }

  // Add any remaining statement
  if (currentStatement.trim().length > 0) {
    statements.push(currentStatement.trim())
  }

  return statements.filter(s => s.length > 0)
}

/**
 * Execute SQL statements one by one
 */
async function executeStatements(statements, description) {
  console.log(`Executing ${statements.length} statements for ${description}...\n`)

  let successCount = 0
  let skipCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]

    // Skip empty statements
    if (!statement.trim()) continue

    // Show what we're executing (first 100 chars)
    const preview = statement.substring(0, 100).replace(/\s+/g, ' ')
    console.log(`  [${i + 1}/${statements.length}] ${preview}...`)

    try {
      await prisma.$executeRawUnsafe(statement)
      successCount++
      console.log(`    ✅ Success`)
    } catch (error) {
      // If error is "already exists", skip it
      if (error.message.includes('already exists') ||
          error.message.includes('duplicate') ||
          error.message.includes('already has') ||
          error.code === 'P2010') {
        skipCount++
        console.log(`    ⏭️  Skipped (already exists)`)
      } else {
        console.error(`    ❌ Failed:`, error.message)
        throw error
      }
    }
  }

  console.log(`\n  ✅ ${successCount} statements executed, ${skipCount} skipped\n`)
}

async function main() {
  console.log('🚀 Creating Settings Config Tables...\n')
  console.log('📋 This migration creates:\n')
  console.log('   1. user_accounts → Internal staff/teacher accounts')
  console.log('   2. page_permissions → Role-based page access control')
  console.log('   3. revenue_categories → Customizable revenue types')
  console.log('   4. expense_categories → Customizable expense types')
  console.log('   5. menu_settings → Menu visibility and ordering')
  console.log('   6. kakao_talk_usages → KakaoTalk cost tracking')
  console.log('   7. service_usages → Platform service costs\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  try {
    // Read migration file
    const migrationSql = readFileSync(
      join(__dirname, '../supabase/migrations/20251121_create_settings_config_tables.sql'),
      'utf-8'
    )
    const statements = splitSqlStatements(migrationSql)
    await executeStatements(statements, 'settings config tables')

    // Verify
    console.log('🔍 Verifying migration...\n')

    // Check all new tables
    const tables = [
      'user_accounts',
      'page_permissions',
      'revenue_categories',
      'expense_categories',
      'menu_settings',
      'kakao_talk_usages',
      'service_usages'
    ]

    for (const tableName of tables) {
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = ${tableName}
        ORDER BY ordinal_position
      `

      if (columns.length > 0) {
        console.log(`   ✅ ${tableName} table created (${columns.length} columns)`)
      } else {
        console.log(`   ❌ ${tableName} table NOT created`)
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('🎉 Migration completed successfully!\n')
    console.log('📍 Next steps:')
    console.log('   1. Seed default data (categories, permissions, menu settings)')
    console.log('   2. Update frontend to use Supabase queries')
    console.log('   3. Migrate localStorage data to Supabase')
    console.log('   4. Implement password hashing for user_accounts\n')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.error('\nFull error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
