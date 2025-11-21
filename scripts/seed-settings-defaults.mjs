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
 * Handles DO blocks with $$ delimiters
 */
function splitSqlStatements(sql) {
  const statements = []
  let currentStatement = ''
  let inDoBlock = false
  let dollarQuoteDepth = 0

  const lines = sql.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip pure comment lines
    if (trimmed.startsWith('--') && !inDoBlock) {
      continue
    }

    currentStatement += line + '\n'

    // Track DO $$ blocks
    if (trimmed.match(/^DO\s+\$\$/i)) {
      inDoBlock = true
      dollarQuoteDepth = 1
      continue
    }

    // Track dollar quote pairs inside DO blocks
    if (inDoBlock) {
      const dollarCount = (line.match(/\$\$/g) || []).length
      // First $$ starts the block, subsequent pairs are nested
      if (dollarCount > 0 && dollarQuoteDepth === 1) {
        dollarQuoteDepth += dollarCount - 1 // -1 because first $$ already counted
      }
    }

    // Check for DO block end
    if (inDoBlock && trimmed.match(/^END\s+\$\$;?$/i)) {
      inDoBlock = false
      dollarQuoteDepth = 0
      const statement = currentStatement.trim()
      if (statement.length > 0) {
        statements.push(statement)
      }
      currentStatement = ''
      continue
    }

    // Check for statement end (only outside DO blocks)
    if (!inDoBlock && trimmed.endsWith(';')) {
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

    // Show what we're executing (first 80 chars)
    const preview = statement.substring(0, 80).replace(/\s+/g, ' ')
    console.log(`  [${i + 1}/${statements.length}] ${preview}...`)

    try {
      await prisma.$executeRawUnsafe(statement)
      successCount++
      console.log(`    ✅ Success`)
    } catch (error) {
      // If error is "already exists" or "duplicate key", skip it
      if (error.message.includes('already exists') ||
          error.message.includes('duplicate key') ||
          error.code === '23505') {
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
  console.log('🌱 Seeding Default Settings Data...\n')
  console.log('📋 This will seed default data for:\n')
  console.log('   1. Revenue Categories (수강료, 자릿세, 룸이용료, 교재판매)')
  console.log('   2. Expense Categories (강사비, 임대료, 공과금, 교재구입, 비품구입, 마케팅)')
  console.log('   3. Page Permissions (16 pages with role-based access)')
  console.log('   4. Menu Settings (16 menu items, all enabled)\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  try {
    // Read seed SQL file
    const seedSql = readFileSync(
      join(__dirname, '../supabase/migrations/20251121_seed_settings_default_data.sql'),
      'utf-8'
    )
    const statements = splitSqlStatements(seedSql)
    await executeStatements(statements, 'default settings data')

    // Verify seeded data
    console.log('🔍 Verifying seeded data...\n')

    // Check organizations
    const orgs = await prisma.$queryRaw`SELECT id, name FROM organizations LIMIT 5`
    console.log(`   📊 Found ${orgs.length} organizations\n`)

    if (orgs.length > 0) {
      const orgId = orgs[0].id
      const orgName = orgs[0].name

      console.log(`   📍 Checking data for: ${orgName}\n`)

      // Check revenue categories
      const revenueCats = await prisma.$queryRaw`
        SELECT name FROM revenue_categories WHERE org_id = ${orgId}::uuid
      `
      console.log(`   ✅ Revenue Categories: ${revenueCats.length} (${revenueCats.map(c => c.name).join(', ')})`)

      // Check expense categories
      const expenseCats = await prisma.$queryRaw`
        SELECT name FROM expense_categories WHERE org_id = ${orgId}::uuid
      `
      console.log(`   ✅ Expense Categories: ${expenseCats.length} (${expenseCats.map(c => c.name).join(', ')})`)

      // Check page permissions
      const permissions = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM page_permissions WHERE org_id = ${orgId}::uuid
      `
      console.log(`   ✅ Page Permissions: ${permissions[0].count} pages configured`)

      // Check menu settings
      const menus = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM menu_settings WHERE org_id = ${orgId}::uuid
      `
      console.log(`   ✅ Menu Settings: ${menus[0].count} menu items configured`)
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('🎉 Default settings data seeded successfully!\n')
    console.log('📍 Next steps:')
    console.log('   1. Update frontend utils to use Supabase instead of localStorage')
    console.log('      - lib/utils/permissions.ts')
    console.log('      - lib/utils/revenue-categories.ts')
    console.log('      - lib/utils/expense-categories.ts')
    console.log('      - lib/config/navigation.ts')
    console.log('   2. Implement password hashing for user_accounts')
    console.log('   3. Create migration script for existing localStorage data (if any)\n')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    console.error('\nFull error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
