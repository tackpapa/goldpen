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

// Import mock data from lib/data/mockData.ts
const todayClasses = [
  // 오전 수업
  { id: 1, name: '고3 수학 모의고사반', teacher: '김선생', room: 'A301', startTime: '09:00', endTime: '12:00', students: 20 },
  { id: 2, name: '중등 영어 기초반', teacher: '박선생', room: 'B201', startTime: '10:00', endTime: '12:00', students: 15 },
  { id: 3, name: '초등 수학 사고력반', teacher: '이선생', room: 'A201', startTime: '11:00', endTime: '13:00', students: 12 },

  // 오후 수업
  { id: 4, name: '고1 수학 특강반', teacher: '김선생', room: 'A301', startTime: '14:00', endTime: '16:00', students: 18 },
  { id: 5, name: '중2 과학 실험반', teacher: '최선생', room: 'C101', startTime: '14:30', endTime: '16:30', students: 14 },
  { id: 6, name: '고2 영어 회화반', teacher: '박선생', room: 'B201', startTime: '15:00', endTime: '17:00', students: 16 },
  { id: 7, name: '중3 국어 독해반', teacher: '이선생', room: 'A201', startTime: '16:00', endTime: '18:00', students: 20 },
  { id: 8, name: '고3 영어 심화반', teacher: '박선생', room: 'B202', startTime: '17:00', endTime: '19:00', students: 22 },
  { id: 9, name: '중1 수학 기초반', teacher: '김선생', room: 'A302', startTime: '17:30', endTime: '19:30', students: 13 },

  // 저녁 수업
  { id: 10, name: '고2 물리 심화반', teacher: '정선생', room: 'C202', startTime: '18:00', endTime: '20:00', students: 10 },
  { id: 11, name: '중3 화학 실험반', teacher: '최선생', room: 'C101', startTime: '18:30', endTime: '20:30', students: 11 },
  { id: 12, name: '고1 국어 문법반', teacher: '이선생', room: 'A201', startTime: '19:00', endTime: '21:00', students: 17 },
  { id: 13, name: '고3 수학 심화반', teacher: '김선생', room: 'A301', startTime: '19:30', endTime: '21:30', students: 19 },
  { id: 14, name: '중2 영어 문법반', teacher: '박선생', room: 'B201', startTime: '20:00', endTime: '22:00', students: 15 },

  // 야간 수업
  { id: 15, name: '고3 야간 자율학습', teacher: '김선생', room: 'A301', startTime: '21:00', endTime: '23:00', students: 25 },
  { id: 16, name: '재수생 특강반', teacher: '정선생', room: 'C202', startTime: '21:30', endTime: '23:30', students: 8 },
]

const upcomingConsultations = [
  { time: '14:00', student: '김민준', parent: '김OO', type: '입교 상담' },
  { time: '15:30', student: '이서연', parent: '이OO', type: '성적 상담' },
  { time: '16:00', student: '박지우', parent: '박OO', type: '진로 상담' },
]

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🌟 demoSchool 전체 데모 데이터 시딩')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  let successCount = 0
  let errorCount = 0

  try {
    // 1. Get existing teachers (already seeded)
    console.log('1️⃣  기존 Teachers 조회 중...')
    const teachers = await prisma.$queryRaw`
      SELECT id, name FROM teachers WHERE org_id = ${DEMO_ORG_ID}::uuid
    `
    const teacherMap = {}
    teachers.forEach(t => {
      teacherMap[t.name] = t.id
    })
    console.log(`   ✅ ${teachers.length}명 조회 완료`)
    console.log(`   Teacher IDs:`, teacherMap)
    console.log()

    // 2. Seed Classes (from todayClasses mock data)
    console.log('2️⃣  Classes 시딩 중...')
    for (const classData of todayClasses) {
      try {
        const teacherId = teacherMap[classData.teacher] || null

        await prisma.$executeRaw`
          INSERT INTO classes (org_id, name, subject, teacher_id, teacher_name, room, capacity, current_students, status)
          VALUES (
            ${DEMO_ORG_ID}::uuid,
            ${classData.name},
            '수학',
            ${teacherId}::uuid,
            ${classData.teacher},
            ${classData.room},
            ${classData.students + 5},
            ${classData.students},
            'active'
          )
          ON CONFLICT DO NOTHING
        `
        successCount++
        console.log(`   ✅ ${classData.name} (${classData.teacher}, ${classData.room})`)
      } catch (error) {
        errorCount++
        console.log(`   ❌ ${classData.name}: ${error.message}`)
      }
    }
    console.log(`\n   📊 Classes: ${successCount}개 성공, ${errorCount}개 실패\n`)

    // 3. Seed Consultations (from upcomingConsultations mock data)
    console.log('3️⃣  Consultations 시딩 중...')
    successCount = 0
    errorCount = 0

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

    // 4. Seed Homework
    console.log('4️⃣  Homework 시딩 중...')
    successCount = 0
    errorCount = 0

    const homeworkData = [
      { title: '수학 문제집 Chapter 3', class: '고3 수학 모의고사반', dueDate: '2025-11-25', totalStudents: 20, submittedCount: 18 },
      { title: '영어 단어 암기 (Unit 5)', class: '중등 영어 기초반', dueDate: '2025-11-23', totalStudents: 15, submittedCount: 14 },
      { title: '과학 실험 보고서', class: '중2 과학 실험반', dueDate: '2025-11-26', totalStudents: 14, submittedCount: 11 },
    ]

    for (const hw of homeworkData) {
      try {
        await prisma.$executeRaw`
          INSERT INTO homework (org_id, title, description, class_name, due_date, status, total_students, submitted_count)
          VALUES (
            ${DEMO_ORG_ID}::uuid,
            ${hw.title},
            ${hw.class + ' 과제'},
            ${hw.class},
            ${hw.dueDate}::date,
            'active',
            ${hw.totalStudents},
            ${hw.submittedCount}
          )
          ON CONFLICT DO NOTHING
        `
        successCount++
        console.log(`   ✅ ${hw.title} (${hw.class})`)
      } catch (error) {
        errorCount++
        console.log(`   ❌ ${hw.title}: ${error.message}`)
      }
    }
    console.log(`\n   📊 Homework: ${successCount}개 성공, ${errorCount}개 실패\n`)

    // 5. Seed Attendance Records
    console.log('5️⃣  Attendance 시딩 중...')
    successCount = 0
    errorCount = 0

    const students = await prisma.$queryRaw`
      SELECT id FROM students WHERE org_id = ${DEMO_ORG_ID}::uuid LIMIT 10
    `

    for (const student of students) {
      try {
        await prisma.$executeRaw`
          INSERT INTO attendance (org_id, student_id, date, status, notes)
          VALUES (
            ${DEMO_ORG_ID}::uuid,
            ${student.id}::uuid,
            CURRENT_DATE,
            'present',
            '정상 출석'
          )
          ON CONFLICT DO NOTHING
        `
        successCount++
      } catch (error) {
        errorCount++
      }
    }
    console.log(`   ✅ ${successCount}건 생성 완료\n`)

    // Final Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ 전체 데모 데이터 시딩 완료!\n')

    // Verification
    console.log('🔍 최종 데이터 검증...\n')

    const classesCoun = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM classes WHERE org_id = ${DEMO_ORG_ID}::uuid
    `
    const consultationsCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM consultations WHERE org_id = ${DEMO_ORG_ID}::uuid
    `
    const homeworkCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM homework WHERE org_id = ${DEMO_ORG_ID}::uuid
    `
    const attendanceCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM attendance WHERE org_id = ${DEMO_ORG_ID}::uuid
    `

    console.log(`   📚 Classes: ${classesCoun[0].count}개`)
    console.log(`   💬 Consultations: ${consultationsCount[0].count}건`)
    console.log(`   📝 Homework: ${homeworkCount[0].count}개`)
    console.log(`   ✅ Attendance: ${attendanceCount[0].count}건`)
    console.log()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  } catch (error) {
    console.error('❌ 시딩 실패:', error.message)
    console.error('\n상세 에러:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
