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
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔄 Classes 테이블에 컬럼 추가')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  try {
    // 1. Add teacher_name column
    console.log('1️⃣  teacher_name 컬럼 추가 중...')
    try {
      await prisma.$executeRaw`
        ALTER TABLE classes
        ADD COLUMN IF NOT EXISTS teacher_name TEXT;
      `
      console.log('   ✅ teacher_name 추가 완료\n')
    } catch (error) {
      console.log(`   ⚠️  ${error.message}\n`)
    }

    // 2. Add room column
    console.log('2️⃣  room 컬럼 추가 중...')
    try {
      await prisma.$executeRaw`
        ALTER TABLE classes
        ADD COLUMN IF NOT EXISTS room TEXT;
      `
      console.log('   ✅ room 추가 완료\n')
    } catch (error) {
      console.log(`   ⚠️  ${error.message}\n`)
    }

    // 3. Add capacity column
    console.log('3️⃣  capacity 컬럼 추가 중...')
    try {
      await prisma.$executeRaw`
        ALTER TABLE classes
        ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 20;
      `
      console.log('   ✅ capacity 추가 완료\n')
    } catch (error) {
      console.log(`   ⚠️  ${error.message}\n`)
    }

    // 4. Add current_students column
    console.log('4️⃣  current_students 컬럼 추가 중...')
    try {
      await prisma.$executeRaw`
        ALTER TABLE classes
        ADD COLUMN IF NOT EXISTS current_students INTEGER DEFAULT 0;
      `
      console.log('   ✅ current_students 추가 완료\n')
    } catch (error) {
      console.log(`   ⚠️  ${error.message}\n`)
    }

    // 5. Update teacher_name from existing teacher_id
    console.log('5️⃣  기존 데이터의 teacher_name 업데이트 중...')
    try {
      const result = await prisma.$executeRaw`
        UPDATE classes c
        SET teacher_name = t.name
        FROM teachers t
        WHERE c.teacher_id = t.id
        AND c.teacher_name IS NULL;
      `
      console.log(`   ✅ ${result}건 업데이트 완료\n`)
    } catch (error) {
      console.log(`   ⚠️  ${error.message}\n`)
    }

    // 6. Create indexes
    console.log('6️⃣  인덱스 생성 중...')
    try {
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_classes_teacher_name ON classes(teacher_name);
      `
      console.log('   ✅ idx_classes_teacher_name 생성 완료')
    } catch (error) {
      console.log(`   ⚠️  ${error.message}`)
    }

    try {
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_classes_room ON classes(room);
      `
      console.log('   ✅ idx_classes_room 생성 완료\n')
    } catch (error) {
      console.log(`   ⚠️  ${error.message}\n`)
    }

    // Verify schema changes
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 스키마 변경 확인 중...\n')

    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'classes'
      ORDER BY ordinal_position
    `

    console.log('📊 Classes 테이블 현재 스키마:')
    console.log('─'.repeat(60))
    columns.forEach(col => {
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : ''
      console.log(`   ✓ ${col.column_name.padEnd(25)} ${col.data_type}${defaultVal}`)
    })

    // Check if new columns exist
    const newColumns = ['teacher_name', 'room', 'capacity', 'current_students']
    const columnNames = columns.map(c => c.column_name)

    console.log('\n✅ 새로 추가된 컬럼 확인:')
    let allSuccess = true
    newColumns.forEach(col => {
      if (columnNames.includes(col)) {
        console.log(`   ✓ ${col} - 존재함`)
      } else {
        console.log(`   ❌ ${col} - 누락됨`)
        allSuccess = false
      }
    })

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    if (allSuccess) {
      console.log('✅ 마이그레이션 완전히 성공!\n')
    } else {
      console.log('⚠️  일부 컬럼이 누락되었습니다.\n')
    }

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error.message)
    console.error('\n상세 에러:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
