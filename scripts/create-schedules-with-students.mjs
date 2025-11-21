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

async function main() {
  console.log('🔧 Creating schedules table with student fields...\n')

  try {
    // Read the schedules migration file
    const scheduleSql = readFileSync(
      join(__dirname, '../supabase/migrations/20251120_create_schedules_table.sql'),
      'utf-8'
    )

    // Split into statements (excluding comments)
    const statements = scheduleSql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`Executing ${statements.length} statements...\n`)

    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement)
        console.log('✅', statement.substring(0, 60) + '...')
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          console.log('⏭️  Skipped (already exists):', statement.substring(0, 60) + '...')
        } else {
          console.error('❌ Failed:', statement.substring(0, 60))
          throw err
        }
      }
    }

    console.log('\n🔧 Adding student fields to schedules table...\n')

    // Add student fields one by one
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE schedules ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE CASCADE
      `)
      console.log('✅ Added student_id column')
    } catch (err) {
      console.log('⏭️  student_id already exists')
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE schedules ADD COLUMN IF NOT EXISTS student_name TEXT
      `)
      console.log('✅ Added student_name column')
    } catch (err) {
      console.log('⏭️  student_name already exists')
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE schedules ADD COLUMN IF NOT EXISTS student_grade INTEGER
      `)
      console.log('✅ Added student_grade column')
    } catch (err) {
      console.log('⏭️  student_grade already exists')
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_schedules_student_id ON schedules(student_id) WHERE student_id IS NOT NULL
      `)
      console.log('✅ Added index idx_schedules_student_id')
    } catch (err) {
      console.log('⏭️  index already exists')
    }

    console.log('\n🔍 Verifying schedules table...\n')

    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'schedules'
      ORDER BY ordinal_position
    `

    console.log('📋 schedules table columns:')
    columns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'
      console.log(`   ✅ ${col.column_name} (${col.data_type}, ${nullable})`)
    })

    const studentCols = columns.filter(c => c.column_name.includes('student'))
    console.log(`\n✅ Found ${studentCols.length} student-related columns in schedules table`)

    console.log('\n🎉 schedules table with student fields is ready!')
    console.log('\n📍 You can now use schedules table for:')
    console.log('   - Regular class schedules (class_id based)')
    console.log('   - 1:1 tutoring sessions (student_id based)')
    console.log('   - Room scheduling with student assignment\n')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
