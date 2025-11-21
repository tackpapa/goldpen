#!/usr/bin/env node
import { PrismaClient } from '@prisma/client'

const DATABASE_URL = "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

const prisma = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } }
})

async function main() {
  console.log('=== users (role=teacher) ===')
  const userTeachers = await prisma.$queryRaw`SELECT id, name, email FROM users WHERE role = 'teacher'`
  console.log(JSON.stringify(userTeachers, null, 2))

  console.log('\n=== teachers 테이블 ===')
  const teachers = await prisma.$queryRaw`SELECT id, name, email FROM teachers`
  console.log(JSON.stringify(teachers, null, 2))

  console.log('\n=== schedules.teacher_id 샘플 ===')
  const schedules = await prisma.$queryRaw`SELECT id, teacher_id, room_id, day_of_week FROM schedules LIMIT 10`
  console.log(JSON.stringify(schedules, null, 2))

  console.log('\n=== rooms 테이블 ===')
  const rooms = await prisma.$queryRaw`SELECT id, name FROM rooms`
  console.log(JSON.stringify(rooms, null, 2))

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
