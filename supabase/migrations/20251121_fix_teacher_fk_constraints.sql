-- Fix FK constraints: teacher_id should reference teachers table, not users table

-- 1. Drop existing FK constraints
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_teacher_id_fkey;
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_teacher_id_fkey;

-- 2. Add new FK constraints referencing teachers table
ALTER TABLE schedules
ADD CONSTRAINT schedules_teacher_id_fkey
FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

ALTER TABLE classes
ADD CONSTRAINT classes_teacher_id_fkey
FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

-- 3. Assign teacher_id to classes (round-robin)
WITH teacher_list AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 as idx
  FROM teachers WHERE org_id = 'dddd0000-0000-0000-0000-000000000000'
),
class_list AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 as idx
  FROM classes WHERE org_id = 'dddd0000-0000-0000-0000-000000000000'
)
UPDATE classes c
SET teacher_id = (
  SELECT t.id FROM teacher_list t
  WHERE t.idx = (SELECT cl.idx FROM class_list cl WHERE cl.id = c.id) % (SELECT COUNT(*) FROM teacher_list)
)
WHERE org_id = 'dddd0000-0000-0000-0000-000000000000';

-- 4. Copy teacher_id from classes to schedules
UPDATE schedules s
SET teacher_id = (SELECT c.teacher_id FROM classes c WHERE c.id = s.class_id)
WHERE org_id = 'dddd0000-0000-0000-0000-000000000000' AND class_id IS NOT NULL;
