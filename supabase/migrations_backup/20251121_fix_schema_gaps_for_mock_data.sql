-- =====================================================
-- Fix Schema Gaps for Mock Data Migration
-- Created: 2025-11-21
-- Purpose: Add missing fields to lessons and schedules tables
-- =====================================================

-- =====================================================
-- 1. ALTER TABLE lessons - Add missing fields for lesson notes
-- =====================================================

-- Mock data from lessons page requires these additional fields:
-- - content: Detailed lesson content (what was taught)
-- - homework_assigned: Homework given in this lesson
-- - comprehension_level: Student understanding level
-- - student_attitudes: Student behavior notes
-- - parent_feedback: Feedback message for parents
-- - next_lesson_plan: Plan for next lesson

DO $$
BEGIN
  -- Add content field (detailed lesson content)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'content'
  ) THEN
    ALTER TABLE lessons ADD COLUMN content TEXT;
    COMMENT ON COLUMN lessons.content IS 'Detailed lesson content - what was taught';
  END IF;

  -- Add homework_assigned field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'homework_assigned'
  ) THEN
    ALTER TABLE lessons ADD COLUMN homework_assigned TEXT;
    COMMENT ON COLUMN lessons.homework_assigned IS 'Homework given in this lesson';
  END IF;

  -- Add comprehension_level field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'comprehension_level'
  ) THEN
    ALTER TABLE lessons ADD COLUMN comprehension_level TEXT
      CHECK (comprehension_level IN ('high', 'medium', 'low'));
    COMMENT ON COLUMN lessons.comprehension_level IS 'Student understanding level: high, medium, or low';
  END IF;

  -- Add student_attitudes field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'student_attitudes'
  ) THEN
    ALTER TABLE lessons ADD COLUMN student_attitudes TEXT;
    COMMENT ON COLUMN lessons.student_attitudes IS 'Student behavior and attitude notes';
  END IF;

  -- Add parent_feedback field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'parent_feedback'
  ) THEN
    ALTER TABLE lessons ADD COLUMN parent_feedback TEXT;
    COMMENT ON COLUMN lessons.parent_feedback IS 'Feedback message for parents';
  END IF;

  -- Add next_lesson_plan field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'next_lesson_plan'
  ) THEN
    ALTER TABLE lessons ADD COLUMN next_lesson_plan TEXT;
    COMMENT ON COLUMN lessons.next_lesson_plan IS 'Plan for next lesson';
  END IF;
END $$;

-- =====================================================
-- 2. ALTER TABLE schedules - Add student fields for 1:1 tutoring
-- =====================================================

-- Mock data from rooms page shows schedules can have specific students assigned
-- This is needed for 1:1 tutoring sessions where a specific student is assigned
-- to a room at a specific time

DO $$
BEGIN
  -- Add student_id field (FK to students table)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'student_id'
  ) THEN
    ALTER TABLE schedules ADD COLUMN student_id UUID REFERENCES students(id) ON DELETE CASCADE;
    COMMENT ON COLUMN schedules.student_id IS 'Student assigned to this schedule (for 1:1 tutoring)';

    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_schedules_student_id ON schedules(student_id)
      WHERE student_id IS NOT NULL;
  END IF;

  -- Add student_name field (denormalized for display performance)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'student_name'
  ) THEN
    ALTER TABLE schedules ADD COLUMN student_name TEXT;
    COMMENT ON COLUMN schedules.student_name IS 'Student name (denormalized for display)';
  END IF;

  -- Add student_grade field (denormalized for display performance)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'student_grade'
  ) THEN
    ALTER TABLE schedules ADD COLUMN student_grade INTEGER;
    COMMENT ON COLUMN schedules.student_grade IS 'Student grade level (denormalized for display)';
  END IF;
END $$;

-- =====================================================
-- 3. Create trigger to auto-update denormalized student fields
-- =====================================================

-- When student_id is set, automatically populate student_name and student_grade
CREATE OR REPLACE FUNCTION update_schedule_student_info()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_id IS NOT NULL AND NEW.student_id IS DISTINCT FROM OLD.student_id THEN
    -- Fetch student info from students table
    SELECT name, grade::integer
    INTO NEW.student_name, NEW.student_grade
    FROM students
    WHERE id = NEW.student_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_schedule_student_info_trigger ON schedules;

CREATE TRIGGER update_schedule_student_info_trigger
  BEFORE INSERT OR UPDATE OF student_id ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_student_info();

-- =====================================================
-- 4. Add indexes for new fields (performance optimization)
-- =====================================================

-- Index for lessons content search (if needed for full-text search later)
CREATE INDEX IF NOT EXISTS idx_lessons_comprehension_level
  ON lessons(comprehension_level)
  WHERE comprehension_level IS NOT NULL;

-- Index for lessons by date and comprehension level (for analytics)
CREATE INDEX IF NOT EXISTS idx_lessons_date_comprehension
  ON lessons(org_id, lesson_date, comprehension_level)
  WHERE comprehension_level IS NOT NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Added to lessons table:
--   - content (TEXT)
--   - homework_assigned (TEXT)
--   - comprehension_level (TEXT with CHECK constraint)
--   - student_attitudes (TEXT)
--   - parent_feedback (TEXT)
--   - next_lesson_plan (TEXT)
--
-- Added to schedules table:
--   - student_id (UUID FK to students)
--   - student_name (TEXT, denormalized)
--   - student_grade (INTEGER, denormalized)
--   - Auto-update trigger for denormalized fields
--   - Performance indexes
-- =====================================================
