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
  console.log('🔍 현재 DB 상태 확인...\n')
  
  try {
    // 모든 조직 확인
    const allOrgs = await prisma.$queryRaw`
      SELECT id, name, type, status 
      FROM organizations 
      ORDER BY created_at
    `
    console.log('🏢 모든 조직:')
    console.log(JSON.stringify(allOrgs, null, 2))
    console.log()
    
    // 모든 사용자 확인
    const allUsers = await prisma.$queryRaw`
      SELECT id, email, org_id, role, name 
      FROM users 
      ORDER BY created_at
    `
    console.log('👥 모든 사용자:')
    console.log(JSON.stringify(allUsers, null, 2))
    console.log()
    
    // demo 또는 휘랩연구소 관련 조직 찾기
    const demoOrgs = await prisma.$queryRaw`
      SELECT id, name, type, status 
      FROM organizations 
      WHERE name ILIKE '%demo%' 
         OR name ILIKE '%휘랩%'
         OR name ILIKE '%demoSchool%'
    `
    console.log('🎯 Demo/휘랩연구소 관련 조직:')
    console.log(JSON.stringify(demoOrgs, null, 2))
    console.log()
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log(`📊 요약:`)
    console.log(`   - 총 조직 수: ${allOrgs.length}개`)
    console.log(`   - 총 사용자 수: ${allUsers.length}명`)
    console.log(`   - Demo 관련 조직: ${demoOrgs.length}개\n`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
