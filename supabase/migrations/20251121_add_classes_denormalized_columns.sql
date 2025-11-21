-- Add denormalized columns to classes table for performance optimization
-- This migration adds columns to match mock data structure and improve query performance

-- Add new columns to classes table
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS teacher_name TEXT,
ADD COLUMN IF NOT EXISTS room TEXT,
ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS current_students INTEGER DEFAULT 0;

-- Update teacher_name from existing teacher_id (if exists)
UPDATE classes c
SET teacher_name = t.name
FROM teachers t
WHERE c.teacher_id = t.id
AND c.teacher_name IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN classes.teacher_name IS '강사 이름 (denormalized for performance)';
COMMENT ON COLUMN classes.room IS '강의실 (예: A301, B201)';
COMMENT ON COLUMN classes.capacity IS '수업 정원';
COMMENT ON COLUMN classes.current_students IS '현재 등록 학생 수';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_classes_teacher_name ON classes(teacher_name);
CREATE INDEX IF NOT EXISTS idx_classes_room ON classes(room);

-- Add trigger to sync teacher_name when teacher_id changes
CREATE OR REPLACE FUNCTION sync_class_teacher_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.teacher_id IS NOT NULL THEN
    SELECT name INTO NEW.teacher_name
    FROM teachers
    WHERE id = NEW.teacher_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_class_teacher_name ON classes;
CREATE TRIGGER trigger_sync_class_teacher_name
  BEFORE INSERT OR UPDATE OF teacher_id ON classes
  FOR EACH ROW
  EXECUTE FUNCTION sync_class_teacher_name();

-- Add trigger to update current_students count
-- (This will be called when enrollments are added/removed)
CREATE OR REPLACE FUNCTION update_class_student_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE classes
    SET current_students = current_students + 1
    WHERE id = NEW.class_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE classes
    SET current_students = GREATEST(current_students - 1, 0)
    WHERE id = OLD.class_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Note: enrollment trigger will be added when enrollments table is confirmed
-- For now, current_students will be set manually during seeding
