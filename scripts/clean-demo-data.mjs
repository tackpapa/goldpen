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

async function main() {
  console.log('🧹 demoSchool 조직의 모든 데이터 정리 중...\n')
  console.log(`📋 Organization: demoSchool (${DEMO_ORG_ID})\n`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  try {
    // Delete in reverse order to respect foreign key constraints

    console.log('📝 Deleting Attendance...')
    const attendance = await prisma.$executeRaw`
      DELETE FROM attendance WHERE org_id = ${DEMO_ORG_ID}::uuid
    `
    console.log(`   ✅ ${attendance} records deleted\n`)

    console.log('📝 Deleting Homework Submissions...')
    const submissions = await prisma.$executeRaw`
      DELETE FROM homework_submissions
      WHERE homework_id IN (SELECT id FROM homework WHERE org_id = ${DEMO_ORG_ID}::uuid)
    `
    console.log(`   ✅ ${submissions} records deleted\n`)

    console.log('📝 Deleting Homework...')
    const homework = await prisma.$executeRaw`
      DELETE FROM homework WHERE org_id = ${DEMO_ORG_ID}::uuid
    `
    console.log(`   ✅ ${homework} records deleted\n`)

    console.log('📝 Deleting Waitlists...')
    const waitlists = await prisma.$executeRaw`
      DELETE FROM waitlists WHERE org_id = ${DEMO_ORG_ID}::uuid
    `
    console.log(`   ✅ ${waitlists} records deleted\n`)

    console.log('📝 Deleting Consultations...')
    const consultations = await prisma.$executeRaw`
      DELETE FROM consultations WHERE org_id = ${DEMO_ORG_ID}::uuid
    `
    console.log(`   ✅ ${consultations} records deleted\n`)

    console.log('📝 Deleting Room Schedules...')
    const rooms = await prisma.$executeRaw`
      DELETE FROM room_schedules WHERE org_id = ${DEMO_ORG_ID}::uuid
    `
    console.log(`   ✅ ${rooms} records deleted\n`)

    console.log('📝 Deleting Schedules...')
    const schedules = await prisma.$executeRaw`
      DELETE FROM schedules WHERE org_id = ${DEMO_ORG_ID}::uuid
    `
    console.log(`   ✅ ${schedules} records deleted\n`)

    console.log('📝 Deleting Class Enrollments...')
    const enrollments = await prisma.$executeRaw`
      DELETE FROM class_enrollments
      WHERE class_id IN (SELECT id FROM classes WHERE org_id = ${DEMO_ORG_ID}::uuid)
    `
    console.log(`   ✅ ${enrollments} records deleted\n`)

    console.log('📝 Deleting Classes...')
    const classes = await prisma.$executeRaw`
      DELETE FROM classes WHERE org_id = ${DEMO_ORG_ID}::uuid
    `
    console.log(`   ✅ ${classes} records deleted\n`)

    console.log('📝 Deleting Students...')
    const students = await prisma.$executeRaw`
      DELETE FROM students WHERE org_id = ${DEMO_ORG_ID}::uuid
    `
    console.log(`   ✅ ${students} records deleted\n`)

    console.log('📝 Deleting Teachers...')
    const teachers = await prisma.$executeRaw`
      DELETE FROM teachers WHERE org_id = ${DEMO_ORG_ID}::uuid
    `
    console.log(`   ✅ ${teachers} records deleted\n`)

    console.log('📝 Deleting Expense Categories...')
    const expenses = await prisma.$executeRaw`
      DELETE FROM expense_categories WHERE org_id = ${DEMO_ORG_ID}::uuid
    `
    console.log(`   ✅ ${expenses} records deleted\n`)

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('✅ demoSchool 조직의 모든 데이터 정리 완료!\n')
    console.log('🚀 이제 새로운 데이터를 시딩할 수 있습니다.\n')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
