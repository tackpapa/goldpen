#!/usr/bin/env node
import { PrismaClient } from '@prisma/client'

const DATABASE_URL = "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
})

const TABLES_TO_CHECK = [
  'students',
  'teachers',
  'classes',
  'schedules',
  'consultations',
  'waitlists',
  'attendance',
  'homework',
  'homework_submissions',
  'exams',
  'lessons',
  'rooms',
  'room_schedules',
  'seats',
  'expenses',
  'expense_categories',
  'transactions',
  'teacher_salaries',
  'billing_records',
  'org_settings',
  'notification_settings'
]

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 전체 데이터베이스 스키마 조사')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  for (const tableName of TABLES_TO_CHECK) {
    try {
      console.log(`\n🔍 테이블: ${tableName}`)
      console.log('─'.repeat(60))

      const columns = await prisma.$queryRaw`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ${tableName}
        ORDER BY ordinal_position
      `

      if (columns.length === 0) {
        console.log(`   ⚠️  테이블이 존재하지 않습니다!\n`)
        continue
      }

      columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : ''
        const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : ''
        console.log(`   ✓ ${col.column_name.padEnd(25)} ${col.data_type}${maxLength}`.padEnd(50) + ` ${nullable}${defaultVal}`)
      })

      // 레코드 수 확인
      const countResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${tableName}`)
      console.log(`\n   📊 현재 레코드 수: ${countResult[0].count}건`)

    } catch (error) {
      console.log(`   ❌ 에러: ${error.message}`)
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main()
  .catch(error => {
    console.error('❌ Fatal Error:', error)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
