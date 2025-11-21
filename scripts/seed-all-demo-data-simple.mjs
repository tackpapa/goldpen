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
  console.log('🚀 demoSchool 조직에 전체 데모 데이터 시딩 시작...\n')
  console.log(`📋 Organization: demoSchool (${DEMO_ORG_ID})\n`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const stats = {
    teachers: 0,
    students: 0,
    classes: 0,
    enrollments: 0,
    schedules: 0,
    rooms: 0,
    consultations: 0,
    waitlists: 0,
    attendance: 0,
    expenses: 0,
  }

  try {
    // 1. Teachers (강사)
    console.log('📝 STEP 1: Teachers (강사) 시딩...')
    const teacherIds = []
    const teachers = [
      { name: '김영희', email: 'kim@demoschool.kr', phone: '010-1111-1111', subjects: ['수학', '과학'], employment_type: 'full_time', salary_type: 'monthly', salary_amount: 3200000, hire_date: '2024-01-01' },
      { name: '이철수', email: 'lee@demoschool.kr', phone: '010-2222-2222', subjects: ['영어', '국어'], employment_type: 'full_time', salary_type: 'monthly', salary_amount: 2800000, hire_date: '2024-02-01' },
      { name: '박민수', email: 'park@demoschool.kr', phone: '010-3333-3333', subjects: ['수학'], employment_type: 'part_time', salary_type: 'hourly', salary_amount: 50000, hire_date: '2024-03-01' },
      { name: '최지혜', email: 'choi@demoschool.kr', phone: '010-4444-4444', subjects: ['영어', '수학'], employment_type: 'full_time', salary_type: 'monthly', salary_amount: 3000000, hire_date: '2024-01-15' },
    ]

    for (const t of teachers) {
      const result = await prisma.$queryRaw`
        INSERT INTO teachers (org_id, name, email, phone, subjects, status, employment_type, salary_type, salary_amount, hire_date, created_at, updated_at)
        VALUES (
          ${DEMO_ORG_ID}::uuid, ${t.name}, ${t.email}, ${t.phone},
          ${JSON.stringify(t.subjects)}::jsonb, 'active', ${t.employment_type},
          ${t.salary_type}, ${t.salary_amount}, ${t.hire_date}::date, NOW(), NOW()
        )
        RETURNING id
      `
      teacherIds.push(result[0].id)
      console.log(`   ✅ ${t.name}`)
    }
    stats.teachers = teachers.length
    console.log(`   📊 ${teachers.length}명 생성 완료\n`)

    // 2. Students (학생)
    console.log('📝 STEP 2: Students (학생) 시딩...')
    const studentIds = []
    const students = [
      { name: '홍길동', grade: '초1', phone: '010-9001-0001', parent_phone: '010-5001-0001', notes: '서울초등학교', status: 'active' },
      { name: '김철수', grade: '초2', phone: '010-9002-0002', parent_phone: '010-5002-0002', notes: '서울초등학교', status: 'active' },
      { name: '이영희', grade: '초3', phone: '010-9003-0003', parent_phone: '010-5003-0003', notes: '서울초등학교', status: 'active' },
      { name: '박지민', grade: '초1', phone: '010-9004-0004', parent_phone: '010-5004-0004', notes: '강남초등학교', status: 'active' },
      { name: '최서연', grade: '초2', phone: '010-9005-0005', parent_phone: '010-5005-0005', notes: '강남초등학교', status: 'active' },
      { name: '정민호', grade: '초3', phone: '010-9006-0006', parent_phone: '010-5006-0006', notes: '강남초등학교', status: 'active' },
      { name: '강하늘', grade: '중1', phone: '010-9007-0007', parent_phone: '010-5007-0007', notes: '서울중학교', status: 'active' },
      { name: '윤서준', grade: '중2', phone: '010-9008-0008', parent_phone: '010-5008-0008', notes: '서울중학교', status: 'active' },
      { name: '임수빈', grade: '초1', phone: '010-9009-0009', parent_phone: '010-5009-0009', notes: '서울초등학교', status: 'active' },
      { name: '한예린', grade: '초2', phone: '010-9010-0010', parent_phone: '010-5010-0010', notes: '강남초등학교', status: 'active' },
    ]

    for (const s of students) {
      const result = await prisma.$queryRaw`
        INSERT INTO students (org_id, name, grade, phone, parent_phone, notes, status, created_at, updated_at)
        VALUES (
          ${DEMO_ORG_ID}::uuid, ${s.name}, ${s.grade}, ${s.phone},
          ${s.parent_phone}, ${s.notes}, ${s.status}, NOW(), NOW()
        )
        RETURNING id
      `
      studentIds.push(result[0].id)
      console.log(`   ✅ ${s.name} (${s.grade})`)
    }
    stats.students = students.length
    console.log(`   📊 ${students.length}명 생성 완료\n`)

    // 3. Classes (반)
    console.log('📝 STEP 3: Classes (반) 시딩...')
    const classIds = []
    const classes = [
      { name: '초등 수학 A반', subject: '수학', teacher_id: teacherIds[0], teacher_name: '김영희', capacity: 15, room: 'A101', schedule: [{ day: '월', start_time: '14:00', end_time: '16:00' }, { day: '수', start_time: '14:00', end_time: '16:00' }] },
      { name: '초등 영어 B반', subject: '영어', teacher_id: teacherIds[1], teacher_name: '이철수', capacity: 12, room: 'A102', schedule: [{ day: '화', start_time: '15:00', end_time: '17:00' }, { day: '목', start_time: '15:00', end_time: '17:00' }] },
      { name: '중등 수학 특강', subject: '수학', teacher_id: teacherIds[2], teacher_name: '박민수', capacity: 10, room: 'B201', schedule: [{ day: '금', start_time: '18:00', end_time: '20:00' }] },
      { name: '초등 영어 심화', subject: '영어', teacher_id: teacherIds[3], teacher_name: '최지혜', capacity: 15, room: 'A103', schedule: [{ day: '수', start_time: '16:00', end_time: '18:00' }] },
      { name: '초등 과학 실험', subject: '과학', teacher_id: teacherIds[0], teacher_name: '김영희', capacity: 12, room: 'LAB1', schedule: [{ day: '토', start_time: '10:00', end_time: '12:00' }] },
    ]

    for (const c of classes) {
      const result = await prisma.$queryRaw`
        INSERT INTO classes (org_id, name, subject, teacher_id, teacher_name, capacity, current_students, room, schedule, status, created_at, updated_at)
        VALUES (
          ${DEMO_ORG_ID}::uuid, ${c.name}, ${c.subject}, ${c.teacher_id}::uuid,
          ${c.teacher_name}, ${c.capacity}, 0, ${c.room},
          ${JSON.stringify(c.schedule)}::jsonb, 'active', NOW(), NOW()
        )
        RETURNING id
      `
      classIds.push(result[0].id)
      console.log(`   ✅ ${c.name}`)
    }
    stats.classes = classes.length
    console.log(`   📊 ${classes.length}개 반 생성 완료\n`)

    // 4. Class Enrollments (학생 배정)
    console.log('📝 STEP 4: Class Enrollments (학생 배정) 시딩...')
    const enrollments = [
      { class_id: classIds[0], student_id: studentIds[0], student_name: students[0].name },
      { class_id: classIds[0], student_id: studentIds[1], student_name: students[1].name },
      { class_id: classIds[0], student_id: studentIds[2], student_name: students[2].name },
      { class_id: classIds[1], student_id: studentIds[3], student_name: students[3].name },
      { class_id: classIds[1], student_id: studentIds[4], student_name: students[4].name },
      { class_id: classIds[2], student_id: studentIds[6], student_name: students[6].name },
      { class_id: classIds[2], student_id: studentIds[7], student_name: students[7].name },
      { class_id: classIds[3], student_id: studentIds[5], student_name: students[5].name },
      { class_id: classIds[3], student_id: studentIds[8], student_name: students[8].name },
      { class_id: classIds[4], student_id: studentIds[9], student_name: students[9].name },
    ]

    for (const e of enrollments) {
      await prisma.$executeRaw`
        INSERT INTO class_enrollments (class_id, student_id, student_name, status, joined_at, created_at, updated_at)
        VALUES (${e.class_id}::uuid, ${e.student_id}::uuid, ${e.student_name}, 'active', NOW(), NOW(), NOW())
      `
    }
    stats.enrollments = enrollments.length
    console.log(`   📊 ${enrollments.length}건 배정 완료\n`)

    // 5. Schedules (스케줄)
    console.log('📝 STEP 5: Schedules (스케줄) 시딩...')
    const scheduleData = [
      { class_id: classIds[0], teacher_id: teacherIds[0], day_of_week: '월요일', start_time: '14:00', end_time: '16:00', room: 'A101' },
      { class_id: classIds[0], teacher_id: teacherIds[0], day_of_week: '수요일', start_time: '14:00', end_time: '16:00', room: 'A101' },
      { class_id: classIds[1], teacher_id: teacherIds[1], day_of_week: '화요일', start_time: '15:00', end_time: '17:00', room: 'A102' },
      { class_id: classIds[1], teacher_id: teacherIds[1], day_of_week: '목요일', start_time: '15:00', end_time: '17:00', room: 'A102' },
      { class_id: classIds[2], teacher_id: teacherIds[2], day_of_week: '금요일', start_time: '18:00', end_time: '20:00', room: 'B201' },
      { class_id: classIds[3], teacher_id: teacherIds[3], day_of_week: '수요일', start_time: '16:00', end_time: '18:00', room: 'A103' },
      { class_id: classIds[4], teacher_id: teacherIds[0], day_of_week: '토요일', start_time: '10:00', end_time: '12:00', room: 'LAB1' },
    ]

    for (const sch of scheduleData) {
      await prisma.$executeRaw`
        INSERT INTO schedules (org_id, class_id, teacher_id, day_of_week, start_time, end_time, room, status, created_at, updated_at)
        VALUES (${DEMO_ORG_ID}::uuid, ${sch.class_id}::uuid, ${sch.teacher_id}::uuid, ${sch.day_of_week}, ${sch.start_time}, ${sch.end_time}, ${sch.room}, 'active', NOW(), NOW())
      `
    }
    stats.schedules = scheduleData.length
    console.log(`   📊 ${scheduleData.length}건 스케줄 생성 완료\n`)

    // 6. Room Schedules (교실)
    console.log('📝 STEP 6: Room Schedules (교실) 시딩...')
    const roomData = [
      { room_name: 'A101', room_type: 'classroom', capacity: 20, facilities: ['화이트보드', '빔프로젝터', '에어컨'], status: 'available' },
      { room_name: 'A102', room_type: 'classroom', capacity: 15, facilities: ['화이트보드', '에어컨'], status: 'available' },
      { room_name: 'A103', room_type: 'classroom', capacity: 18, facilities: ['화이트보드', '빔프로젝터'], status: 'available' },
      { room_name: 'B201', room_type: 'classroom', capacity: 12, facilities: ['화이트보드'], status: 'available' },
      { room_name: 'LAB1', room_type: 'lab', capacity: 15, facilities: ['실험기구', '안전장비', '환풍기'], status: 'available' },
      { room_name: '상담실', room_type: 'office', capacity: 4, facilities: ['책상', '의자', '상담테이블'], status: 'available' },
    ]

    for (const room of roomData) {
      await prisma.$executeRaw`
        INSERT INTO room_schedules (org_id, room_name, room_type, capacity, facilities, status, created_at, updated_at)
        VALUES (${DEMO_ORG_ID}::uuid, ${room.room_name}, ${room.room_type}, ${room.capacity}, ${JSON.stringify(room.facilities)}::jsonb, ${room.status}, NOW(), NOW())
      `
    }
    stats.rooms = roomData.length
    console.log(`   📊 ${roomData.length}개 교실 생성 완료\n`)

    // 7. Consultations (상담)
    console.log('📝 STEP 7: Consultations (상담) 시딩...')
    const consultationData = [
      { student_name: '박준영', parent_name: '박부모', parent_phone: '010-6001-0001', preferred_date: '2025-11-25', preferred_time: '14:00', status: 'pending', notes: '중등 수학 특강 상담 희망' },
      { student_name: '김소희', parent_name: '김부모', parent_phone: '010-6002-0002', preferred_date: '2025-11-26', preferred_time: '15:00', status: 'confirmed', notes: '초등 영어 레벨 테스트 후 상담' },
      { student_name: '이도윤', parent_name: '이부모', parent_phone: '010-6003-0003', preferred_date: '2025-11-27', preferred_time: '16:00', status: 'completed', notes: '과학 실험반 등록 완료' },
    ]

    for (const cons of consultationData) {
      await prisma.$executeRaw`
        INSERT INTO consultations (org_id, student_name, parent_name, parent_phone, preferred_date, preferred_time, status, notes, created_at, updated_at)
        VALUES (${DEMO_ORG_ID}::uuid, ${cons.student_name}, ${cons.parent_name}, ${cons.parent_phone}, ${cons.preferred_date}::date, ${cons.preferred_time}, ${cons.status}, ${cons.notes}, NOW(), NOW())
      `
    }
    stats.consultations = consultationData.length
    console.log(`   📊 ${consultationData.length}건 상담 생성 완료\n`)

    // 8. Waitlists (대기자)
    console.log('📝 STEP 8: Waitlists (대기자) 시딩...')
    const waitlistData = [
      { class_id: classIds[0], student_name: '서하준', parent_phone: '010-7001-0001', position: 1, notes: '초등 수학 A반 대기 중' },
      { class_id: classIds[1], student_name: '윤아인', parent_phone: '010-7002-0002', position: 1, notes: '초등 영어 B반 대기 중' },
    ]

    for (const wait of waitlistData) {
      await prisma.$executeRaw`
        INSERT INTO waitlists (org_id, class_id, student_name, parent_phone, position, status, notes, created_at, updated_at)
        VALUES (${DEMO_ORG_ID}::uuid, ${wait.class_id}::uuid, ${wait.student_name}, ${wait.parent_phone}, ${wait.position}, 'waiting', ${wait.notes}, NOW(), NOW())
      `
    }
    stats.waitlists = waitlistData.length
    console.log(`   📊 ${waitlistData.length}건 대기자 생성 완료\n`)

    // 9. Attendance (출결)
    console.log('📝 STEP 9: Attendance (출결) 시딩...')
    const attendanceData = [
      { class_id: classIds[0], student_id: studentIds[0], student_name: students[0].name, date: '2025-11-18', status: 'present' },
      { class_id: classIds[0], student_id: studentIds[1], student_name: students[1].name, date: '2025-11-18', status: 'present' },
      { class_id: classIds[0], student_id: studentIds[2], student_name: students[2].name, date: '2025-11-18', status: 'absent', reason: '감기로 결석' },
      { class_id: classIds[1], student_id: studentIds[3], student_name: students[3].name, date: '2025-11-19', status: 'present' },
      { class_id: classIds[1], student_id: studentIds[4], student_name: students[4].name, date: '2025-11-19', status: 'late', reason: '버스 지연' },
      { class_id: classIds[0], student_id: studentIds[0], student_name: students[0].name, date: '2025-11-20', status: 'present' },
      { class_id: classIds[0], student_id: studentIds[1], student_name: students[1].name, date: '2025-11-20', status: 'present' },
      { class_id: classIds[0], student_id: studentIds[2], student_name: students[2].name, date: '2025-11-20', status: 'present' },
    ]

    for (const att of attendanceData) {
      if (att.reason) {
        await prisma.$executeRaw`
          INSERT INTO attendance (org_id, class_id, student_id, student_name, date, status, reason, created_at, updated_at)
          VALUES (${DEMO_ORG_ID}::uuid, ${att.class_id}::uuid, ${att.student_id}::uuid, ${att.student_name}, ${att.date}::date, ${att.status}, ${att.reason}, NOW(), NOW())
        `
      } else {
        await prisma.$executeRaw`
          INSERT INTO attendance (org_id, class_id, student_id, student_name, date, status, created_at, updated_at)
          VALUES (${DEMO_ORG_ID}::uuid, ${att.class_id}::uuid, ${att.student_id}::uuid, ${att.student_name}, ${att.date}::date, ${att.status}, NOW(), NOW())
        `
      }
    }
    stats.attendance = attendanceData.length
    console.log(`   📊 ${attendanceData.length}건 출결 기록 생성 완료\n`)

    // 10. Expense Categories (지출 카테고리)
    console.log('📝 STEP 10: Expense Categories (지출 카테고리) 시딩...')
    const expenseCategories = [
      { name: '인건비', description: '강사 급여 및 직원 급여', color: '#FF6B6B' },
      { name: '시설비', description: '임대료, 관리비, 수도광열비', color: '#4ECDC4' },
      { name: '교재비', description: '교재 구입 및 인쇄비', color: '#45B7D1' },
      { name: '마케팅', description: '광고비, 홍보물 제작', color: '#FFA07A' },
      { name: '기타', description: '기타 운영비', color: '#95E1D3' },
    ]

    for (const cat of expenseCategories) {
      await prisma.$executeRaw`
        INSERT INTO expense_categories (org_id, name, description, color, created_at, updated_at)
        VALUES (${DEMO_ORG_ID}::uuid, ${cat.name}, ${cat.description}, ${cat.color}, NOW(), NOW())
      `
    }
    stats.expenses = expenseCategories.length
    console.log(`   📊 ${expenseCategories.length}개 카테고리 생성 완료\n`)

    // 최종 리포트
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('✅ demoSchool 조직 전체 데모 데이터 시딩 완료!\n')
    console.log('📊 생성된 데이터 요약:\n')
    console.log(`   👨‍🏫 강사 (Teachers): ${stats.teachers}명`)
    console.log(`   👨‍🎓 학생 (Students): ${stats.students}명`)
    console.log(`   📚 반 (Classes): ${stats.classes}개`)
    console.log(`   📝 수강 등록 (Enrollments): ${stats.enrollments}건`)
    console.log(`   📅 스케줄 (Schedules): ${stats.schedules}건`)
    console.log(`   🏫 교실 (Rooms): ${stats.rooms}개`)
    console.log(`   💬 상담 (Consultations): ${stats.consultations}건`)
    console.log(`   ⏰ 대기자 (Waitlists): ${stats.waitlists}건`)
    console.log(`   ✅ 출결 (Attendance): ${stats.attendance}건`)
    console.log(`   💰 지출 카테고리 (Expense Categories): ${stats.expenses}개\n`)

    const total = Object.values(stats).reduce((sum, val) => sum + val, 0)
    console.log(`   🎯 총 레코드 수: ${total}건\n`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('🚀 이제 localhost:8000에서 모든 페이지의 데이터를 확인할 수 있습니다!\n')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
