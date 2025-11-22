-- Aggregate endpoint helper views/indexes
-- Light indexes to support aggregate counts
CREATE INDEX IF NOT EXISTS idx_students_org_teacher ON students(org_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_org_teacher ON classes(org_id, teacher_id);

-- materialized view alternative skipped; we use live aggregation
