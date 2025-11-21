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
  console.log('🔍 Checking organization details...\n')
  
  try {
    // Check ALL organizations
    const allOrgs = await prisma.$queryRaw`SELECT * FROM organizations ORDER BY created_at DESC`
    console.log('🏢 ALL Organizations:')
    console.log(JSON.stringify(allOrgs, null, 2))
    console.log()
    
    // Check specific org_id
    const specificOrg = await prisma.$queryRaw`
      SELECT * FROM organizations 
      WHERE id = '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3'::uuid
    `
    console.log('🎯 Specific Org (3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3):')
    console.log(JSON.stringify(specificOrg, null, 2))
    console.log()
    
    // Count users by org_id
    const userCounts = await prisma.$queryRaw`
      SELECT org_id, COUNT(*) as user_count 
      FROM users 
      GROUP BY org_id
    `
    console.log('📊 User Counts by Org:')
    console.log(JSON.stringify(userCounts, null, 2))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
