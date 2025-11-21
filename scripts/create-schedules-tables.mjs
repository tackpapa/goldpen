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
  console.log('🚀 Creating Schedules Tables...\n')
  console.log('📋 This migration creates:\n')
  console.log('   1. schedules → Class schedules (group classes)')
  console.log('   2. room_schedules → Room bookings (1:1 tutoring)\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  try {
    // Read migration file
    const migrationSql = readFileSync(
      join(__dirname, '../supabase/migrations/20251121_create_schedules_tables.sql'),
      'utf-8'
    )
    const statements = splitSqlStatements(migrationSql)
    await executeStatements(statements, 'schedules tables')

    // Verify
    console.log('🔍 Verifying migration...\n')

    // Check schedules table
    const schedulesColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'schedules'
      ORDER BY ordinal_position
    `

    if (schedulesColumns.length > 0) {
      console.log(`   ✅ schedules table created (${schedulesColumns.length} columns)`)
    } else {
      console.log(`   ❌ schedules table NOT created`)
    }

    // Check room_schedules table
    const roomSchedulesColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'room_schedules'
      ORDER BY ordinal_position
    `

    if (roomSchedulesColumns.length > 0) {
      console.log(`   ✅ room_schedules table created (${roomSchedulesColumns.length} columns)`)
    } else {
      console.log(`   ❌ room_schedules table NOT created`)
    }

    // Check if any data exists
    const scheduleCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM schedules`
    const roomScheduleCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM room_schedules`

    console.log(`\n   📊 Current data:`)
    console.log(`      - schedules: ${scheduleCount[0].count} records`)
    console.log(`      - room_schedules: ${roomScheduleCount[0].count} records`)

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('🎉 Schedules tables created successfully!\n')
    console.log('📍 Next steps:')
    console.log('   1. Update schedule/page.tsx to use Supabase instead of mock data')
    console.log('   2. Update rooms/page.tsx to use Supabase for room_schedules')
    console.log('   3. Implement schedule CRUD operations')
    console.log('   4. Test time conflict validation\n')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.error('\nFull error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
