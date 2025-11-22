-- Performance indexes for teacher dashboard & schedules
CREATE INDEX IF NOT EXISTS idx_teachers_org_created_at ON teachers(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);

CREATE INDEX IF NOT EXISTS idx_classes_org_teacher ON classes(org_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_org_created_at ON classes(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_students_org_teacher_class ON students(org_id, teacher_id, class_id);
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);

CREATE INDEX IF NOT EXISTS idx_lessons_org_class_date ON lessons(org_id, class_id, lesson_date);

CREATE INDEX IF NOT EXISTS idx_homework_org_due ON homework(org_id, due_date);
CREATE INDEX IF NOT EXISTS idx_exams_org_date ON exams(org_id, exam_date);
