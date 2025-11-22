-- Dummy attendance seed for existing students/classes
-- Generates attendance records for the past 7 days (excluding today)
-- Only Mon–Fri (isodow 1..5)
-- Status distribution: ~80% present, 15% late, 5% absent

WITH dates AS (
  SELECT (CURRENT_DATE - offs) AS attendance_date
  FROM generate_series(1, 7) AS offs
  WHERE EXTRACT(ISODOW FROM (CURRENT_DATE - offs)) BETWEEN 1 AND 5
),
enrolled AS (
  SELECT ce.class_id, ce.student_id, c.org_id
  FROM class_enrollments ce
  JOIN classes c ON c.id = ce.class_id
  WHERE ce.status = 'active'
),
base_rows AS (
  SELECT
    e.org_id,
    e.class_id,
    e.student_id,
    d.attendance_date AS date,
    CASE
      WHEN random() < 0.05 THEN 'absent'
      WHEN random() < 0.20 THEN 'late'
      ELSE 'present'
    END AS status,
    -- 08:55 ~ 09:15 between 0 and 20 minutes offset
    (d.attendance_date + time '08:55' + make_interval(mins => floor(random()*20)::int)) AS check_in_time
  FROM dates d
  JOIN enrolled e ON true
)
INSERT INTO attendance (org_id, class_id, student_id, date, status, check_in_time)
SELECT org_id, class_id, student_id, date, status, check_in_time
FROM base_rows
ON CONFLICT (org_id, class_id, student_id, date) DO NOTHING;

-- Summary
SELECT
  COUNT(*) FILTER (WHERE status = 'present') AS inserted_present,
  COUNT(*) FILTER (WHERE status = 'late') AS inserted_late,
  COUNT(*) FILTER (WHERE status = 'absent') AS inserted_absent
FROM base_rows;
