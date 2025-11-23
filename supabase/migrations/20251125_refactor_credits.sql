-- ====================================================================
-- Credit System Refactoring: Rename and Consolidate
-- Purpose: Simplify credit tracking by moving to students table
-- ====================================================================

-- Step 1: Add new columns to students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS credit INTEGER DEFAULT 0 CHECK (credit >= 0),
  ADD COLUMN IF NOT EXISTS seatsremainingtime INTEGER DEFAULT 0 CHECK (seatsremainingtime >= 0);

COMMENT ON COLUMN students.credit IS '수업 크레딧 (시간 단위)';
COMMENT ON COLUMN students.seatsremainingtime IS '독서실 남은 시간 (분 단위)';

-- Step 2: Migrate data from class_credits to students.credit
UPDATE students s
SET credit = COALESCE(
  (
    SELECT SUM(remaining_hours)
    FROM class_credits cc
    WHERE cc.student_id = s.id
      AND cc.status = 'active'
      AND (cc.expiry_date IS NULL OR cc.expiry_date >= CURRENT_DATE)
  ),
  0
)
WHERE EXISTS (SELECT 1 FROM class_credits WHERE student_id = s.id);

-- Step 3: Migrate data from study_room_passes to students.seatsremainingtime
UPDATE students s
SET seatsremainingtime = COALESCE(
  (
    SELECT SUM(
      CASE
        WHEN pass_type = 'hours' THEN remaining_amount * 60
        WHEN pass_type = 'days' THEN remaining_amount * 24 * 60
        ELSE 0
      END
    )
    FROM study_room_passes srp
    WHERE srp.student_id = s.id
      AND srp.status = 'active'
      AND (srp.expiry_date IS NULL OR srp.expiry_date >= CURRENT_DATE)
  ),
  0
)
WHERE EXISTS (SELECT 1 FROM study_room_passes WHERE student_id = s.id);

-- Step 4: Merge existing remaining_minutes into seatsremainingtime
UPDATE students
SET seatsremainingtime = GREATEST(seatsremainingtime, COALESCE(remaining_minutes, 0));

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_students_credit ON students(credit) WHERE credit > 0;
CREATE INDEX IF NOT EXISTS idx_students_seatsremainingtime ON students(seatsremainingtime) WHERE seatsremainingtime > 0;

-- Step 6: Backup old tables before dropping
CREATE TABLE IF NOT EXISTS class_credits_backup AS SELECT * FROM class_credits;
CREATE TABLE IF NOT EXISTS study_room_passes_backup AS SELECT * FROM study_room_passes;

-- Step 7: Drop old tables
DROP TABLE IF EXISTS class_credits CASCADE;
DROP TABLE IF EXISTS study_room_passes CASCADE;

-- Step 8: Drop old column
ALTER TABLE students DROP COLUMN IF EXISTS remaining_minutes;

-- Step 9: Update payments table to remove FK references
ALTER TABLE payments DROP COLUMN IF EXISTS granted_credits_id;
ALTER TABLE payments DROP COLUMN IF EXISTS granted_pass_id;

-- Step 10: Validation
DO $$
DECLARE
  total_students INTEGER;
  students_with_credit INTEGER;
  students_with_seats INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_students FROM students;
  SELECT COUNT(*) INTO students_with_credit FROM students WHERE credit > 0;
  SELECT COUNT(*) INTO students_with_seats FROM students WHERE seatsremainingtime > 0;

  RAISE NOTICE 'Migration completed:';
  RAISE NOTICE '  Total students: %', total_students;
  RAISE NOTICE '  Students with credit: %', students_with_credit;
  RAISE NOTICE '  Students with seats time: %', students_with_seats;
END $$;
