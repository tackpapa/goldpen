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
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔧 Consultations 테이블 CHECK Constraint 수정')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  try {
    // 1. Drop existing CHECK constraint
    console.log('1️⃣  기존 CHECK constraint 제거 중...')
    await prisma.$executeRaw`
      ALTER TABLE consultations
      DROP CONSTRAINT IF EXISTS consultations_type_check;
    `
    console.log('   ✅ 기존 constraint 제거 완료\n')

    // 2. Create new CHECK constraint with Korean values
    console.log('2️⃣  새로운 CHECK constraint 생성 중...')
    console.log('   허용값: parent, student, academic, behavioral, other, 입교 상담, 성적 상담, 진로 상담\n')

    await prisma.$executeRaw`
      ALTER TABLE consultations
      ADD CONSTRAINT consultations_type_check
      CHECK (type = ANY(ARRAY[
        'parent'::text,
        'student'::text,
        'academic'::text,
        'behavioral'::text,
        'other'::text,
        '입교 상담'::text,
        '성적 상담'::text,
        '진로 상담'::text
      ]));
    `
    console.log('   ✅ 새로운 constraint 생성 완료\n')

    // 3. Verify constraint
    console.log('3️⃣  Constraint 검증 중...')
    const constraints = await prisma.$queryRaw`
      SELECT con.conname, pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'consultations' AND con.conname = 'consultations_type_check'
    `

    console.log('   ✅ 현재 constraint 정의:')
    constraints.forEach(c => {
      console.log(`      ${c.conname}`)
      console.log(`      ${c.definition}\n`)
    })

    // 4. Seed consultations data
    console.log('4️⃣  Consultations 데이터 시딩 중...\n')

    const upcomingConsultations = [
      { time: '14:00', student: '김민준', parent: '김OO', type: '입교 상담' },
      { time: '15:30', student: '이서연', parent: '이OO', type: '성적 상담' },
      { time: '16:00', student: '박지우', parent: '박OO', type: '진로 상담' },
    ]

    let successCount = 0
    let errorCount = 0

    for (const consultation of upcomingConsultations) {
      try {
        const consultDate = new Date()
        consultDate.setHours(parseInt(consultation.time.split(':')[0]), parseInt(consultation.time.split(':')[1]), 0)

        await prisma.$executeRaw`
          INSERT INTO consultations (org_id, date, type, summary, notes, status)
          VALUES (
            ${DEMO_ORG_ID}::uuid,
            ${consultDate.toISOString()}::timestamptz,
            ${consultation.type},
            ${consultation.student + ' 학생 상담'},
            ${'학부모: ' + consultation.parent},
            'scheduled'
          )
          ON CONFLICT DO NOTHING
        `
        successCount++
        console.log(`   ✅ ${consultation.time} - ${consultation.student} (${consultation.type})`)
      } catch (error) {
        errorCount++
        console.log(`   ❌ ${consultation.student}: ${error.message}`)
      }
    }

    console.log(`\n   📊 Consultations: ${successCount}개 성공, ${errorCount}개 실패\n`)

    // 5. Final verification
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 최종 데이터 검증...\n')

    const consultationsCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM consultations WHERE org_id = ${DEMO_ORG_ID}::uuid
    `

    console.log(`   💬 Consultations: ${consultationsCount[0].count}건`)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ Consultations 마이그레이션 및 시딩 완료!\n')

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error.message)
    console.error('\n상세 에러:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
