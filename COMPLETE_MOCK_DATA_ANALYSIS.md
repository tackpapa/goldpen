# 🎯 완전한 Mock Data 분석 보고서 (최종판)

## 📊 Executive Summary

**분석 일자**: 2025-11-21
**분석 범위**: Next.js App의 **15개 전체 페이지** 분석 완료
**목적**: Supabase 마이그레이션 완전 준비

---

## 📈 전체 통계 Overview

### 분석 완료 현황
- ✅ **총 페이지 분석**: 15/15 (100%)
- ✅ **Mock Data 타입**: 35+ distinct types
- ✅ **Modal/Dialog**: 20+ components
- ✅ **Supabase 테이블**: 9개 존재, 15개 필요

### 마이그레이션 상태 요약
| 카테고리 | 완료 | 진행중 | 미착수 | 완료율 |
|---------|------|--------|--------|--------|
| 재무 관리 | ✅ 100% | - | - | 100% |
| 학생 관리 | ⏳ 70% | 30% | - | 70% |
| 강사 관리 | ⏳ 60% | 40% | - | 60% |
| 스케줄 관리 | ❌ 0% | - | 100% | 0% |
| 상담 관리 | ❌ 0% | - | 100% | 0% |
| 출결 관리 | ❌ 0% | - | 100% | 0% |
| 과제 관리 | ❌ 0% | - | 100% | 0% |
| 시험 관리 | ❌ 0% | - | 100% | 0% |
| 반 관리 | ❌ 0% | - | 100% | 0% |
| 독서실 관리 | ❌ 0% | - | 100% | 0% |
| **전체 평균** | - | - | - | **약 30%** |

---

## 📋 상세 페이지별 분석

### 1. Billing Page (정산) ✅ FULLY MIGRATED

**파일**: `/billing/page.tsx`

#### Mock Data Types
```typescript
// 1.1 Revenue Transactions
interface RevenueTransaction {
  id: string
  date: string
  category: '수강료' | '자릿세' | '룸이용료' | '교재판매'
  amount: number
  student_name: string
  description: string
  payment_method: '현금' | '카드' | '계좌이체'
}
// Sample: 28 transactions

// 1.2 Monthly Summary (computed)
interface MonthlyRevenueSummary {
  month: string
  revenue: number
  expenses: number
  net_profit: number
  student_count: number
  revenue_per_student: number
}
// Sample: 6 months data

// 1.3 Expense Categories (from Supabase)
{ name: '강사 급여', value: 8500000 }
{ name: '임대료', value: 3000000 }
// ... 6 categories total
```

#### Supabase Status
- ✅ `billing_transactions` - Revenue tracking
- ✅ `expenses` - Expense records
- ✅ `expense_categories` - Categorization
- ✅ `teacher_salaries` - Salary info

#### Modals
- None (uses tabs and cards only)

#### Migration Priority
**완료** - 모든 재무 데이터가 Supabase 사용 중

---

### 2. Schedule Page (스케줄) ❌ NEEDS MIGRATION

**파일**: `/schedule/page.tsx`

#### Mock Data Types
```typescript
interface Schedule {
  id: string
  created_at: string
  org_id: string
  class_id: string
  class_name: string
  teacher_id: string
  teacher_name: string
  subject: string
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  start_time: string // 'HH:MM'
  end_time: string // 'HH:MM'
  room: string
  notes?: string
}
// Sample: 10 schedules
```

#### Supabase Status
- ❌ `schedules` or `class_schedules` - **Missing**

#### Modals
1. **Schedule Detail Dialog** - View schedule information (read-only)

#### Migration Priority
**HIGH** - 핵심 스케줄링 기능

---

### 3. Students Page (학생 관리) ⏳ PARTIAL

**파일**: `/students/page.tsx`

#### Mock Data Types
```typescript
interface Student {
  id: string
  created_at: string
  updated_at: string
  org_id: string
  name: string
  attendance_code: string // 4-digit unique code
  grade: string // '중1', '중2', '고1', etc.
  school: string
  phone: string
  parent_name: string
  parent_phone: string
  parent_email?: string
  address?: string
  subjects: string[]
  status: 'active' | 'inactive' | 'graduated'
  enrollment_date: string
  notes?: string
  files?: Array<{
    id: string
    name: string
    type: string
    size: number
    url: string
    uploaded_at: string
  }>
}
// Sample: 5 students
```

#### Supabase Status
- ✅ `students` - Main table exists
- ❌ `student_files` - **Missing** (file attachments)

#### Modals
1. **Student Registration/Edit Dialog** - CRUD with auto-generate attendance code
2. **Student Detail Modal** - Comprehensive profile view

#### Migration Priority
**MEDIUM** - Main table exists, file system needed

---

### 4. Teachers Page (강사 관리) ⏳ PARTIAL

**파일**: `/teachers/page.tsx`

#### Mock Data Types
```typescript
interface Teacher {
  id: string
  created_at: string
  updated_at: string
  org_id: string
  name: string
  email: string
  phone: string
  subjects: string[]
  status: 'active' | 'inactive'
  employment_type: 'full_time' | 'part_time' | 'contract'
  salary_type: 'monthly' | 'hourly'
  salary_amount: number
  hire_date: string
  lesson_note_token: string
  assigned_students?: string[]
  total_hours_worked?: number
  earned_salary?: number
  notes?: string
}
// Sample: 5 teachers

interface TeacherClass {
  teacher_id: string
  class_id: string
  class_name: string
  subject: string
  student_count: number
}
// Sample: 6 class assignments
```

#### Supabase Status
- ✅ `teachers` - Main table exists
- ❌ `teacher_classes` - **Missing** (junction table)
- ❌ `teacher_student_assignments` - **Missing**

#### Modals
1. **Teacher Create/Edit Dialog** - With auto-generate lesson_note_token
2. **Delete Confirmation Dialog**
3. **Student Assignment Dialog** - Multi-select with search (50 students)
4. **Teacher Detail Modal** - Comprehensive profile
5. **Teacher Detail Dialog (OLD)** - Deprecated, can be removed

#### Migration Priority
**HIGH** - Junction tables needed for class/student assignments

---

### 5. Rooms Page (교실 관리) ⏳ PARTIAL

**파일**: `/rooms/page.tsx`

#### Mock Data Types
```typescript
interface Room {
  id: string
  created_at: string
  org_id: string
  name: string
  capacity: number
  status: 'active' | 'inactive'
}
// Sample: 5 rooms (201호, 202호, 203호, 실험실, 특강실)

interface RoomSchedule {
  id: string
  created_at: string
  room_id: string
  room_name: string
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  start_time: string
  end_time: string
  teacher_id: string
  teacher_name: string
  student_id: string
  student_name: string
  student_grade: number
}
// Sample: 12 schedules
```

#### Supabase Status
- ✅ `rooms` - Main table exists
- ❌ `room_schedules` - **Missing**

#### Modals
1. **Schedule Creation Dialog** - With drag-to-select time range

#### Special Features
- Interactive timetable grid with drag-to-select
- Color-coded teachers
- Real-time student search

#### Migration Priority
**HIGH** - Room schedules needed for 1:1 tutoring

---

### 6. Expenses Page (지출 관리) ✅ FULLY MIGRATED

**파일**: `/expenses/page.tsx`
**분석 결과**: 파일이 존재하지만 내용 없음 (Empty)

#### 비고
- Billing page에 expenses 관련 데이터가 통합되어 있음
- ✅ `expenses` table already exists
- ✅ `expense_categories` table already exists

---

### 7. Consultations Page (상담 관리) ❌ NEEDS MIGRATION

**파일**: `/consultations/page.tsx` (1211 lines)

#### Mock Data Types
```typescript
interface Consultation {
  id: string
  created_at: string
  updated_at: string
  org_id: string
  student_name: string
  student_grade: number
  parent_name: string
  parent_phone: string
  parent_email?: string
  goals?: string
  preferred_times?: string
  scheduled_date?: string
  status: 'new' | 'scheduled' | 'enrolled' | 'rejected' | 'on_hold' | 'waitlist'
  notes?: string
  result?: string // 상담 결과 (입교 시)
  enrolled_date?: string // 입교 날짜
  images?: string[] // 첨부 이미지 (Unsplash URLs)
}
// Sample: 4 consultations

interface Waitlist {
  id: string
  name: string // '겨울방학', '여름특강' etc.
  consultationIds: string[]
}
// Sample: 1 waitlist
```

#### Supabase Status
- ❌ `consultations` - **Missing**
- ❌ `waitlists` - **Missing**
- ❌ `consultation_images` - **Missing** (for image attachments)

#### Modals
1. **New Consultation Dialog** - Register new consultation with image upload
2. **Detail Dialog** - View/edit consultation info
3. **Add to Waitlist Dialog** - Select waitlist to add consultation
4. **New Waitlist Dialog** - Create new waitlist
5. **Enrollment Confirmation Dialog** - Confirm enrollment (입교 확정)

#### Special Features
- Image upload with base64 preview
- Waitlist management (대기리스트)
- Status-based tabs (전체, 신규, 예정, 입교, 거절, 보류, 대기리스트)
- Enrollment flow with automatic waitlist removal

#### Migration Priority
**HIGH** - 상담 관리는 학원의 핵심 비즈니스 프로세스

---

### 8. Homework Page (과제 관리) ❌ NEEDS MIGRATION

**파일**: `/homework/page.tsx` (668 lines)

#### Mock Data Types
```typescript
interface Homework {
  id: string
  created_at: string
  updated_at: string
  org_id: string
  title: string
  description: string
  class_id: string
  class_name: string
  due_date: string
  status: 'active' | 'completed' | 'overdue'
  total_students: number
  submitted_count: number
}
// Sample: 4 homework assignments

interface HomeworkSubmission {
  id: string
  homework_id: string
  student_id: string
  student_name: string
  submitted_at?: string
  status: 'submitted' | 'late' | 'not_submitted'
  score?: number
  feedback?: string
}
// Sample: 5 submissions for homework #1

interface StudentHomeworkStatus {
  student_id: string
  student_name: string
  class_name: string
  teacher_name: string
  last_homework: string | null
  last_homework_text: string | null // 수업일지에서 작성된 과제 내용
  submitted: boolean | null
  submission_rate: number // 전체 과제 제출률 (%)
}
// Sample: 18 students (그룹 수업 + 1:1)

interface ClassHomeworkStats {
  class_id: string
  class_name: string
  total_students: number
  submitted_count: number
  submission_rate: number
  last_homework: string | null
}
// Sample: 3 classes
```

#### Supabase Status
- ❌ `homework` - **Missing**
- ❌ `homework_submissions` - **Missing**
- ✅ `lessons` - Exists (for homework_text from lesson notes)

#### Modals
1. **Submissions Dialog** - View student-by-student submission status
2. **Class Detail Dialog** - View all students in a class with their homework status

#### Special Features
- **Two-view tabs**: 학생별 / 반별
- **Teacher filtering**: Filter by teacher (for teacher accounts)
- **Submission rate tracking**: Per student and per class
- **Integration with lesson notes**: Last homework comes from lesson_note.homework_text

#### Migration Priority
**HIGH** - 과제 관리는 교육 품질 추적의 핵심

---

### 9. Attendance Page (출결 관리) ❌ NEEDS MIGRATION

**파일**: `/attendance/page.tsx` (470 lines)

#### Mock Data Types
```typescript
interface TodayStudent {
  id: string
  student_id: string
  student_name: string
  class_id: string | null // null = 1:1 tutoring
  class_name: string | null
  scheduled_time: string // '1400~1600'
  teacher_id: string
  teacher_name: string
  is_one_on_one: boolean
  status: 'scheduled' | 'present' | 'late' | 'absent' | 'excused'
}
// Sample: 10 students today

interface Attendance {
  id: string
  created_at: string
  date: string
  class_id: string
  student_id: string
  status: 'present' | 'late' | 'absent' | 'excused'
  notes: string
}
// Sample: 8 historical records

// Charts data
const weeklyStats = [
  { date: '월', present: 28, late: 2, absent: 1, excused: 1 },
  // ... 5 days
]

const studentAttendanceRate = [
  { name: '김민준', rate: 100, present: 20, late: 0, absent: 0 },
  // ... 5 students
]
```

#### Supabase Status
- ❌ `attendance` - **Missing**
- ❌ `attendance_schedules` - **Missing** (today's scheduled students)

#### Modals
- None (uses tabs and inline status change)

#### Special Features
- **External Link**: "학생용 출결 페이지" (`/goldpen/liveattendance`) - 학생이 직접 등원/하원 체크
- **Teacher Filtering**: Teachers only see their own students
- **Real-time Stats**: Today's attendance rate calculated on-the-fly
- **Charts**: Weekly bar chart, student line chart (recharts)
- **Status Change**: Inline dropdown to change attendance status

#### Migration Priority
**HIGH** - 출결 관리는 학원 운영의 필수 기능

---

### 10. All Schedules V2 Page (전체 스케줄 Compact) ❌ NEEDS MIGRATION

**파일**: `/all-schedules-v2/page.tsx` (401 lines)

#### Mock Data Types
```typescript
// Uses same Room and RoomSchedule as rooms/page.tsx
interface Room { ... } // 5 rooms
interface RoomSchedule { ... } // 35 schedules

const timeSlots = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
]

const roomColors: Record<string, { bg: string; text: string; border: string }> = {
  '201호': { bg: 'bg-blue-500', ... },
  '202호': { bg: 'bg-green-500', ... },
  // ... 5 rooms with distinct colors
}
```

#### Supabase Status
- ✅ `rooms` - Exists
- ❌ `room_schedules` - **Missing**

#### Modals
- None (hover tooltip only)

#### Special Features
- **Compact Grid View**: Time slots (rows) × Days (columns)
- **Color Blocks**: Each room has distinct color
- **Hover Tooltip**: Shows all schedules in that time slot
- **Filters**: By room, by teacher
- **View Switcher**: Basic / Compact / Heat Map views

#### Migration Priority
**MEDIUM** - Alternative view of existing schedule data

---

### 11. All Schedules V3 Page (전체 스케줄 Heat Map) ❌ NEEDS MIGRATION

**파일**: `/all-schedules-v3/page.tsx` (848 lines)

#### Mock Data Types
```typescript
// Same as V2, but with heat map visualization
interface Room { ... } // 5 rooms
interface RoomSchedule { ... } // 35 schedules
```

#### Supabase Status
- ✅ `rooms` - Exists
- ❌ `room_schedules` - **Missing**

#### Modals
- None (hover tooltip only)

#### Special Features
- **Heat Map Grid**: Density-based coloring
  - 0 schedules: transparent
  - 1-2: light color
  - 3-4: medium color
  - 5+: dark color (highest density)
- **Hover Tooltip**: Detailed schedule list
- **Color Legend**: Room-based color coding
- **Filters**: By room, by teacher

#### Migration Priority
**LOW** - Alternative visualization, not core feature

---

### 12. Exams Page (시험 관리) ❌ FILE EMPTY

**파일**: `/exams/page.tsx`
**분석 결과**: 파일이 비어있거나 아직 구현되지 않음

#### 비고
- 향후 구현 예정으로 보임
- Mock data 없음

---

### 13. Lessons Page (수업일지) ❌ FILE EMPTY

**파일**: `/lessons/page.tsx`
**분석 결과**: 파일이 비어있거나 아직 구현되지 않음

#### 비고
- ✅ `lessons` table already exists (from previous analysis)
- ✅ Lesson notes have `homework_text` field
- 페이지 UI만 구현되지 않은 것으로 추정

---

### 14. Classes Page (반 관리) ❌ NEEDS MIGRATION

**파일**: `/classes/page.tsx` (1008 lines)

#### Mock Data Types
```typescript
interface Class {
  id: string
  created_at: string
  updated_at: string
  org_id: string
  name: string
  subject: string
  teacher_id: string
  teacher_name: string
  capacity: number
  current_students: number
  schedule: Array<{
    day: string // '월', '화', etc.
    start_time: string // 'HH:MM'
    end_time: string // 'HH:MM'
  }>
  room: string
  status: 'active' | 'inactive'
  notes?: string
  // Nested data
  students?: Array<{
    id: string
    name: string
    grade: string
    enrollment_date: string
  }>
}
// Sample: 2 classes

// Mock students for assignment (15 students)
const mockStudents = [
  { id: string, name: string, grade: string, school: string }
]
```

#### Supabase Status
- ❌ `classes` - **Missing**
- ❌ `class_enrollments` - **Missing** (junction table for students)

#### Modals
1. **Class Create/Edit Dialog** - Create/update class with schedule array
2. **Student List Dialog** - View enrolled students with remove option
3. **Student Assignment Dialog** - Multi-select students with search

#### Special Features
- **Schedule Array**: Multiple days/times per class (e.g., 월/수/금 14:00-16:00)
- **Student Search**: Real-time filtering by name/grade/school
- **Capacity Tracking**: Current vs max students
- **Status Badge**: Active/Inactive with color coding

#### Migration Priority
**HIGH** - 반 관리는 그룹 수업의 핵심 기능

---

### 15. Seats Page (독서실 좌석 관리) ❌ NEEDS MIGRATION

**파일**: `/seats/page.tsx` (1655 lines) - **가장 복잡한 페이지**

#### Mock Data Types
```typescript
interface Seat {
  id: string
  number: number
  student_id: string | null
  student_name: string | null
  status: 'checked_in' | 'checked_out' | 'vacant'
  type_name?: string
  check_in_time?: string
}
// Sample: 20 seats (configurable 1-100)

interface SeatType {
  id: string
  startNumber: number
  endNumber: number
  typeName: string // '일반석', '프리미엄석', '스탠딩석' etc.
}

interface LiveScreenState {
  student_id: string
  seat_number: number
  date: string
  sleep_count: number
  is_out: boolean
  timer_running: boolean
  current_sleep_id?: string
  current_outing_id?: string
}

interface SleepRecord {
  id: string
  created_at: string
  student_id: string
  seat_number: number
  date: string
  sleep_time: string
  wake_time?: string
  duration_minutes?: number
  status: 'sleeping' | 'awake'
}

interface OutingRecord {
  id: string
  created_at: string
  student_id: string
  seat_number: number
  date: string
  outing_time: string
  return_time?: string
  duration_minutes?: number
  reason: string
  status: 'out' | 'returned'
}

interface CallRecord {
  id: string
  created_at: string
  student_id: string
  seat_number: number
  date: string
  call_time: string
  acknowledged_time?: string
  message: string
  status: 'calling' | 'acknowledged'
}

interface ManagerCall {
  id: string
  created_at: string
  student_id: string
  seat_number: number
  date: string
  call_time: string
  acknowledged_time?: string
  reason: string
  status: 'calling' | 'acknowledged'
}
```

#### Supabase Status
- ❌ `seats` - **Missing**
- ❌ `seat_types` - **Missing**
- ❌ `sleep_records` - **Missing**
- ❌ `outing_records` - **Missing**
- ❌ `call_records` - **Missing**
- ❌ `manager_calls` - **Missing**
- ❌ `live_screen_states` - **Missing** (localStorage로 관리 중)

#### Modals
1. **Seat Configuration Dialog** - Set total seats (1-100) with type ranges
2. **Student Assignment Dialog** - Tabs for existing/new student with search
3. **Sleep Expiration Alert** - Full-screen red alarm when 1-minute sleep timer ends
4. **Call Student Modal** - Send message to student's LiveScreen
5. **Manager Call Alert** - Full-screen red overlay when student calls manager

#### Special Features - Real-time & Advanced
- **Supabase Realtime Subscriptions**:
  ```typescript
  useEffect(() => {
    const channel = supabase.channel('all-seats-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sleep_records' }, ...)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outing_records' }, ...)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_records' }, ...)
      .subscribe()
  }, [])
  ```
- **Custom Hook**: `useAllSeatsRealtime` for optimized realtime tracking
- **localStorage Integration**: Cross-tab state sync for LiveScreen
- **Web Audio Context**: Beep alarms for notifications
- **Advanced Components**:
  - `SleepStatus` - Countdown timer (1 minute) with expiration notification
  - `OutingStatus` - Elapsed time tracker
  - `ElapsedTime` - Study session duration (since check-in)
  - `LiveStatusIndicator` - Composite status display
  - `SeatCard` - Individual seat with all interactions

#### Key Code Pattern - Sleep Timer
```typescript
useEffect(() => {
  const calculateRemaining = () => {
    const now = Date.now()
    const sleepStart = new Date(sleepRecord.sleep_time).getTime()
    const elapsed = now - sleepStart
    const maxDuration = 1 * 60 * 1000 // 1 minute
    const remaining = maxDuration - elapsed

    if (remaining <= 0) {
      setRemaining('시간 종료')
      if (!hasNotifiedRef.current && sleepRecord.status === 'sleeping') {
        hasNotifiedRef.current = true
        onSleepExpiredRef.current(sleepRecord.seat_number, '')
      }
      return
    }
    // ... set remaining time
  }
  const interval = setInterval(calculateRemaining, 1000)
  return () => clearInterval(interval)
}, [sleepRecord.sleep_time])
```

#### Migration Priority
**HIGH** - 독서실 관리는 복잡도가 가장 높은 핵심 기능

---

## 🗄️ 완전한 Supabase 테이블 요약

### ✅ 이미 존재하는 테이블 (9개)
1. `billing_transactions` - 수입 내역
2. `expenses` - 지출 내역
3. `expense_categories` - 지출 카테고리
4. `revenue_categories` - 수입 카테고리
5. `teacher_salaries` - 강사 급여
6. `students` - 학생 정보
7. `teachers` - 강사 정보
8. `rooms` - 교실 정보
9. `lessons` - 수업일지 (homework_text 필드 포함)

### ❌ 생성 필요한 테이블 (22개)

#### 🔴 HIGH Priority (Week 1) - 11개
1. **`schedules`** (or `class_schedules`)
   - 용도: 주간 반별 수업 시간표
   - 관련 페이지: schedule, all-schedules

2. **`room_schedules`**
   - 용도: 교실별 1:1 스케줄
   - 관련 페이지: rooms, all-schedules-v2, all-schedules-v3

3. **`consultations`**
   - 용도: 상담 관리
   - 관련 페이지: consultations

4. **`waitlists`**
   - 용도: 상담 대기리스트
   - 관련 페이지: consultations

5. **`homework`**
   - 용도: 과제 등록
   - 관련 페이지: homework

6. **`homework_submissions`**
   - 용도: 학생별 과제 제출 현황
   - 관련 페이지: homework

7. **`attendance`**
   - 용도: 출결 기록
   - 관련 페이지: attendance

8. **`classes`**
   - 용도: 반 정보
   - 관련 페이지: classes, homework, attendance

9. **`class_enrollments`** (Junction)
   - 용도: 반-학생 연결
   - 관련 페이지: classes

10. **`teacher_classes`** (Junction)
    - 용도: 강사-반 연결
    - 관련 페이지: teachers, classes

11. **`seats`**
    - 용도: 독서실 좌석 정보
    - 관련 페이지: seats

#### 🟡 MEDIUM Priority (Week 2) - 7개
12. **`sleep_records`**
    - 용도: 졸음 기록 (독서실)
    - 관련 페이지: seats

13. **`outing_records`**
    - 용도: 외출 기록 (독서실)
    - 관련 페이지: seats

14. **`call_records`**
    - 용도: 학생 호출 기록
    - 관련 페이지: seats

15. **`manager_calls`**
    - 용도: 학생→관리자 호출
    - 관련 페이지: seats

16. **`seat_types`**
    - 용도: 좌석 타입 (일반석, 프리미엄석 등)
    - 관련 페이지: seats

17. **`student_files`**
    - 용도: 학생 첨부 파일
    - 관련 페이지: students

18. **`consultation_images`**
    - 용도: 상담 이미지 첨부
    - 관련 페이지: consultations

#### 🟢 LOW Priority (Week 3) - 4개
19. **`teacher_student_assignments`** (Junction)
    - 용도: 강사-학생 직접 연결 (1:1)
    - 관련 페이지: teachers

20. **`live_screen_states`**
    - 용도: 독서실 LiveScreen 상태 (현재 localStorage)
    - 관련 페이지: seats

21. **`attendance_schedules`**
    - 용도: 오늘 예정된 학생 목록
    - 관련 페이지: attendance

22. **`exams`** (향후)
    - 용도: 시험 관리
    - 관련 페이지: exams (not implemented yet)

---

## 🎨 Modal/Dialog 전체 목록 (20+)

### Form Dialogs (CRUD)
1. **Student Registration/Edit** - students/page.tsx
2. **Teacher Create/Edit** - teachers/page.tsx
3. **Room Schedule Creation** - rooms/page.tsx
4. **New Consultation** - consultations/page.tsx
5. **Class Create/Edit** - classes/page.tsx
6. **Seat Configuration** - seats/page.tsx
7. **Student Assignment (Seat)** - seats/page.tsx

### Detail View Dialogs
8. **Schedule Detail** - schedule/page.tsx
9. **Student Detail Modal** - StudentDetailModal component
10. **Teacher Detail Modal** - TeacherDetailModal component
11. **Consultation Detail** - consultations/page.tsx
12. **Homework Submissions** - homework/page.tsx
13. **Class Detail (Homework)** - homework/page.tsx

### Confirmation Dialogs
14. **Teacher Delete Confirmation** - teachers/page.tsx
15. **Enrollment Confirmation** - consultations/page.tsx

### Assignment/Selection Dialogs
16. **Student Assignment (Teacher)** - teachers/page.tsx
17. **Student List (Class)** - classes/page.tsx
18. **Student Assignment (Class)** - classes/page.tsx
19. **Add to Waitlist** - consultations/page.tsx
20. **New Waitlist** - consultations/page.tsx

### Alert/Notification Modals
21. **Sleep Expiration Alert** - seats/page.tsx (Full-screen red alarm)
22. **Call Student Modal** - seats/page.tsx
23. **Manager Call Alert** - seats/page.tsx (Full-screen red overlay)

---

## 📊 데이터 관계도

```
Organization (org_id)
  │
  ├─ Students
  │   ├─ Student Files (student_files)
  │   ├─ Attendance Records (attendance)
  │   ├─ Billing Transactions (billing_transactions)
  │   ├─ Homework Submissions (homework_submissions)
  │   ├─ Consultations (consultations)
  │   ├─ Class Enrollments (class_enrollments) → Classes
  │   ├─ Room Schedules (room_schedules) → Rooms
  │   ├─ Seats (seats)
  │   │   ├─ Sleep Records (sleep_records)
  │   │   ├─ Outing Records (outing_records)
  │   │   ├─ Call Records (call_records)
  │   │   └─ Manager Calls (manager_calls)
  │   └─ Teacher Assignments (teacher_student_assignments) → Teachers
  │
  ├─ Teachers
  │   ├─ Teacher Salaries (teacher_salaries)
  │   ├─ Teacher Classes (teacher_classes) → Classes
  │   ├─ Room Schedules (room_schedules) → Rooms
  │   └─ Lessons (lessons)
  │
  ├─ Classes
  │   ├─ Schedules (schedules / class_schedules)
  │   ├─ Class Enrollments (class_enrollments) → Students
  │   ├─ Teacher Classes (teacher_classes) → Teachers
  │   ├─ Homework (homework)
  │   │   └─ Homework Submissions (homework_submissions) → Students
  │   └─ Attendance (attendance) → Students
  │
  ├─ Rooms
  │   └─ Room Schedules (room_schedules)
  │       ├─ Teachers
  │       └─ Students
  │
  ├─ Consultations
  │   ├─ Consultation Images (consultation_images)
  │   └─ Waitlists (waitlists)
  │
  ├─ Expenses
  │   └─ Expense Categories (expense_categories)
  │
  └─ Seats (독서실)
      ├─ Seat Types (seat_types)
      ├─ Sleep Records (sleep_records) → Students
      ├─ Outing Records (outing_records) → Students
      ├─ Call Records (call_records) → Students
      └─ Manager Calls (manager_calls) → Students
```

---

## 🚀 마이그레이션 로드맵

### Week 1 (HIGH Priority) - Core Features
**목표**: 핵심 교육 운영 기능 활성화

#### Day 1-2: 스케줄 & 반 관리
- [ ] `schedules` or `class_schedules` 테이블 생성
- [ ] `room_schedules` 테이블 생성
- [ ] `classes` 테이블 생성
- [ ] `class_enrollments` 테이블 생성
- [ ] `teacher_classes` 테이블 생성
- [ ] RLS 정책 설정 (org_id 기반)

#### Day 3-4: 상담 & 과제 관리
- [ ] `consultations` 테이블 생성
- [ ] `waitlists` 테이블 생성
- [ ] `homework` 테이블 생성
- [ ] `homework_submissions` 테이블 생성
- [ ] RLS 정책 설정

#### Day 5: 출결 & 독서실 기본
- [ ] `attendance` 테이블 생성
- [ ] `seats` 테이블 생성
- [ ] RLS 정책 설정

---

### Week 2 (MEDIUM Priority) - Advanced Features
**목표**: 독서실 실시간 기능 & 파일 시스템

#### Day 1-2: 독서실 실시간 기능
- [ ] `sleep_records` 테이블 생성
- [ ] `outing_records` 테이블 생성
- [ ] `call_records` 테이블 생성
- [ ] `manager_calls` 테이블 생성
- [ ] `seat_types` 테이블 생성
- [ ] Supabase Realtime 설정
- [ ] RLS 정책 설정

#### Day 3-4: 파일 시스템
- [ ] `student_files` 테이블 생성
- [ ] `consultation_images` 테이블 생성
- [ ] Supabase Storage 버킷 설정 (files, images)
- [ ] 파일 업로드/다운로드 API 구현
- [ ] RLS 정책 설정

#### Day 5: 코드 마이그레이션 (Week 1 테이블)
- [ ] schedule/page.tsx → Supabase
- [ ] rooms/page.tsx → Supabase
- [ ] consultations/page.tsx → Supabase
- [ ] homework/page.tsx → Supabase
- [ ] attendance/page.tsx → Supabase
- [ ] classes/page.tsx → Supabase

---

### Week 3 (LOW Priority) - Optimization & Cleanup
**목표**: 성능 최적화 & 코드 정리

#### Day 1-2: 나머지 테이블 & 코드 마이그레이션
- [ ] `teacher_student_assignments` 테이블 생성
- [ ] `live_screen_states` 테이블 생성 (optional, localStorage 대체)
- [ ] `attendance_schedules` 테이블 생성
- [ ] seats/page.tsx → Supabase (realtime 포함)
- [ ] teachers/page.tsx junction tables 업데이트

#### Day 3: 성능 최적화
- [ ] Custom hooks 작성 (`useSchedules`, `useHomework`, etc.)
- [ ] Loading states 추가 (skeleton loaders)
- [ ] Error boundaries 구현
- [ ] Optimistic updates 적용

#### Day 4: 코드 정리
- [ ] Mock data 상수 전체 제거
- [ ] 사용하지 않는 컴포넌트 삭제 (Teacher Detail Dialog OLD)
- [ ] Type definitions 정리 (`/lib/types/database.ts`)
- [ ] 일관성 있는 네이밍 적용

#### Day 5: 테스트 & 문서화
- [ ] E2E 테스트 작성 (주요 플로우)
- [ ] API 문서 업데이트
- [ ] Migration 가이드 작성
- [ ] Production 배포

---

## 📈 현재 진행 상황

### 전체 마이그레이션 비율
```
완료: ████████░░░░░░░░░░░░░░░░░░░░░░░░ 30%

✅ 완료: 재무 관리 (100%)
⏳ 진행중: 학생/강사 기본 정보 (70%)
❌ 미착수: 스케줄, 상담, 과제, 출결, 반, 독서실 (0%)
```

### 테이블별 상태
| 카테고리 | 완료 | 진행중 | 미착수 | 총계 |
|---------|-----|--------|--------|------|
| 재무 | 5 | 0 | 0 | 5 |
| 학생/강사 | 3 | 0 | 3 | 6 |
| 스케줄 | 0 | 0 | 2 | 2 |
| 상담 | 0 | 0 | 3 | 3 |
| 과제 | 0 | 0 | 2 | 2 |
| 출결 | 0 | 0 | 2 | 2 |
| 반 관리 | 0 | 0 | 3 | 3 |
| 독서실 | 0 | 0 | 6 | 6 |
| 파일 | 0 | 0 | 2 | 2 |
| **총계** | **8** | **0** | **23** | **31** |

---

## 🔍 기술적 발견 사항

### 1. 복잡도 순위 (Top 5)
1. **Seats (독서실)** - 1655 lines, 6 tables, realtime subscriptions
2. **Consultations (상담)** - 1211 lines, 5 modals, image upload
3. **Classes (반 관리)** - 1008 lines, 3 modals, schedule arrays
4. **All Schedules V3** - 848 lines, heat map visualization
5. **Homework (과제)** - 668 lines, 2 views (student/class)

### 2. 실시간 기능 사용 (Realtime Subscriptions)
- **Seats Page**: Supabase Realtime으로 sleep_records, outing_records, call_records 실시간 추적
- **Custom Hook**: `useAllSeatsRealtime` 최적화된 realtime 훅
- **Challenge**: localStorage와 Supabase 상태 동기화 필요

### 3. 외부 의존성
- **학생용 출결 페이지**: `/goldpen/liveattendance` (attendance page에서 링크)
- **LiveScreen 컴포넌트**: 독서실 학생 개별 화면 (localStorage 기반)

### 4. 데이터 구조 패턴
- **Nested Arrays**: Classes에서 schedule array
- **Status Enums**: 거의 모든 테이블에 status 필드
- **Junction Tables**: teacher_classes, class_enrollments 등 다수

### 5. UI/UX 패턴
- **Tabs**: 대부분 페이지가 Tabs 사용 (오늘/기록/통계 등)
- **Search + Filter**: Student Assignment dialogs에서 공통 패턴
- **Charts**: recharts 라이브러리 사용 (bar, line, pie)
- **Real-time Updates**: Optimistic updates 패턴

---

## ⚠️ 주의사항 & 권장사항

### 1. 데이터 마이그레이션 시 주의사항
- **seats/sleep_records**: 1분 타이머 로직이 정확히 작동하는지 테스트 필요
- **consultations/images**: Base64 vs URL 저장 방식 결정 필요
- **classes/schedules**: 배열 vs 별도 테이블 (weekly_schedules) 구조 결정
- **homework**: lessons.homework_text와 통합 방식 설계

### 2. RLS 정책 설계
- **org_id 필터링**: 모든 테이블에 필수
- **Role-based Access**:
  - Admin: 전체 접근
  - Teacher: 자신의 반/학생만
  - Student: 자신의 데이터만

### 3. 성능 최적화
- **Indexes**: teacher_id, student_id, class_id, date 컬럼
- **Realtime**: seats 페이지 최적화 필수 (많은 subscription)
- **Pagination**: 학생/강사 목록, 상담 기록 등

### 4. 보안
- **File Upload**: Supabase Storage 정책 설정
- **Sensitive Data**: 학부모 연락처, 급여 정보 암호화 고려
- **API Rate Limiting**: Realtime subscription 제한

---

## 🎯 최종 결론

### 프로젝트 현황
- **전체 페이지**: 15개 분석 완료 (100%)
- **Mock Data Types**: 35+ distinct types documented
- **Modal/Dialog**: 20+ components identified
- **마이그레이션 완료율**: 약 30%

### 예상 작업량
- **Week 1 (HIGH)**: 스케줄, 반, 상담, 과제, 출결, 독서실 기본 (11 tables)
- **Week 2 (MEDIUM)**: 독서실 실시간, 파일 시스템, 코드 마이그레이션 (7 tables)
- **Week 3 (LOW)**: 최적화, 테스트, 배포 (4 tables)

**총 소요 예상 시간**: 3주 (full-time) 또는 6주 (part-time)

### 다음 단계
1. ✅ 분석 완료 (이 문서)
2. ⏳ Week 1 마이그레이션 시작
3. ⏳ Supabase 스키마 생성
4. ⏳ RLS 정책 설정
5. ⏳ 코드 리팩토링
6. ⏳ 테스트 & 배포

---

**문서 상태**: ✅ Phase 2 Complete - 전체 15개 페이지 분석 완료
**마지막 업데이트**: 2025-11-21
**다음 액션**: Week 1 마이그레이션 실행 (스케줄, 반, 상담, 과제, 출결, 독서실)
