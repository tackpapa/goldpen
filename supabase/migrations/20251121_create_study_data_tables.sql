-- ============================================
-- STUDY DATA TABLES FOR LIVESCREEN
-- 학생 공부 데이터 스키마
-- ============================================

-- 1. subjects (학생별 과목 정의)
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#4A90E2', -- hex color
  "order" INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(student_id, name)
);

-- 2. study_sessions (과목별 공부 세션)
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  subject_name VARCHAR(100) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled'))
);

-- 3. daily_study_stats (일일 과목별 통계 - 집계용)
CREATE TABLE IF NOT EXISTS daily_study_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  subject_name VARCHAR(100) NOT NULL,
  subject_color VARCHAR(7) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_seconds INTEGER NOT NULL DEFAULT 0,
  session_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(student_id, subject_id, date)
);

-- 4. daily_planners (일일 플래너)
CREATE TABLE IF NOT EXISTS daily_planners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  study_plans JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- study_plans structure: [{ id, subject, description, completed }]
  notes TEXT,
  UNIQUE(student_id, date)
);

-- 5. study_time_records (학생 일일 총 공부 시간)
CREATE TABLE IF NOT EXISTS study_time_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name VARCHAR(100) NOT NULL,
  seat_number INTEGER,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  UNIQUE(student_id, date)
);

-- ============================================
-- INDEXES
-- ============================================

-- subjects indexes
CREATE INDEX IF NOT EXISTS idx_subjects_student_id ON subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_subjects_org_id ON subjects(org_id);

-- study_sessions indexes
CREATE INDEX IF NOT EXISTS idx_study_sessions_student_id ON study_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_subject_id ON study_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON study_sessions(date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_org_date ON study_sessions(org_id, date);

-- daily_study_stats indexes
CREATE INDEX IF NOT EXISTS idx_daily_study_stats_student_date ON daily_study_stats(student_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_study_stats_org_date ON daily_study_stats(org_id, date);

-- daily_planners indexes
CREATE INDEX IF NOT EXISTS idx_daily_planners_student_date ON daily_planners(student_id, date);

-- study_time_records indexes
CREATE INDEX IF NOT EXISTS idx_study_time_records_student_date ON study_time_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_study_time_records_org_date ON study_time_records(org_id, date);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_study_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_planners ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_time_records ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their org's data
CREATE POLICY "subjects_org_access" ON subjects
  FOR ALL USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "study_sessions_org_access" ON study_sessions
  FOR ALL USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "daily_study_stats_org_access" ON daily_study_stats
  FOR ALL USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "daily_planners_org_access" ON daily_planners
  FOR ALL USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "study_time_records_org_access" ON study_time_records
  FOR ALL USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- ============================================
-- REALTIME PUBLICATION
-- ============================================

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE subjects;
ALTER PUBLICATION supabase_realtime ADD TABLE study_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_study_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_planners;
ALTER PUBLICATION supabase_realtime ADD TABLE study_time_records;

-- Set REPLICA IDENTITY FULL for proper realtime updates
ALTER TABLE subjects REPLICA IDENTITY FULL;
ALTER TABLE study_sessions REPLICA IDENTITY FULL;
ALTER TABLE daily_study_stats REPLICA IDENTITY FULL;
ALTER TABLE daily_planners REPLICA IDENTITY FULL;
ALTER TABLE study_time_records REPLICA IDENTITY FULL;

-- ============================================
-- VIEW: Daily Study Time Ranking
-- ============================================

CREATE OR REPLACE VIEW study_time_ranking_daily AS
SELECT
  str.org_id,
  str.student_id,
  str.student_name,
  CONCAT(LEFT(str.student_name, 1), '**') as surname,
  str.total_minutes,
  str.date,
  ROW_NUMBER() OVER (
    PARTITION BY str.org_id, str.date
    ORDER BY str.total_minutes DESC
  ) as rank,
  'daily' as period_type
FROM study_time_records str
WHERE str.date = CURRENT_DATE;

-- Weekly ranking view
CREATE OR REPLACE VIEW study_time_ranking_weekly AS
SELECT
  org_id,
  student_id,
  student_name,
  CONCAT(LEFT(student_name, 1), '**') as surname,
  SUM(total_minutes) as total_minutes,
  DATE_TRUNC('week', date)::date as week_start,
  ROW_NUMBER() OVER (
    PARTITION BY org_id, DATE_TRUNC('week', date)
    ORDER BY SUM(total_minutes) DESC
  ) as rank,
  'weekly' as period_type
FROM study_time_records
WHERE date >= DATE_TRUNC('week', CURRENT_DATE)
GROUP BY org_id, student_id, student_name, DATE_TRUNC('week', date);

-- Monthly ranking view
CREATE OR REPLACE VIEW study_time_ranking_monthly AS
SELECT
  org_id,
  student_id,
  student_name,
  CONCAT(LEFT(student_name, 1), '**') as surname,
  SUM(total_minutes) as total_minutes,
  DATE_TRUNC('month', date)::date as month_start,
  ROW_NUMBER() OVER (
    PARTITION BY org_id, DATE_TRUNC('month', date)
    ORDER BY SUM(total_minutes) DESC
  ) as rank,
  'monthly' as period_type
FROM study_time_records
WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY org_id, student_id, student_name, DATE_TRUNC('month', date);

-- ============================================
-- FUNCTION: Update daily study stats
-- ============================================

CREATE OR REPLACE FUNCTION update_daily_study_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.duration_seconds > 0 THEN
    INSERT INTO daily_study_stats (
      org_id,
      student_id,
      subject_id,
      subject_name,
      subject_color,
      date,
      total_seconds,
      session_count
    )
    SELECT
      NEW.org_id,
      NEW.student_id,
      NEW.subject_id,
      NEW.subject_name,
      COALESCE(s.color, '#4A90E2'),
      NEW.date,
      NEW.duration_seconds,
      1
    FROM subjects s WHERE s.id = NEW.subject_id
    ON CONFLICT (student_id, subject_id, date)
    DO UPDATE SET
      total_seconds = daily_study_stats.total_seconds + NEW.duration_seconds,
      session_count = daily_study_stats.session_count + 1,
      updated_at = NOW();

    -- Also update total study time record
    INSERT INTO study_time_records (
      org_id,
      student_id,
      student_name,
      date,
      total_minutes
    )
    SELECT
      NEW.org_id,
      NEW.student_id,
      st.name,
      NEW.date,
      CEIL(NEW.duration_seconds / 60.0)::INTEGER
    FROM students st WHERE st.id = NEW.student_id
    ON CONFLICT (student_id, date)
    DO UPDATE SET
      total_minutes = study_time_records.total_minutes + CEIL(NEW.duration_seconds / 60.0)::INTEGER,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating stats
DROP TRIGGER IF EXISTS trigger_update_study_stats ON study_sessions;
CREATE TRIGGER trigger_update_study_stats
  AFTER UPDATE ON study_sessions
  FOR EACH ROW
  WHEN (OLD.status = 'active' AND NEW.status = 'completed')
  EXECUTE FUNCTION update_daily_study_stats();

-- ============================================
-- SEED: Default subjects for demo
-- ============================================

-- This will be run after the migration to add default subjects for existing students
-- INSERT INTO subjects (org_id, student_id, name, color, "order")
-- SELECT
--   s.org_id,
--   s.id,
--   subject.name,
--   subject.color,
--   subject.ord
-- FROM students s
-- CROSS JOIN (
--   VALUES
--     ('국어', '#FF6B35', 0),
--     ('영어', '#F7931E', 1),
--     ('수학', '#4A90E2', 2),
--     ('과학', '#50C878', 3),
--     ('사회', '#9B59B6', 4)
-- ) AS subject(name, color, ord)
-- WHERE NOT EXISTS (
--   SELECT 1 FROM subjects WHERE student_id = s.id AND name = subject.name
-- );

NOTIFY pgrst, 'reload schema';
