-- Add foreign key relationship for class_enrollments.student_id
-- This enables Supabase PostgREST to perform JOIN operations

-- Add foreign key constraint for student_id
ALTER TABLE class_enrollments
  ADD CONSTRAINT class_enrollments_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON class_enrollments(class_id);

COMMENT ON CONSTRAINT class_enrollments_student_id_fkey ON class_enrollments IS 'FK to students table - enables PostgREST JOIN for class student list';
