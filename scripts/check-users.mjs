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
  console.log('🔍 Checking existing users and organizations...\n')
  
  try {
    // Check organizations
    const orgs = await prisma.$queryRaw`SELECT id, name, created_at FROM organizations ORDER BY created_at DESC LIMIT 5`
    console.log('📊 Organizations:')
    console.log(JSON.stringify(orgs, null, 2))
    console.log()
    
    // Check users
    const users = await prisma.$queryRaw`SELECT id, email, org_id, role, created_at FROM users ORDER BY created_at DESC LIMIT 5`
    console.log('👥 Users:')
    console.log(JSON.stringify(users, null, 2))
    console.log()
    
    // Check if demo user exists in auth.users
    const authUsers = await prisma.$queryRaw`SELECT id, email, created_at FROM auth.users WHERE email LIKE '%demo%' LIMIT 5`
    console.log('🔐 Auth Users (demo):')
    console.log(JSON.stringify(authUsers, null, 2))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
