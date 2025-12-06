-- Add foreign key relationship between enrollments and classes
-- This enables Supabase PostgREST to perform JOIN operations

-- 1. Add foreign key constraint for class_id
ALTER TABLE enrollments
  ADD CONSTRAINT enrollments_class_id_fkey
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;

-- 2. Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);

-- 3. Optional: Add foreign key for teacher_id if needed
-- (enrollments 테이블에 teacher_id가 있지만 사용하지 않는 경우 주석 처리)
-- ALTER TABLE enrollments
--   ADD CONSTRAINT enrollments_teacher_id_fkey
--   FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT enrollments_class_id_fkey ON enrollments IS 'FK to classes table - enables PostgREST JOIN for student modal';
