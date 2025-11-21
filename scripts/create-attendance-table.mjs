#!/usr/bin/env node
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DATABASE_URL = "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } })

function splitSqlStatements(sql) {
  const statements = []
  let currentStatement = ''
  let inDollarQuote = false
  let dollarQuoteTag = ''
  const lines = sql.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim().startsWith('--') && !inDollarQuote) continue
    currentStatement += line + '\n'
    const dollarMatches = line.match(/\$\$|\$[A-Za-z_][A-Za-z0-9_]*\$/g)
    if (dollarMatches) {
      for (const match of dollarMatches) {
        if (!inDollarQuote) { inDollarQuote = true; dollarQuoteTag = match }
        else if (match === dollarQuoteTag) { inDollarQuote = false; dollarQuoteTag = '' }
      }
    }
    if (line.trim().endsWith(';') && !inDollarQuote) {
      if (currentStatement.trim()) statements.push(currentStatement.trim())
      currentStatement = ''
    }
  }
  if (currentStatement.trim()) statements.push(currentStatement.trim())
  return statements.filter(s => s.length > 0)
}

async function main() {
  console.log('🚀 Creating Attendance Table...\n')
  try {
    const migrationSql = readFileSync(join(__dirname, '../supabase/migrations/20251121_create_attendance_table.sql'), 'utf-8')
    const statements = splitSqlStatements(migrationSql)
    let successCount = 0, skipCount = 0
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement.trim()) continue
      console.log(`  [${i + 1}/${statements.length}] ${statement.substring(0, 100).replace(/\s+/g, ' ')}...`)
      try {
        await prisma.$executeRawUnsafe(statement)
        successCount++
        console.log(`    ✅ Success`)
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          skipCount++
          console.log(`    ⏭️  Skipped`)
        } else {
          console.error(`    ❌ Failed:`, error.message)
          throw error
        }
      }
    }
    console.log(`\n  ✅ ${successCount} executed, ${skipCount} skipped\n`)
    const columns = await prisma.$queryRaw`SELECT COUNT(*) as count FROM information_schema.columns WHERE table_name = 'attendance'`
    console.log(`   ✅ attendance table (${columns[0].count} columns)`)
    console.log('\n🎉 Attendance table created!\n')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}
main()
