-- Performance Optimization Indexes
-- Created: 2024-12-05
-- Purpose: Improve query performance for frequently accessed tables

-- =====================================================
-- ATTENDANCE INDEXES
-- =====================================================
-- 출결 조회 최적화 (org_id + date 조합이 가장 빈번)
CREATE INDEX IF NOT EXISTS idx_attendance_org_date
  ON attendance(org_id, date DESC);

-- 학생별/반별 출결 조회
CREATE INDEX IF NOT EXISTS idx_attendance_student_class
  ON attendance(student_id, class_id);

-- 상태별 조회 (출석/결석/지각 필터링)
CREATE INDEX IF NOT EXISTS idx_attendance_org_status
  ON attendance(org_id, status);

-- 날짜 범위 쿼리 (주간/월간 통계)
CREATE INDEX IF NOT EXISTS idx_attendance_date_status
  ON attendance(date, status);

-- =====================================================
-- CLASS ENROLLMENTS INDEXES
-- =====================================================
-- 반별 학생 조회 최적화
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_status
  ON class_enrollments(class_id, status);

-- 학생별 수강 목록
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_status
  ON class_enrollments(student_id, status);

-- 조직별 전체 등록 조회
CREATE INDEX IF NOT EXISTS idx_class_enrollments_org_status
  ON class_enrollments(org_id, status);

-- =====================================================
-- LESSONS INDEXES
-- =====================================================
-- 강사별 수업 조회
CREATE INDEX IF NOT EXISTS idx_lessons_teacher_date
  ON lessons(teacher_id, lesson_date DESC);

-- 반별 수업 조회
CREATE INDEX IF NOT EXISTS idx_lessons_class_date
  ON lessons(class_id, lesson_date DESC);

-- 조직별 수업 목록
CREATE INDEX IF NOT EXISTS idx_lessons_org_date
  ON lessons(org_id, lesson_date DESC);

-- =====================================================
-- STUDENTS INDEXES
-- =====================================================
-- 학생 코드 검색
CREATE INDEX IF NOT EXISTS idx_students_org_code
  ON students(org_id, student_code);

-- 학생 이름 검색 (ILIKE 최적화용 - pg_trgm 필요 시 별도)
CREATE INDEX IF NOT EXISTS idx_students_org_name
  ON students(org_id, name);

-- =====================================================
-- CLASSES INDEXES
-- =====================================================
-- 강사별 반 조회
CREATE INDEX IF NOT EXISTS idx_classes_teacher
  ON classes(teacher_id);

-- 조직별 반 목록
CREATE INDEX IF NOT EXISTS idx_classes_org_status
  ON classes(org_id, status);

-- =====================================================
-- BILLING TRANSACTIONS INDEXES
-- =====================================================
-- 월별 매출 집계용
CREATE INDEX IF NOT EXISTS idx_billing_transactions_org_date
  ON billing_transactions(org_id, created_at DESC);

-- =====================================================
-- USERS INDEXES
-- =====================================================
-- 조직별 사용자 조회
CREATE INDEX IF NOT EXISTS idx_users_org_role
  ON users(org_id, role);

-- =====================================================
-- SCHEDULES INDEXES
-- =====================================================
-- 요일별 스케줄 조회
CREATE INDEX IF NOT EXISTS idx_schedules_org_day
  ON schedules(org_id, day_of_week);

-- 반별 스케줄
CREATE INDEX IF NOT EXISTS idx_schedules_class
  ON schedules(class_id);

-- =====================================================
-- HOMEWORK INDEXES
-- =====================================================
-- 반별 과제 조회
CREATE INDEX IF NOT EXISTS idx_homework_class_date
  ON homework(class_id, due_date DESC);

-- 조직별 과제 목록
CREATE INDEX IF NOT EXISTS idx_homework_org_status
  ON homework(org_id, status);

-- =====================================================
-- NOTIFICATION LOGS INDEXES
-- =====================================================
-- 타입별 알림 조회
CREATE INDEX IF NOT EXISTS idx_notification_logs_org_type
  ON notification_logs(org_id, type);

-- 날짜별 알림 조회
CREATE INDEX IF NOT EXISTS idx_notification_logs_created
  ON notification_logs(created_at DESC);

-- Done!
