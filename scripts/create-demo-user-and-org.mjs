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
  console.log('🚀 Creating Demo Organization and User...\n')
  
  try {
    // Step 1: Create demo organization
    console.log('📝 Step 1: Creating Demo Organization...')
    
    const demoOrgId = 'dddd0000-0000-0000-0000-000000000000'
    const demoUserId = 'dddd1111-1111-1111-1111-111111111111'
    
    const orgResult = await prisma.$executeRaw`
      INSERT INTO organizations (
        id, name, type, owner_id, settings, status, 
        subscription_plan, max_users, max_students, 
        created_at, updated_at
      ) VALUES (
        ${demoOrgId}::uuid,
        'GoldPen Demo Academy',
        'academy',
        ${demoUserId}::uuid,
        '{}'::jsonb,
        'active',
        'trial',
        50,
        500,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `
    
    console.log(`   ✅ Organization created: GoldPen Demo Academy (${demoOrgId})`)
    console.log()
    
    // Step 2: Create demo user (owner)
    console.log('📝 Step 2: Creating demo@goldpen.kr user...')
    
    const userResult = await prisma.$executeRaw`
      INSERT INTO users (
        id, email, org_id, role, name, phone,
        status, created_at, updated_at
      ) VALUES (
        ${demoUserId}::uuid,
        'demo@goldpen.kr',
        ${demoOrgId}::uuid,
        'owner',
        '데모 관리자',
        '010-1234-5678',
        'active',
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
    `
    
    console.log(`   ✅ User created: demo@goldpen.kr (${demoUserId})`)
    console.log()
    
    // Step 3: Verify creation
    console.log('🔍 Step 3: Verifying...')
    
    const verifyOrg = await prisma.$queryRaw`
      SELECT id, name, type, status, subscription_plan 
      FROM organizations 
      WHERE id = ${demoOrgId}::uuid
    `
    
    const verifyUser = await prisma.$queryRaw`
      SELECT id, email, org_id, role, name 
      FROM users 
      WHERE id = ${demoUserId}::uuid
    `
    
    console.log('   📊 Organization:')
    console.log(JSON.stringify(verifyOrg, null, 2))
    console.log()
    console.log('   👤 User:')
    console.log(JSON.stringify(verifyUser, null, 2))
    console.log()
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('🎉 Demo organization and user created successfully!\n')
    console.log('📋 Details:')
    console.log(`   Organization ID: ${demoOrgId}`)
    console.log(`   Organization Name: GoldPen Demo Academy`)
    console.log(`   User ID: ${demoUserId}`)
    console.log(`   User Email: demo@goldpen.kr`)
    console.log(`   User Role: owner\n`)
    console.log('✅ Ready to seed mock data!\n')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
