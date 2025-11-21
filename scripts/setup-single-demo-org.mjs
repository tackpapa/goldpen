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
const DEMO_USER_ID = 'dddd1111-1111-1111-1111-111111111111'

async function main() {
  console.log('🔧 단일 데모 조직 설정 중...\n')
  
  try {
    // Step 1: 조직 이름을 "demoSchool"로 변경
    console.log('📝 Step 1: 조직 이름을 "demoSchool"로 변경...')
    await prisma.$executeRaw`
      UPDATE organizations 
      SET name = 'demoSchool',
          updated_at = NOW()
      WHERE id = ${DEMO_ORG_ID}::uuid
    `
    console.log('   ✅ 조직 이름 변경 완료\n')
    
    // Step 2: orphan 사용자들 삭제 (존재하지 않는 org_id 참조)
    console.log('📝 Step 2: Orphan 사용자 정리 중...')
    const orphanUsers = await prisma.$queryRaw`
      SELECT id, email, org_id 
      FROM users 
      WHERE org_id = '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3'::uuid
    `
    
    if (orphanUsers.length > 0) {
      console.log(`   ⚠️  ${orphanUsers.length}명의 orphan 사용자 발견:`)
      orphanUsers.forEach(u => console.log(`      - ${u.email}`))
      
      await prisma.$executeRaw`
        DELETE FROM users 
        WHERE org_id = '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3'::uuid
      `
      console.log(`   ✅ ${orphanUsers.length}명 삭제 완료\n`)
    } else {
      console.log('   ✅ Orphan 사용자 없음\n')
    }
    
    // Step 3: 현재 조직 상태 확인
    console.log('📝 Step 3: 최종 조직 상태 확인...')
    const finalOrgs = await prisma.$queryRaw`
      SELECT id, name, type, status 
      FROM organizations 
      ORDER BY created_at
    `
    console.log('   🏢 조직 목록:')
    finalOrgs.forEach(org => {
      console.log(`      - ${org.name} (${org.id})`)
    })
    console.log()
    
    const finalUsers = await prisma.$queryRaw`
      SELECT id, email, org_id, role 
      FROM users 
      ORDER BY created_at
    `
    console.log('   👥 사용자 목록:')
    finalUsers.forEach(user => {
      console.log(`      - ${user.email} (${user.role}) → org: ${user.org_id}`)
    })
    console.log()
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('✅ 단일 데모 조직 설정 완료!\n')
    console.log('📋 Demo 조직 정보:')
    console.log(`   - Organization ID: ${DEMO_ORG_ID}`)
    console.log(`   - Organization Name: demoSchool`)
    console.log(`   - Demo User: demo@goldpen.kr`)
    console.log(`   - Total Organizations: ${finalOrgs.length}개`)
    console.log(`   - Total Users: ${finalUsers.length}명\n`)
    console.log('🚀 이제 이 조직에 모든 mock 데이터를 시딩할 준비가 되었습니다!\n')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
