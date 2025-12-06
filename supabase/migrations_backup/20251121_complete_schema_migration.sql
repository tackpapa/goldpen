-- =====================================================
-- GoldPen Complete Schema Migration
-- Created: 2025-11-21
-- Purpose: Migrate all mock data structures to Supabase
-- =====================================================

-- =====================================================
-- 1. ENUM TYPES
-- =====================================================

-- Attendance status
CREATE TYPE attendance_status AS ENUM (
  'scheduled',
  'present',
  'late',
  'absent',
  'excused'
);

-- Consultation status
CREATE TYPE consultation_status AS ENUM (
  'new',
  'scheduled',
  'completed',
  'enrolled',
  'rejected',
  'on_hold',
  'waitlist'
);

-- Seat status
CREATE TYPE seat_status AS ENUM (
  'vacant',
  'checked_in',
  'checked_out'
);

-- Activity status (for sleep, outing, call records)
CREATE TYPE activity_status AS ENUM (
  'active',
  'completed'
);

-- Payment method
CREATE TYPE payment_method AS ENUM (
  'cash',
  'card',
  'bank_transfer',
  'mobile'
);

-- =====================================================
-- 2. FINANCIAL TABLES
-- =====================================================

-- Billing transactions (revenue)
CREATE TABLE billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE SET NULL,

  amount INTEGER NOT NULL, -- In cents to avoid float precision issues
  payment_method payment_method NOT NULL,
  payment_date DATE NOT NULL,

  description TEXT,
  notes TEXT,
  receipt_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT billing_transactions_amount_check CHECK (amount >= 0)
);

-- Indexes for billing
CREATE INDEX idx_billing_org_date ON billing_transactions(org_id, payment_date DESC);
CREATE INDEX idx_billing_student ON billing_transactions(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_billing_created ON billing_transactions(org_id, created_at DESC);

-- Expense categories
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  color TEXT, -- For UI display (hex color)

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(org_id, name)
);

CREATE INDEX idx_expense_categories_org ON expense_categories(org_id);

-- Expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,

  amount INTEGER NOT NULL, -- In cents
  expense_date DATE NOT NULL,

  description TEXT NOT NULL,
  notes TEXT,
  receipt_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT expenses_amount_check CHECK (amount >= 0)
);

CREATE INDEX idx_expenses_org_date ON expenses(org_id, expense_date DESC);
CREATE INDEX idx_expenses_category ON expenses(category_id) WHERE category_id IS NOT NULL;

-- =====================================================
-- 3. ACADEMIC TABLES
-- =====================================================

-- Homework assignments
CREATE TABLE homework_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,

  assigned_date DATE NOT NULL,
  due_date DATE NOT NULL,

  attachments JSONB DEFAULT '[]'::jsonb, -- Array of {name, url}

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT homework_due_after_assigned CHECK (due_date >= assigned_date)
);

CREATE INDEX idx_homework_class_due ON homework_assignments(class_id, due_date);
CREATE INDEX idx_homework_org_due ON homework_assignments(org_id, due_date);
CREATE INDEX idx_homework_teacher ON homework_assignments(teacher_id) WHERE teacher_id IS NOT NULL;

-- Homework submissions
CREATE TABLE homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES homework_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'pending', -- pending, submitted, graded
  submitted_at TIMESTAMPTZ,

  submission_content TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,

  grade INTEGER, -- 0-100
  feedback TEXT,
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES teachers(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(assignment_id, student_id),
  CONSTRAINT homework_grade_valid CHECK (grade IS NULL OR (grade >= 0 AND grade <= 100))
);

CREATE INDEX idx_submissions_student ON homework_submissions(student_id, created_at DESC);
CREATE INDEX idx_submissions_assignment ON homework_submissions(assignment_id);
CREATE INDEX idx_submissions_status ON homework_submissions(assignment_id, status);

-- Exams
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_date DATE NOT NULL,
  duration_minutes INTEGER,

  total_score INTEGER NOT NULL DEFAULT 100,
  description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exams_class_date ON exams(class_id, exam_date DESC);
CREATE INDEX idx_exams_org_date ON exams(org_id, exam_date DESC);
CREATE INDEX idx_exams_org_subject ON exams(org_id, subject, exam_date DESC);

-- Exam scores
CREATE TABLE exam_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  score INTEGER NOT NULL,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(exam_id, student_id),
  CONSTRAINT exam_scores_valid CHECK (score >= 0)
);

CREATE INDEX idx_exam_scores_student ON exam_scores(student_id);
CREATE INDEX idx_exam_scores_exam ON exam_scores(exam_id);

-- Lessons (수업일지)
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,

  lesson_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,

  title TEXT NOT NULL,
  content TEXT NOT NULL, -- What was taught
  homework_assigned TEXT, -- Homework given

  student_feedback JSONB DEFAULT '[]'::jsonb, -- [{student_id, feedback}]
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lessons_class_date ON lessons(class_id, lesson_date DESC);
CREATE INDEX idx_lessons_org_date ON lessons(org_id, lesson_date DESC);
CREATE INDEX idx_lessons_teacher ON lessons(teacher_id) WHERE teacher_id IS NOT NULL;

-- =====================================================
-- 4. ATTENDANCE SYSTEM
-- =====================================================

-- Attendance records
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,

  attendance_date DATE NOT NULL,
  scheduled_start_time TIME,
  scheduled_end_time TIME,

  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,

  status attendance_status NOT NULL DEFAULT 'scheduled',
  is_one_on_one BOOLEAN NOT NULL DEFAULT FALSE,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate attendance records
  UNIQUE(student_id, class_id, attendance_date)
);

CREATE INDEX idx_attendance_org_date ON attendance_records(org_id, attendance_date DESC);
CREATE INDEX idx_attendance_student_date ON attendance_records(student_id, attendance_date DESC);
CREATE INDEX idx_attendance_class_date ON attendance_records(class_id, attendance_date DESC);
CREATE INDEX idx_attendance_teacher ON attendance_records(teacher_id) WHERE teacher_id IS NOT NULL;
CREATE INDEX idx_attendance_status ON attendance_records(org_id, status) WHERE status != 'present';

-- =====================================================
-- 5. CONSULTATION & LEAD MANAGEMENT
-- =====================================================

-- Consultations
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Lead information
  student_name TEXT NOT NULL,
  student_grade INTEGER,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,

  -- Consultation details
  goals TEXT,
  preferred_times TEXT,
  source TEXT, -- Where did they hear about us?

  -- Status tracking
  status consultation_status NOT NULL DEFAULT 'new',
  scheduled_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,

  -- Results
  enrolled_date TIMESTAMPTZ,
  enrolled_student_id UUID REFERENCES students(id) ON DELETE SET NULL,

  notes TEXT,
  internal_notes TEXT, -- Private staff notes

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consultations_org_status ON consultations(org_id, status);
CREATE INDEX idx_consultations_org_date ON consultations(org_id, created_at DESC);
CREATE INDEX idx_consultations_scheduled ON consultations(scheduled_date) WHERE scheduled_date IS NOT NULL;
CREATE INDEX idx_consultations_parent_phone ON consultations(org_id, parent_phone);

-- Consultation images/attachments
CREATE TABLE consultation_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,

  image_url TEXT NOT NULL,
  image_name TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consultation_images ON consultation_images(consultation_id);

-- Waitlists (for managing consultation queues)
CREATE TABLE waitlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  max_size INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(org_id, name)
);

-- Waitlist entries (many-to-many)
CREATE TABLE waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_id UUID NOT NULL REFERENCES waitlists(id) ON DELETE CASCADE,
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,

  position INTEGER NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(waitlist_id, consultation_id),
  UNIQUE(waitlist_id, position)
);

CREATE INDEX idx_waitlist_entries ON waitlist_entries(waitlist_id, position);

-- =====================================================
-- 6. SEAT MANAGEMENT SYSTEM (독서실)
-- =====================================================

-- Seats (독서실 좌석)
CREATE TABLE seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,

  seat_number INTEGER NOT NULL,
  seat_type TEXT, -- regular, premium, quiet, etc.

  -- Current assignment
  current_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  status seat_status NOT NULL DEFAULT 'vacant',
  checked_in_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(org_id, seat_number)
);

CREATE INDEX idx_seats_org ON seats(org_id, seat_number);
CREATE INDEX idx_seats_student ON seats(current_student_id) WHERE current_student_id IS NOT NULL;
CREATE INDEX idx_seats_status ON seats(org_id, status);

-- Sleep tracking
CREATE TABLE seat_sleep_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  sleep_date DATE NOT NULL,
  sleep_time TIMESTAMPTZ NOT NULL,
  wake_time TIMESTAMPTZ,

  duration_minutes INTEGER,
  status activity_status NOT NULL DEFAULT 'active',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sleep_seat_date ON seat_sleep_records(seat_id, sleep_date DESC);
CREATE INDEX idx_sleep_student_date ON seat_sleep_records(student_id, sleep_date DESC);
CREATE INDEX idx_sleep_active ON seat_sleep_records(seat_id) WHERE status = 'active';

-- Outing tracking
CREATE TABLE seat_outing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  outing_date DATE NOT NULL,
  outing_time TIMESTAMPTZ NOT NULL,
  return_time TIMESTAMPTZ,

  reason TEXT NOT NULL,
  duration_minutes INTEGER,
  status activity_status NOT NULL DEFAULT 'active',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outing_seat_date ON seat_outing_records(seat_id, outing_date DESC);
CREATE INDEX idx_outing_student_date ON seat_outing_records(student_id, outing_date DESC);
CREATE INDEX idx_outing_active ON seat_outing_records(seat_id) WHERE status = 'active';

-- Call system (student calling manager)
CREATE TABLE seat_call_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  call_date DATE NOT NULL,
  call_time TIMESTAMPTZ NOT NULL,
  acknowledged_time TIMESTAMPTZ,

  message TEXT NOT NULL,
  status activity_status NOT NULL DEFAULT 'active',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_call_seat_date ON seat_call_records(seat_id, call_date DESC);
CREATE INDEX idx_call_active ON seat_call_records(seat_id) WHERE status = 'active';

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_billing_transactions_updated_at
  BEFORE UPDATE ON billing_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_homework_assignments_updated_at
  BEFORE UPDATE ON homework_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_homework_submissions_updated_at
  BEFORE UPDATE ON homework_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exams_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_scores_updated_at
  BEFORE UPDATE ON exam_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consultations_updated_at
  BEFORE UPDATE ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waitlists_updated_at
  BEFORE UPDATE ON waitlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seats_updated_at
  BEFORE UPDATE ON seats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seat_sleep_records_updated_at
  BEFORE UPDATE ON seat_sleep_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seat_outing_records_updated_at
  BEFORE UPDATE ON seat_outing_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seat_call_records_updated_at
  BEFORE UPDATE ON seat_call_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate duration for sleep records
CREATE OR REPLACE FUNCTION calculate_activity_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'seat_sleep_records' THEN
    IF NEW.wake_time IS NOT NULL AND NEW.sleep_time IS NOT NULL THEN
      NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.wake_time - NEW.sleep_time)) / 60;
      NEW.status = 'completed';
    END IF;
  ELSIF TG_TABLE_NAME = 'seat_outing_records' THEN
    IF NEW.return_time IS NOT NULL AND NEW.outing_time IS NOT NULL THEN
      NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.return_time - NEW.outing_time)) / 60;
      NEW.status = 'completed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_sleep_duration_trigger
  BEFORE UPDATE ON seat_sleep_records
  FOR EACH ROW
  EXECUTE FUNCTION calculate_activity_duration();

CREATE TRIGGER calculate_outing_duration_trigger
  BEFORE UPDATE ON seat_outing_records
  FOR EACH ROW
  EXECUTE FUNCTION calculate_activity_duration();

-- Auto-acknowledge call records
CREATE OR REPLACE FUNCTION acknowledge_call()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.acknowledged_time IS NOT NULL AND OLD.acknowledged_time IS NULL THEN
    NEW.status = 'completed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER acknowledge_call_trigger
  BEFORE UPDATE ON seat_call_records
  FOR EACH ROW
  EXECUTE FUNCTION acknowledge_call();

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_sleep_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_outing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_call_records ENABLE ROW LEVEL SECURITY;

-- Note: Actual RLS policies will be created in a separate migration file
-- to keep this migration focused on schema creation.
-- See: 20251121_rls_policies.sql

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Total tables created: 17
-- Total indexes created: 50+
-- Total triggers created: 17
-- =====================================================
