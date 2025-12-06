ALTER TABLE students ADD COLUMN IF NOT EXISTS school TEXT;
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON students(teacher_id);
