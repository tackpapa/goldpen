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

async function main() {
  console.log('🔍 Checking table structures...\n')

  const tablesToCheck = ['teachers', 'students', 'classes', 'consultations', 'homework', 'attendance']

  for (const tableName of tablesToCheck) {
    try {
      console.log(`\n━━━ ${tableName} ━━━`)

      // Check if table exists
      const tableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = ${tableName}
        ) as exists
      `

      if (!tableExists[0].exists) {
        console.log(`❌ 테이블이 존재하지 않습니다.`)
        continue
      }

      console.log(`✅ 테이블 존재함`)

      // Get columns
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position
      `

      console.log(`\n컬럼 목록:`)
      columns.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`)
      })

      // Check for org_id column
      const hasOrgId = columns.some(col => col.column_name === 'org_id')
      console.log(`\norg_id 컬럼: ${hasOrgId ? '✅ 있음' : '❌ 없음'}`)

      // Count records
      const countResult = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM ${prisma.Prisma.raw(tableName)}
      `
      console.log(`전체 레코드: ${countResult[0].count}건`)

    } catch (error) {
      console.log(`❌ 오류: ${error.message}`)
    }
  }

  await prisma.$disconnect()
}

main()
