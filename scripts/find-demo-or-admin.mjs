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
  console.log('🔍 Searching for demo user or admin/owner...\n')
  
  try {
    // Check all users with their roles
    const allUsers = await prisma.$queryRaw`
      SELECT id, email, org_id, role, created_at 
      FROM users 
      ORDER BY created_at DESC
    `
    console.log('👥 All Users with Roles:')
    console.log(JSON.stringify(allUsers, null, 2))
    console.log()
    
    // Check for demo email variations
    const demoUsers = await prisma.$queryRaw`
      SELECT id, email, org_id, role 
      FROM users 
      WHERE email ILIKE '%demo%'
    `
    console.log('🎭 Demo Users:')
    console.log(JSON.stringify(demoUsers, null, 2))
    console.log()
    
    // Check for owner/manager roles
    const adminUsers = await prisma.$queryRaw`
      SELECT id, email, org_id, role 
      FROM users 
      WHERE role IN ('owner', 'manager')
    `
    console.log('👑 Admin Users (owner/manager):')
    console.log(JSON.stringify(adminUsers, null, 2))
    console.log()
    
    // Get organization details
    const orgs = await prisma.$queryRaw`
      SELECT id, name, created_at 
      FROM organizations
    `
    console.log('🏢 Organizations:')
    console.log(JSON.stringify(orgs, null, 2))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
