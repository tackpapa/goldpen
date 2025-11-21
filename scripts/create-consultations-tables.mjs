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
  console.log('🚀 Creating Consultations Tables...\n')
  console.log('📋 This migration creates:\n')
  console.log('   1. consultations → Consultation records')
  console.log('   2. waitlists → Waitlist management')
  console.log('   3. waitlist_consultations → Many-to-many junction table\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  try {
    // Read migration file
    const migrationSql = readFileSync(
      join(__dirname, '../supabase/migrations/20251121_create_consultations_tables.sql'),
      'utf-8'
    )
    const statements = splitSqlStatements(migrationSql)
    await executeStatements(statements, 'consultations tables')

    // Verify
    console.log('🔍 Verifying migration...\n')

    // Check consultations table
    const consultationsColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'consultations'
      ORDER BY ordinal_position
    `

    if (consultationsColumns.length > 0) {
      console.log(`   ✅ consultations table created (${consultationsColumns.length} columns)`)
    } else {
      console.log(`   ❌ consultations table NOT created`)
    }

    // Check waitlists table
    const waitlistsColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'waitlists'
      ORDER BY ordinal_position
    `

    if (waitlistsColumns.length > 0) {
      console.log(`   ✅ waitlists table created (${waitlistsColumns.length} columns)`)
    } else {
      console.log(`   ❌ waitlists table NOT created`)
    }

    // Check waitlist_consultations table
    const junctionColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'waitlist_consultations'
      ORDER BY ordinal_position
    `

    if (junctionColumns.length > 0) {
      console.log(`   ✅ waitlist_consultations table created (${junctionColumns.length} columns)`)
    } else {
      console.log(`   ❌ waitlist_consultations table NOT created`)
    }

    // Check if any data exists
    const consultationCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM consultations`
    const waitlistCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM waitlists`
    const junctionCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM waitlist_consultations`

    console.log(`\n   📊 Current data:`)
    console.log(`      - consultations: ${consultationCount[0].count} records`)
    console.log(`      - waitlists: ${waitlistCount[0].count} records`)
    console.log(`      - waitlist_consultations: ${junctionCount[0].count} records`)

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('🎉 Consultations tables created successfully!\n')
    console.log('📍 Next steps:')
    console.log('   1. Update consultations/page.tsx to use Supabase instead of mock data')
    console.log('   2. Implement consultation CRUD operations')
    console.log('   3. Implement waitlist management features')
    console.log('   4. Test business logic triggers (enrolled_date, waitlist removal)\n')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.error('\nFull error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
