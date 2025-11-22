-- Distribute unassigned schedules evenly across the first 4 teachers per org.
-- Safe to run multiple times; only fills schedules.teacher_id where it is NULL.
-- Requires tables: teachers (id, org_id), schedules (id, org_id, teacher_id, created_at).

WITH candidate_teachers AS (
  SELECT
    id,
    org_id,
    ROW_NUMBER() OVER (PARTITION BY org_id ORDER BY created_at NULLS LAST, id) AS rn
  FROM teachers
),
target_teachers AS (
  SELECT *
  FROM candidate_teachers
  WHERE rn <= 4 -- only first 4 teachers per org
),
unassigned_schedules AS (
  SELECT
    id,
    org_id,
    ROW_NUMBER() OVER (PARTITION BY org_id ORDER BY created_at NULLS LAST, id) AS rn
  FROM schedules
  WHERE teacher_id IS NULL
)
UPDATE schedules s
SET teacher_id = tt.id
FROM target_teachers tt
JOIN unassigned_schedules us
  ON us.org_id = tt.org_id
  AND ((us.rn - 1) % 4) + 1 = tt.rn
WHERE s.id = us.id;

-- Optional: verify distribution
-- SELECT org_id, teacher_id, COUNT(*) AS schedule_count
-- FROM schedules
-- GROUP BY org_id, teacher_id
-- ORDER BY org_id, schedule_count DESC;
