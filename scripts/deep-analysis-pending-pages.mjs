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

const DEMO_ORG_ID = 'dddd0000-0000-0000-0000-000000000000'

// PENDING이라고 보고된 페이지들의 테이블
const pendingTables = [
  'exams',
  'lessons',
  'rooms',
  'room_schedules',
  'seats',
  'expenses',
  'expense_categories',
  'billing_records',
  'teacher_salaries',
  'transactions',
  'waitlists',
  'schedules',
  'organizations',
  'audit_logs',
  'org_settings'
]

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 Deep Analysis: PENDING 페이지 집중 재분석')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const results = {
    hasData: [],
    noData: [],
    noTable: [],
    noOrgIdColumn: []
  }

  for (const tableName of pendingTables) {
    console.log(`\n━━━ ${tableName} ━━━`)

    try {
      // 1. Check if table exists
      const tableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = ${tableName}
        ) as exists
      `

      if (!tableExists[0].exists) {
        console.log(`❌ 테이블이 존재하지 않습니다.`)
        results.noTable.push(tableName)
        continue
      }

      console.log(`✅ 테이블 존재함`)

      // 2. Check for org_id column
      const columns = await prisma.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
      `

      const columnNames = columns.map(c => c.column_name)
      const hasOrgId = columnNames.includes('org_id')

      console.log(`   org_id 컬럼: ${hasOrgId ? '✅ 있음' : '❌ 없음'}`)
      console.log(`   모든 컬럼: ${columnNames.join(', ')}`)

      if (!hasOrgId) {
        // org_id 없으면 전체 레코드 수 확인
        const countAll = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM "${tableName}"`
        )
        console.log(`   전체 레코드: ${countAll[0].count}건 (org_id 없음)`)

        if (parseInt(countAll[0].count) > 0) {
          results.hasData.push({
            table: tableName,
            count: parseInt(countAll[0].count),
            hasOrgId: false
          })
        } else {
          results.noOrgIdColumn.push(tableName)
        }
        continue
      }

      // 3. Count records with org_id
      const countWithOrgId = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM "${tableName}" WHERE org_id = $1::uuid`,
        DEMO_ORG_ID
      )
      const recordCount = parseInt(countWithOrgId[0].count)

      console.log(`   demoSchool 레코드: ${recordCount}건`)

      if (recordCount > 0) {
        // Sample data 출력
        const sampleData = await prisma.$queryRawUnsafe(
          `SELECT * FROM "${tableName}" WHERE org_id = $1::uuid LIMIT 3`,
          DEMO_ORG_ID
        )

        console.log(`\n   📋 샘플 데이터 (최대 3건):`)
        sampleData.forEach((row, idx) => {
          console.log(`   ${idx + 1}. ${JSON.stringify(row, null, 2).substring(0, 200)}...`)
        })

        results.hasData.push({
          table: tableName,
          count: recordCount,
          hasOrgId: true,
          sample: sampleData[0]
        })
      } else {
        console.log(`   ⚠️  demoSchool 조직 데이터 없음 (다른 org_id에는 있을 수 있음)`)

        // Check if other org has data
        const countOtherOrg = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM "${tableName}" WHERE org_id != $1::uuid`,
          DEMO_ORG_ID
        )

        if (parseInt(countOtherOrg[0].count) > 0) {
          console.log(`   💡 다른 조직 데이터: ${countOtherOrg[0].count}건 존재`)
        }

        results.noData.push(tableName)
      }

    } catch (error) {
      console.log(`❌ 오류: ${error.message}`)
      results.noTable.push(tableName)
    }
  }

  // Final Summary
  console.log(`\n\n${'━'.repeat(70)}`)
  console.log('📊 Deep Analysis 최종 결과')
  console.log(`${'━'.repeat(70)}\n`)

  console.log(`✅ 데이터 있음 (${results.hasData.length}개):`)
  results.hasData.forEach(item => {
    console.log(`   - ${item.table}: ${item.count}건 (org_id: ${item.hasOrgId ? '있음' : '없음'})`)
  })

  console.log(`\n❌ 데이터 없음 (${results.noData.length}개):`)
  results.noData.forEach(table => {
    console.log(`   - ${table}`)
  })

  console.log(`\n🚫 테이블 없음 (${results.noTable.length}개):`)
  results.noTable.forEach(table => {
    console.log(`   - ${table}`)
  })

  if (results.noOrgIdColumn.length > 0) {
    console.log(`\n⚠️  org_id 컬럼 없고 데이터 없음 (${results.noOrgIdColumn.length}개):`)
    results.noOrgIdColumn.forEach(table => {
      console.log(`   - ${table}`)
    })
  }

  console.log(`\n${'━'.repeat(70)}`)
  console.log(`\n🎯 결론: ${results.hasData.length}개 테이블에서 실제 데이터 발견!`)
  console.log(`   이전 보고에서 "데이터 없음"으로 잘못 판단한 테이블들입니다.\n`)

  await prisma.$disconnect()
}

main()
