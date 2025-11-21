#!/usr/bin/env node
import { PrismaClient } from '@prisma/client'

const DATABASE_URL = "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

const prisma = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } }
})

async function main() {
  console.log('Dropping teachers table...')
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS teachers CASCADE')
  console.log('✅ teachers 테이블 삭제 완료')
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
