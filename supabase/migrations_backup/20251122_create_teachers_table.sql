-- Create teachers table and backfill from users (role='teacher')
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('active','inactive')) DEFAULT 'active',
  employment_type TEXT NOT NULL CHECK (employment_type IN ('full_time','part_time','contract')) DEFAULT 'full_time',
  salary_type TEXT NOT NULL CHECK (salary_type IN ('monthly','hourly')) DEFAULT 'monthly',
  salary_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  hire_date DATE NOT NULL DEFAULT current_date,
  lesson_note_token TEXT UNIQUE,
  total_hours_worked NUMERIC(12,2) DEFAULT 0 CHECK (total_hours_worked >= 0),
  earned_salary NUMERIC(12,2) DEFAULT 0 CHECK (earned_salary >= 0),
  notes TEXT,
  UNIQUE(org_id, email)
);

CREATE INDEX IF NOT EXISTS idx_teachers_org_id ON teachers(org_id);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(org_id, status);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_employment_type ON teachers(org_id, employment_type);

-- Backfill teachers from users(role='teacher')
INSERT INTO teachers (id, org_id, user_id, name, email, phone, subjects, status, employment_type, salary_type, salary_amount, hire_date, notes)
SELECT gen_random_uuid(), u.org_id, u.id, u.name, u.email, u.phone,
       '[]'::jsonb,
       COALESCE(u.status, 'active'),
       'full_time', 'monthly', 0, COALESCE(u.created_at::date, current_date), NULL
FROM users u
WHERE u.role = 'teacher'
  AND NOT EXISTS (SELECT 1 FROM teachers t WHERE t.user_id = u.id);

-- Remap students.teacher_id to teachers.id
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_teacher_id_fkey;
ALTER TABLE students ADD COLUMN IF NOT EXISTS teacher_id_teacher UUID;
UPDATE students s
SET teacher_id_teacher = t.id
FROM teachers t
WHERE s.teacher_id = t.user_id;
ALTER TABLE students DROP COLUMN teacher_id;
ALTER TABLE students RENAME COLUMN teacher_id_teacher TO teacher_id;
ALTER TABLE students
  ADD CONSTRAINT students_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON students(teacher_id);

-- Remap classes.teacher_id if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='teacher_id') THEN
    ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_teacher_id_fkey;
    ALTER TABLE classes ADD COLUMN IF NOT EXISTS teacher_id_teacher UUID;
    UPDATE classes c SET teacher_id_teacher = t.id FROM teachers t WHERE c.teacher_id = t.user_id;
    ALTER TABLE classes DROP COLUMN teacher_id;
    ALTER TABLE classes RENAME COLUMN teacher_id_teacher TO teacher_id;
    ALTER TABLE classes
      ADD CONSTRAINT classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
  END IF;
END $$;

-- Remap schedules.teacher_id if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schedules' AND column_name='teacher_id') THEN
    ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_teacher_id_fkey;
    ALTER TABLE schedules ADD COLUMN IF NOT EXISTS teacher_id_teacher UUID;
    UPDATE schedules s SET teacher_id_teacher = t.id FROM teachers t WHERE s.teacher_id = t.user_id;
    ALTER TABLE schedules DROP COLUMN teacher_id;
    ALTER TABLE schedules RENAME COLUMN teacher_id_teacher TO teacher_id;
    ALTER TABLE schedules
      ADD CONSTRAINT schedules_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_schedules_teacher_id ON schedules(teacher_id);
  END IF;
END $$;

-- update trigger helper
CREATE OR REPLACE FUNCTION set_updated_at_teachers()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_teachers_updated_at ON teachers;
CREATE TRIGGER trg_teachers_updated_at
BEFORE UPDATE ON teachers
FOR EACH ROW EXECUTE PROCEDURE set_updated_at_teachers();
