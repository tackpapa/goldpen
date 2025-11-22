-- Exams
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  title text NOT NULL,
  subject text,
  exam_date date NOT NULL,
  max_score numeric,
  description text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exams_org_date ON exams(org_id, exam_date DESC);

-- Homework
CREATE TABLE IF NOT EXISTS homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date date,
  class_id uuid,
  teacher_id uuid,
  status text DEFAULT 'assigned', -- assigned | submitted | graded
  submission_url text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_homework_org_due ON homework(org_id, due_date DESC);
