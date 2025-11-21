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
  let inDoBlock = false

  const lines = sql.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip pure comment lines
    if (trimmed.startsWith('--') && !inDollarQuote && !inFunction && !inDoBlock) {
      continue
    }

    currentStatement += line + '\n'

    // Track DO blocks
    if (trimmed.match(/^DO\s+\$\$/i)) {
      inDoBlock = true
    }

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

          // If we're in a DO block and just closed it, mark end of DO block
          if (inDoBlock) {
            inDoBlock = false
          }
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
  console.log('🚀 Creating Teachers Table...\n')
  console.log('📋 This migration creates:\n')
  console.log('   1. teachers → Teacher management')
  console.log('   2. FK constraints → schedules, room_schedules, classes\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  try {
    // Read migration file
    const migrationSql = readFileSync(
      join(__dirname, '../supabase/migrations/20251121_create_teachers_table.sql'),
      'utf-8'
    )
    const statements = splitSqlStatements(migrationSql)
    await executeStatements(statements, 'teachers table')

    // Verify
    console.log('🔍 Verifying migration...\n')

    // Check teachers table
    const teachersColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'teachers'
      ORDER BY ordinal_position
    `

    if (teachersColumns.length > 0) {
      console.log(`   ✅ teachers table created (${teachersColumns.length} columns)`)
    } else {
      console.log(`   ❌ teachers table NOT created`)
    }

    // Check FK constraints
    const fkConstraints = await prisma.$queryRaw`
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'teachers'
        AND tc.table_name IN ('schedules', 'room_schedules', 'classes')
    `

    console.log(`\n   📎 Foreign key constraints added:`)
    if (fkConstraints.length > 0) {
      fkConstraints.forEach(fk => {
        console.log(`      ✅ ${fk.table_name}.${fk.column_name} → teachers.${fk.foreign_column_name}`)
      })
    } else {
      console.log(`      ⚠️  No FK constraints found (tables may not exist yet)`)
    }

    // Check if any data exists
    const teachersCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM teachers`

    console.log(`\n   📊 Current data:`)
    console.log(`      - teachers: ${teachersCount[0].count} records`)

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('🎉 Teachers table created successfully!\n')
    console.log('📍 Next steps:')
    console.log('   1. Create teachers page UI (if not exists)')
    console.log('   2. Implement teacher CRUD operations')
    console.log('   3. Link teachers to classes and schedules')
    console.log('   4. Test business logic triggers (earned_salary calculation)\n')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.error('\nFull error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
