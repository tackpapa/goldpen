#!/usr/bin/env node
/**
 * 스케줄 기반 더미 수업일지 생성 스크립트
 * Supabase Direct SQL 방식 사용
 */

import { PrismaClient } from '@prisma/client'

// 환경 변수에서 가져오거나 직접 입력
const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
})

const DEMO_ORG_ID = 'dddd0000-0000-0000-0000-000000000000'

// 요일을 숫자로 변환 (일요일=0, 월요일=1, ...)
const DAY_MAP = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6,
  // 한글 버전도 지원
  '일요일': 0,
  '월요일': 1,
  '화요일': 2,
  '수요일': 3,
  '목요일': 4,
  '금요일': 5,
  '토요일': 6
}

/**
 * 특정 요일의 최근 N주 날짜 생성
 */
function getRecentDatesForDay(dayOfWeek, weeks = 4) {
  const targetDay = DAY_MAP[dayOfWeek]
  if (targetDay === undefined) return []

  const dates = []
  const today = new Date()
  const currentDay = today.getDay()

  // 가장 최근의 해당 요일 찾기
  let daysAgo = (currentDay - targetDay + 7) % 7
  if (daysAgo === 0) daysAgo = 0 // 오늘이 해당 요일이면 오늘부터

  // 최근 N주의 날짜 생성
  for (let i = 0; i < weeks; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - daysAgo - (i * 7))
    dates.push(date.toISOString().split('T')[0]) // YYYY-MM-DD 형식
  }

  return dates.reverse() // 오래된 날짜부터 정렬
}

/**
 * 더미 수업 내용 생성
 */
function generateLessonContent(subject, lessonNumber) {
  const contents = {
    '수학': [
      '방정식 문제 풀이 및 응용',
      '도형의 성질 학습',
      '함수 그래프 이해',
      '확률과 통계 기초',
      '미적분 개념 설명'
    ],
    '영어': [
      '독해 지문 분석 및 어휘 학습',
      '문법 (시제) 정리',
      '영작문 연습',
      '듣기 평가 및 받아쓰기',
      '회화 표현 학습'
    ],
    '과학': [
      '물리 법칙 실험 및 설명',
      '화학 반응식 이해',
      '생명과학 기초',
      '지구과학 개념 정리',
      '과학 탐구 실험'
    ],
    '국어': [
      '문학 작품 감상 및 분석',
      '비문학 독해 연습',
      '문법 개념 정리',
      '논술 작성 연습',
      '한자 어휘 학습'
    ]
  }

  const contentList = contents[subject] || contents['수학']
  return contentList[lessonNumber % contentList.length]
}

/**
 * 더미 숙제 생성
 */
function generateHomework(subject) {
  const homework = {
    '수학': '교재 p.45-50 문제 풀이, 오답노트 작성',
    '영어': '단어 암기 50개, 독해 지문 3개 풀기',
    '과학': '실험 보고서 작성, 복습 노트 정리',
    '국어': '문학 작품 감상문 작성, 어휘 정리'
  }

  return homework[subject] || homework['수학']
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📚 스케줄 기반 더미 수업일지 생성')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  try {
    // 1. 기존 수업일지 삭제 (선택적)
    console.log('🗑️  기존 수업일지 삭제 중...')
    const deleteResult = await prisma.$executeRaw`
      DELETE FROM lessons WHERE org_id = ${DEMO_ORG_ID}::uuid
    `
    console.log(`   ✅ ${deleteResult}건 삭제 완료\n`)

    // 2. 스케줄 조회
    console.log('📅 스케줄 조회 중...')
    const schedules = await prisma.$queryRaw`
      SELECT
        s.id,
        s.class_id,
        s.teacher_id,
        s.day_of_week,
        s.start_time,
        s.end_time,
        c.name as class_name,
        c.subject,
        c.capacity,
        c.room,
        t.name as teacher_name
      FROM schedules s
      JOIN classes c ON s.class_id = c.id
      JOIN teachers t ON s.teacher_id = t.id
      WHERE s.org_id = ${DEMO_ORG_ID}::uuid
        AND s.status = 'active'
      ORDER BY s.day_of_week, s.start_time
    `
    console.log(`   ✅ ${schedules.length}건 스케줄 조회 완료\n`)

    if (schedules.length === 0) {
      console.log('⚠️  스케줄이 없습니다. 먼저 스케줄을 생성해주세요.')
      return
    }

    // 3. 각 스케줄에 대해 더미 수업일지 생성
    console.log('📝 수업일지 생성 중...\n')
    let totalLessons = 0

    for (const schedule of schedules) {
      console.log(`\n   📌 ${schedule.class_name} (${schedule.day_of_week}, ${schedule.start_time}-${schedule.end_time})`)

      // 최근 4주의 날짜 생성
      const lessonDates = getRecentDatesForDay(schedule.day_of_week, 4)
      console.log(`      날짜: ${lessonDates.join(', ')}`)

      for (let i = 0; i < lessonDates.length; i++) {
        const lessonDate = lessonDates[i]
        const lessonTime = `${schedule.start_time}-${schedule.end_time}`
        const title = `${schedule.class_name} 수업 (${lessonDate})`
        const content = generateLessonContent(schedule.subject, i)
        const homeworkAssigned = generateHomework(schedule.subject)

        await prisma.$executeRaw`
          INSERT INTO lessons (
            org_id,
            class_id,
            class_name,
            teacher_id,
            teacher_name,
            subject,
            lesson_date,
            lesson_time,
            title,
            content,
            homework_assigned,
            status,
            created_at,
            updated_at
          ) VALUES (
            ${DEMO_ORG_ID}::uuid,
            ${schedule.class_id}::uuid,
            ${schedule.class_name},
            ${schedule.teacher_id}::uuid,
            ${schedule.teacher_name},
            ${schedule.subject},
            ${lessonDate}::date,
            ${lessonTime},
            ${title},
            ${content},
            ${homeworkAssigned},
            'completed',
            NOW(),
            NOW()
          )
        `

        totalLessons++
      }

      console.log(`      ✅ ${lessonDates.length}건 생성 완료`)
    }

    // 4. 최종 통계
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ 수업일지 생성 완료!\n')
    console.log(`   📊 총 생성된 수업일지: ${totalLessons}건`)
    console.log(`   📅 스케줄 수: ${schedules.length}건`)
    console.log(`   📆 주차: 최근 4주\n`)

    // 5. 검증 쿼리
    console.log('🔍 생성된 데이터 검증...\n')
    const verification = await prisma.$queryRaw`
      SELECT
        teacher_name,
        COUNT(*)::int as lesson_count,
        MIN(lesson_date) as first_lesson,
        MAX(lesson_date) as last_lesson
      FROM lessons
      WHERE org_id = ${DEMO_ORG_ID}::uuid
      GROUP BY teacher_name
      ORDER BY lesson_count DESC
    `

    console.log('   강사별 수업일지 통계:')
    verification.forEach(v => {
      console.log(`   • ${v.teacher_name}: ${v.lesson_count}건 (${v.first_lesson} ~ ${v.last_lesson})`)
    })

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  } catch (error) {
    console.error('\n❌ 에러 발생:', error.message)
    console.error('상세:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
