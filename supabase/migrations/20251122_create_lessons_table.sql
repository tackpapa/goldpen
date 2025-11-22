-- Create lessons table for class journals
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  class_id uuid,
  teacher_id uuid,
  student_id uuid,
  lesson_date date NOT NULL,
  lesson_time text,
  duration_minutes integer,
  subject text,
  content text,
  student_attitudes text,
  comprehension_level text,
  homework_assigned text,
  next_lesson_plan text,
  parent_feedback text,
  director_feedback text,
  final_message text,
  notification_sent boolean DEFAULT false,
  notification_sent_at timestamptz,
  attendance jsonb DEFAULT '[]'::jsonb,
  homework_submissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lessons_org_date ON lessons(org_id, lesson_date DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher ON lessons(org_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_class ON lessons(org_id, class_id);

ALTER TABLE lessons
  ADD CONSTRAINT lessons_comprehension_level_check
  CHECK (comprehension_level IS NULL OR comprehension_level = ANY (ARRAY['high','medium','low']));
