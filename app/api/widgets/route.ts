import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Type definitions
interface StudentRecord {
  id: string
  grade: string
  created_at: string
  status: string
}

interface TeacherRecord {
  id: string
  name: string
  status: string
  subjects: string[]
}

interface ClassRecord {
  id: string
  name: string
  capacity: number
  current_students: number
  status: string
}

interface ConsultationRecord {
  id: string
  status: string
  scheduled_date: string | null
  student_name: string
  parent_name: string
  created_at: string
}

interface ExamRecord {
  id: string
  title: string
  subject: string
  exam_date: string
  total_score: number
}

interface HomeworkRecord {
  id: string
  title: string
  status: string
  due_date: string
  total_students: number
  submitted_count: number
  class_name: string
}

interface AttendanceRecord {
  id: string
  date: string
  status: string
}

interface LessonRecord {
  id: string
  lesson_date: string
  status: string
  class_name: string | null
  teacher_name: string | null
  subject: string
}

// 매출정산 페이지와 동일하게 payment_records 테이블 사용
interface PaymentRecord {
  id: string
  payment_date: string
  amount: number
  student_name: string | null
  revenue_category_name: string | null
}

interface ExpenseRecord {
  id: string
  amount: number
  expense_date: string
  description: string | null
  category_id: string | null
}

interface RoomRecord {
  id: string
  name: string
  capacity: number
  status: string
}

interface ScheduleRecord {
  id: string
  class_id: string | null
  teacher_id: string | null
  room_id: string | null
  day_of_week: string
  start_time: string
  end_time: string
  status: string
}

interface SeatAssignmentRecord {
  id: string
  seat_number: number
  student_id: string | null
  status: 'checked_in' | 'checked_out' | 'vacant'
}

interface ActivityLogRecord {
  id: string
  user_name: string
  action_type: string
  entity_type: string
  entity_name: string | null
  description: string
  created_at: string
}

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const today = new Date().toISOString().split('T')[0]
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const todayDayOfWeek = dayNames[new Date().getDay()]
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const thisMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Parallel queries for all widget data
    const [
      studentsResult,
      studentsActiveResult,
      studentsInactiveResult,
      teachersResult,
      classesResult,
      consultationsResult,
      examsResult,
      homeworkResult,
      attendanceResult,
      lessonsResult,
      revenueResult,
      expensesResult,
      roomsResult,
      seatsResult,
      seatConfigResult,
      schedulesResult,
      classEnrollmentsResult,
      activityLogsResult,
    ] = await Promise.all([
      // Total students
      db.from('students').select('id, grade, created_at, status', { count: 'exact' }).eq('org_id', orgId),
      // Active students
      db.from('students').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'active'),
      // Inactive students
      db.from('students').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'inactive'),
      // Teachers
      db.from('teachers').select('id, name, status, subjects', { count: 'exact' }).eq('org_id', orgId),
      // Classes with capacity
      db.from('classes').select('id, name, capacity, current_students, status').eq('org_id', orgId).eq('status', 'active'),
      // Consultations (today + recent)
      db.from('consultations').select('id, status, scheduled_date, student_name, parent_name, created_at').eq('org_id', orgId).order('created_at', { ascending: false }).limit(50),
      // Exams
      db.from('exams').select('id, title, subject, exam_date, total_score').eq('org_id', orgId).order('exam_date', { ascending: false }).limit(10),
      // Homework
      db.from('homework').select('id, title, status, due_date, total_students, submitted_count, class_name').eq('org_id', orgId),
      // Attendance (last 7 days)
      db.from('attendance').select('id, date, status, student_id, class_id').eq('org_id', orgId).gte('date', sevenDaysAgo.toISOString().split('T')[0]),
      // Lessons (this month)
      db.from('lessons').select('id, lesson_date, status, class_name, teacher_name, subject').eq('org_id', orgId).gte('lesson_date', thisMonthStart),
      // Revenue (payment_records - 매출정산 페이지와 동일)
      db.from('payment_records').select('id, payment_date, amount, student_name, revenue_category_name').eq('org_id', orgId).gte('payment_date', sixMonthsAgo.toISOString().split('T')[0]),
      // Expenses (last 6 months) - category_id 사용 (category 컬럼 없음)
      db.from('expenses').select('id, amount, expense_date, description, category_id').eq('org_id', orgId).gte('expense_date', sixMonthsAgo.toISOString().split('T')[0]),
      // Rooms
      db.from('rooms').select('id, name, capacity, status').eq('org_id', orgId),
      // Seat Assignments (독서실 좌석 배정 현황)
      db.from('seat_assignments').select('id, seat_number, student_id, status').eq('org_id', orgId),
      // Seat Config (좌석 설정 - total_seats 확인용)
      db.from('seat_configs').select('total_seats').eq('org_id', orgId).single(),
      // Schedules (오늘 요일의 수업)
      db.from('schedules').select('id, class_id, teacher_id, room_id, day_of_week, start_time, end_time, status').eq('org_id', orgId).eq('day_of_week', todayDayOfWeek).eq('status', 'active'),
      // Class enrollments (오늘 수업 예정 학생 - 강의 출결용)
      db.from('class_enrollments').select('class_id, student_id, classes!inner(id, name, schedule, org_id)').eq('status', 'active').eq('org_id', orgId),
      // Activity logs (최근 7일간의 활동 로그)
      db.from('activity_logs').select('id, user_name, action_type, entity_type, entity_name, description, created_at').eq('org_id', orgId).gte('created_at', sevenDaysAgo.toISOString()).order('created_at', { ascending: false }).limit(10),
    ])

    // Process student stats
    const students = (studentsResult.data || []) as StudentRecord[]
    const totalStudents = students.length
    const activeStudents = studentsActiveResult.count || 0
    const inactiveStudents = studentsInactiveResult.count || 0

    // Grade distribution (학년순 정렬 적용)
    const gradeMap: Record<string, number> = {}
    students.forEach((s) => {
      const grade = s.grade || '기타'
      gradeMap[grade] = (gradeMap[grade] || 0) + 1
    })
    const gradeDistribution = Object.entries(gradeMap)
      .map(([grade, count]) => ({ grade, students: count }))
      .sort((a, b) => getGradeOrder(a.grade) - getGradeOrder(b.grade))

    // Student trend (monthly)
    const studentTrendData = generateMonthlyTrend(students, 'created_at', 6)

    // Teachers stats
    const teachers = (teachersResult.data || []) as TeacherRecord[]
    const totalTeachers = teachers.length
    const activeTeachers = teachers.filter((t: TeacherRecord) => t.status === 'active').length
    const avgStudentsPerTeacher = totalTeachers > 0 ? Math.round(totalStudents / totalTeachers) : 0

    // Classes stats
    const classes = (classesResult.data || []) as ClassRecord[]
    const totalClasses = classes.length
    const classCapacity = classes.slice(0, 5).map((c: ClassRecord) => ({
      class: c.name,
      current: c.current_students || 0,
      max: c.capacity || 20,
    }))

    // Consultations stats
    const consultations = (consultationsResult.data || []) as ConsultationRecord[]
    const newConsultations = consultations.filter((c: ConsultationRecord) => c.status === 'new').length
    const scheduledConsultations = consultations.filter((c: ConsultationRecord) => c.status === 'scheduled').length
    const completedConsultations = consultations.filter((c: ConsultationRecord) => c.status === 'enrolled').length
    const upcomingConsultations = consultations
      .filter((c: ConsultationRecord) => c.scheduled_date && c.scheduled_date >= today && c.status === 'scheduled')
      .slice(0, 3)
      .map((c: ConsultationRecord) => ({
        time: c.scheduled_date || '',
        student: c.student_name,
        parent: c.parent_name,
        type: '입교 상담',
      }))

    // Conversion data (monthly)
    const conversionData = generateConversionData(consultations, 6)

    // Exams stats
    const exams = (examsResult.data || []) as ExamRecord[]
    const examData = {
      pending: exams.filter((e: ExamRecord) => e.exam_date >= today).length,
      completed: exams.filter((e: ExamRecord) => e.exam_date < today).length,
      avgScore: 0, // Would need exam_scores table
    }
    const recentExams = exams.slice(0, 3).map((e: ExamRecord) => ({
      subject: e.subject,
      date: e.exam_date,
      avgScore: 0,
      students: 0,
    }))

    // Homework stats
    const homeworkList = (homeworkResult.data || []) as HomeworkRecord[]
    const homeworkData = {
      active: homeworkList.filter((h: HomeworkRecord) => h.status === 'active').length,
      completed: homeworkList.filter((h: HomeworkRecord) => h.status === 'completed').length,
      submissionRate: homeworkList.length > 0
        ? Math.round(homeworkList.reduce((acc: number, h: HomeworkRecord) => acc + ((h.submitted_count || 0) / (h.total_students || 1) * 100), 0) / homeworkList.length)
        : 0,
    }
    const homeworkSubmission = homeworkList.slice(0, 4).map((h: HomeworkRecord) => ({
      class: h.class_name || '미지정',
      submitted: h.submitted_count || 0,
      total: h.total_students || 0,
    }))

    // Attendance stats - class_enrollments 기반으로 계산
    const attendance = (attendanceResult.data || []) as (AttendanceRecord & { student_id?: string; class_id?: string })[]
    const enrollments = (classEnrollmentsResult.data || []) as { class_id: string; student_id: string; classes: { id: string; name: string; schedule: any[] } }[]

    // 오늘 요일에 수업 있는 학생들 필터링
    const korDayMap: Record<string, string> = { sunday: '일', monday: '월', tuesday: '화', wednesday: '수', thursday: '목', friday: '금', saturday: '토' }
    const todayKorDay = korDayMap[todayDayOfWeek]

    const todayScheduledStudents = enrollments.filter(en => {
      const schedArr = Array.isArray(en.classes?.schedule) ? en.classes.schedule : []
      return schedArr.some((s: any) => s.day === todayDayOfWeek || s.day === todayKorDay)
    })

    // 오늘 출결 기록과 매칭
    const todayAttendanceList = attendance.filter((a: AttendanceRecord) => a.date === today)
    const attendanceMap = new Map(todayAttendanceList.map(a => [`${a.student_id}-${a.class_id}`, a.status]))

    // 출결 통계 계산
    let presentCount = 0, lateCount = 0, absentCount = 0
    todayScheduledStudents.forEach(en => {
      const status = attendanceMap.get(`${en.student_id}-${en.class_id}`)
      if (status === 'present') presentCount++
      else if (status === 'late') lateCount++
      else if (status === 'absent') absentCount++
      // status가 없으면 아직 체크 안된 것 (scheduled)
    })

    const todayAttendance = {
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      total: todayScheduledStudents.length,
    }
    const attendanceData = generateWeeklyAttendanceFromEnrollments(attendance, enrollments, korDayMap)
    // Attendance alerts (would need more complex query)
    const attendanceAlerts: { student: string; status: string; class: string }[] = []

    // Lessons stats
    const lessons = (lessonsResult.data || []) as LessonRecord[]
    const lessonLogs = {
      thisMonth: lessons.length,
      pending: lessons.filter((l: LessonRecord) => l.status === 'scheduled').length,
      avgRating: 4.5,
    }
    const recentLessons = lessons.slice(0, 3).map((l: LessonRecord) => ({
      class: l.class_name || '미지정',
      date: l.lesson_date,
      teacher: l.teacher_name || '미지정',
      topic: l.subject || '수업',
    }))

    // 오늘 수업 일정 (schedules 테이블 - 요일 기반)
    const schedules = (schedulesResult.data || []) as ScheduleRecord[]
    // classes 테이블에서 이름 가져오기
    const classIds = schedules.map(s => s.class_id).filter(Boolean) as string[]
    const teacherIds = schedules.map(s => s.teacher_id).filter(Boolean) as string[]
    const roomIds = schedules.map(s => s.room_id).filter(Boolean) as string[]

    // 이름 맵 생성을 위한 추가 쿼리
    let classNameMap: Record<string, string> = {}
    let teacherNameMap: Record<string, string> = {}
    let roomNameMap: Record<string, string> = {}

    if (classIds.length > 0) {
      const { data: classesData } = await db.from('classes').select('id, name').in('id', classIds)
      classNameMap = (classesData || []).reduce((acc: Record<string, string>, c: { id: string; name: string }) => {
        acc[c.id] = c.name
        return acc
      }, {})
    }
    if (teacherIds.length > 0) {
      const { data: teachersData } = await db.from('teachers').select('id, name').in('id', teacherIds)
      teacherNameMap = (teachersData || []).reduce((acc: Record<string, string>, t: { id: string; name: string }) => {
        acc[t.id] = t.name
        return acc
      }, {})
    }
    if (roomIds.length > 0) {
      const { data: roomsData } = await db.from('rooms').select('id, name').in('id', roomIds)
      roomNameMap = (roomsData || []).reduce((acc: Record<string, string>, r: { id: string; name: string }) => {
        acc[r.id] = r.name
        return acc
      }, {})
    }

    const todaySchedules = schedules.map((s: ScheduleRecord) => ({
      id: s.id,
      name: s.class_id ? classNameMap[s.class_id] || '미지정' : '미지정',
      teacher: s.teacher_id ? teacherNameMap[s.teacher_id] || '미지정' : '미지정',
      room: s.room_id ? roomNameMap[s.room_id] || '미지정' : '미지정',
      startTime: s.start_time,
      endTime: s.end_time,
      students: 0,
    }))

    // Revenue stats (payment_records 테이블 - 매출정산 페이지와 동일)
    const payments = (revenueResult.data || []) as PaymentRecord[]
    const monthlyRevenue = payments
      .filter((p: PaymentRecord) => p.payment_date >= thisMonthStart && p.payment_date <= thisMonthEnd)
      .reduce((sum: number, p: PaymentRecord) => sum + (p.amount || 0), 0)
    const revenueData = generateMonthlyRevenue(payments, 6)

    // Expenses stats
    const expensesList = (expensesResult.data || []) as ExpenseRecord[]
    const monthlyExpenses = expensesList
      .filter((e: ExpenseRecord) => e.expense_date >= thisMonthStart && e.expense_date <= thisMonthEnd)
      .reduce((sum: number, e: ExpenseRecord) => sum + (e.amount || 0), 0)
    const expenseCategory = generateExpenseCategory(expensesList)
    const expenseTrend = generateMonthlyExpense(expensesList, 6)

    // Rooms stats
    const rooms = (roomsResult.data || []) as RoomRecord[]
    const roomUsage = rooms.slice(0, 4).map((r: RoomRecord) => ({
      room: r.name,
      usage: Math.round(Math.random() * 40 + 50), // TODO: Calculate actual usage
      classes: Math.round(Math.random() * 5 + 2),
    }))

    // Seats stats (독서실 좌석 현황 - seat_assignments + seat_configs 사용)
    const seatAssignments = (seatsResult.data || []) as SeatAssignmentRecord[]
    const configuredTotalSeats = (seatConfigResult.data as { total_seats: number } | null)?.total_seats || 30

    // 설정된 좌석 범위 내의 배정만 필터링 (예: 1-30번 좌석만)
    const validAssignments = seatAssignments.filter(
      (s: SeatAssignmentRecord) => s.seat_number >= 1 && s.seat_number <= configuredTotalSeats
    )

    const checkedInSeats = validAssignments.filter((s: SeatAssignmentRecord) => s.status === 'checked_in').length
    const checkedOutSeats = validAssignments.filter((s: SeatAssignmentRecord) => s.status === 'checked_out').length
    const vacantSeats = validAssignments.filter((s: SeatAssignmentRecord) => s.status === 'vacant').length
    const seatStatus = {
      total: configuredTotalSeats, // 설정된 전체 좌석 수
      occupied: checkedInSeats, // 등원 중인 학생 수
      available: configuredTotalSeats - checkedInSeats, // 전체에서 등원 중 제외
    }

    // Recent activities (activity_logs 테이블에서 가져오거나 fallback)
    const activityLogs = (activityLogsResult.data || []) as ActivityLogRecord[]
    const recentActivities = activityLogs.length > 0
      ? activityLogs.slice(0, 5).map(log => ({
          time: getTimeAgo(log.created_at),
          action: log.description,
          user: log.user_name,
        }))
      : generateRecentActivities(consultations, lessons, students)

    // Announcements - 테이블이 없으므로 빈 배열 반환
    const announcements: { title: string; date: string }[] = []

    const widgetData = {
      // Stats
      stats: {
        totalStudents,
        activeStudents,
        inactiveStudents,
        newConsultations,
        scheduledConsultations,
        completedConsultations,
        attendanceRate: todayAttendance.total > 0
          ? Math.round((todayAttendance.present / todayAttendance.total) * 100)
          : 0,
        monthlyRevenue,
        revenueChange: '+0%',
      },
      // Students
      gradeDistribution,
      studentTrendData,
      // Teachers
      teacherStats: {
        total: totalTeachers,
        active: activeTeachers,
        avgStudents: avgStudentsPerTeacher,
      },
      // Classes
      totalClasses,
      classCapacity,
      todayClasses: todaySchedules,
      // Consultations
      upcomingConsultations,
      conversionData,
      // Exams
      examData,
      recentExams,
      // Homework
      homeworkData,
      homeworkSubmission,
      // Attendance
      attendanceData,
      todayAttendance,
      attendanceAlerts,
      // Lessons
      lessonLogs,
      recentLessons,
      // Revenue
      revenueData,
      // Expenses
      monthlyExpenses,
      expenseCategory,
      expenseTrend,
      // Rooms
      roomUsage,
      // Seats
      seatStatus,
      // Activities
      recentActivities,
      announcements,
    }

    return Response.json({ data: widgetData }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[Widgets GET] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

// Helper functions
function generateMonthlyTrend(items: any[], dateField: string, months: number) {
  const result: { month: string; students: number }[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStr = `${date.getMonth() + 1}월`
    const count = items.filter(item => {
      const itemDate = new Date(item[dateField])
      return itemDate.getMonth() === date.getMonth() && itemDate.getFullYear() === date.getFullYear()
    }).length
    result.push({ month: monthStr, students: count })
  }
  // Accumulate for trend
  let cumulative = 0
  return result.map(r => {
    cumulative += r.students
    return { ...r, students: cumulative }
  })
}

function generateConversionData(consultations: any[], months: number) {
  const result: { month: string; consultations: number; enrollments: number }[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStr = `${date.getMonth() + 1}월`
    const monthConsultations = consultations.filter(c => {
      const cDate = new Date(c.created_at)
      return cDate.getMonth() === date.getMonth() && cDate.getFullYear() === date.getFullYear()
    })
    const enrollments = monthConsultations.filter(c => c.status === 'enrolled').length
    result.push({
      month: monthStr,
      consultations: monthConsultations.length,
      enrollments,
    })
  }
  return result
}

function generateWeeklyAttendanceFromEnrollments(
  attendance: any[],
  enrollments: any[],
  korDayMap: Record<string, string>
) {
  const days = ['월', '화', '수', '목', '금']
  const dayToEng: Record<string, string> = { '월': 'monday', '화': 'tuesday', '수': 'wednesday', '목': 'thursday', '금': 'friday' }

  return days.map(day => {
    const engDay = dayToEng[day]

    // 해당 요일에 수업 있는 학생들 (enrollments 기반)
    const scheduledForDay = enrollments.filter(en => {
      const schedArr = Array.isArray(en.classes?.schedule) ? en.classes.schedule : []
      return schedArr.some((s: any) => s.day === engDay || s.day === day)
    })

    const totalScheduled = scheduledForDay.length

    // 해당 요일의 출결 기록 (지난 7일 중 해당 요일)
    const dayAttendance = attendance.filter(a => {
      const date = new Date(a.date)
      const dayOfWeek = date.getDay()
      const dayNames = ['일', '월', '화', '수', '목', '금', '토']
      return dayNames[dayOfWeek] === day
    })

    const present = dayAttendance.filter(a => a.status === 'present' || a.status === 'late').length
    // 출결률 = 출석+지각 / 예정 학생 수
    const rate = totalScheduled > 0 ? Math.round((present / totalScheduled) * 100) : 0
    return { date: day, rate: Math.min(rate, 100) } // 100% 초과 방지
  })
}

function generateMonthlyRevenue(payments: PaymentRecord[], months: number) {
  const result: { month: string; revenue: number }[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStr = `${date.getMonth() + 1}월`
    // payment_date 기준으로 월별 매출 집계 (매출정산 페이지와 동일)
    const monthPayments = payments.filter(p => {
      if (!p.payment_date) return false
      const pDate = new Date(p.payment_date)
      return pDate.getMonth() === date.getMonth() && pDate.getFullYear() === date.getFullYear()
    })
    const revenue = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    result.push({ month: monthStr, revenue })
  }
  return result
}

function generateExpenseCategory(expenses: ExpenseRecord[]) {
  const categoryMap: Record<string, number> = {}
  expenses.forEach(e => {
    // description을 카테고리로 사용 (category_id는 UUID이므로 표시용으로 부적합)
    const category = e.description || '기타'
    categoryMap[category] = (categoryMap[category] || 0) + (e.amount || 0)
  })
  return Object.entries(categoryMap).map(([category, amount]) => ({ category, amount }))
}

function generateMonthlyExpense(expenses: ExpenseRecord[], months: number) {
  const result: { month: string; expense: number }[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStr = `${date.getMonth() + 1}월`
    const monthExpenses = expenses.filter(e => {
      const eDate = new Date(e.expense_date)
      return eDate.getMonth() === date.getMonth() && eDate.getFullYear() === date.getFullYear()
    })
    const expense = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    result.push({ month: monthStr, expense })
  }
  return result
}

function generateRecentActivities(consultations: any[], lessons: any[], students: any[]) {
  const activities: { time: string; action: string }[] = []

  // Recent consultations
  consultations.slice(0, 2).forEach(c => {
    const timeAgo = getTimeAgo(c.created_at)
    activities.push({
      time: timeAgo,
      action: `${c.student_name} 학생 상담이 ${c.status === 'enrolled' ? '입교로 전환' : '예약'}되었습니다`,
    })
  })

  // Recent lessons
  lessons.slice(0, 2).forEach(l => {
    activities.push({
      time: '최근',
      action: `${l.class_name || '수업'} 수업일지가 작성되었습니다`,
    })
  })

  return activities.slice(0, 4)
}

function getTimeAgo(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return '방금 전'
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  return `${Math.floor(days / 7)}주 전`
}

/**
 * 학년 정렬을 위한 순서 값 반환
 * 허용된 학년 enum: 초1~초6, 중1~중3, 고1~고3, 재수
 */
function getGradeOrder(grade: string): number {
  const g = grade.trim()

  // 초등학교: 초1~초6
  const elemMatch = g.match(/^초(\d+)$/)
  if (elemMatch) {
    return 100 + parseInt(elemMatch[1], 10) // 101~106
  }

  // 중학교: 중1~중3
  const midMatch = g.match(/^중(\d+)$/)
  if (midMatch) {
    return 200 + parseInt(midMatch[1], 10) // 201~203
  }

  // 고등학교: 고1~고3
  const highMatch = g.match(/^고(\d+)$/)
  if (highMatch) {
    return 300 + parseInt(highMatch[1], 10) // 301~303
  }

  // 재수
  if (g === '재수') return 400

  // 미인식 패턴은 맨 뒤로
  return 9999
}
