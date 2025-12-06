-- =====================================================
-- Homework Submissions Dummy Data Migration
-- Created: 2025-11-30
-- Purpose: 각 과제에 대한 학생 제출 기록 더미 데이터 추가
-- =====================================================

-- 기존 제출 기록 삭제 (중복 방지)
DELETE FROM homework_submissions;

-- homework.submitted_count 초기화 (트리거가 새로 계산할 예정)
UPDATE homework SET submitted_count = 0;

-- =====================================================
-- 1. 중등 영어 기초반 - "영어 단어 암기 (Unit 5)" 과제 제출 기록
-- =====================================================
DO $$
DECLARE
  hw_id UUID;
  hw_class_name TEXT := '중등 영어 기초반';
  student_rec RECORD;
  submission_count INT := 0;
BEGIN
  -- 해당 과제 ID 가져오기
  SELECT id INTO hw_id
  FROM homework
  WHERE class_name = hw_class_name
  ORDER BY created_at DESC
  LIMIT 1;

  IF hw_id IS NOT NULL THEN
    -- 반에 등록된 학생들의 제출 기록 생성
    FOR student_rec IN
      SELECT DISTINCT s.id, s.name
      FROM students s
      JOIN class_enrollments ce ON ce.student_id = s.id
      JOIN classes c ON c.id = ce.class_id
      WHERE c.name = hw_class_name
        AND (ce.status = 'active' OR ce.status IS NULL)
    LOOP
      submission_count := submission_count + 1;

      -- 14/15명 제출 시뮬레이션: 첫 번째 학생만 미제출
      IF submission_count = 1 THEN
        INSERT INTO homework_submissions (homework_id, student_id, student_name, status)
        VALUES (hw_id, student_rec.id, student_rec.name, 'not_submitted');
      ELSE
        INSERT INTO homework_submissions (homework_id, student_id, student_name, status, submitted_at)
        VALUES (hw_id, student_rec.id, student_rec.name, 'submitted', NOW() - (random() * INTERVAL '3 days'));
      END IF;
    END LOOP;

    RAISE NOTICE '중등 영어 기초반: % 명 제출 기록 생성', submission_count;
  END IF;
END $$;

-- =====================================================
-- 2. 고3 수학 심화 - "미적분 심화 문제 풀이" 과제 제출 기록
-- =====================================================
DO $$
DECLARE
  hw_id UUID;
  hw_class_name TEXT := '고3 수학 심화';
  student_rec RECORD;
  submission_count INT := 0;
BEGIN
  SELECT id INTO hw_id
  FROM homework
  WHERE class_name = hw_class_name
  ORDER BY created_at DESC
  LIMIT 1;

  IF hw_id IS NOT NULL THEN
    FOR student_rec IN
      SELECT DISTINCT s.id, s.name
      FROM students s
      JOIN class_enrollments ce ON ce.student_id = s.id
      JOIN classes c ON c.id = ce.class_id
      WHERE c.name = hw_class_name
        AND (ce.status = 'active' OR ce.status IS NULL)
    LOOP
      submission_count := submission_count + 1;

      -- 80% 제출률 시뮬레이션
      IF random() < 0.8 THEN
        INSERT INTO homework_submissions (homework_id, student_id, student_name, status, submitted_at, score)
        VALUES (hw_id, student_rec.id, student_rec.name, 'submitted', NOW() - (random() * INTERVAL '2 days'), (random() * 30 + 70)::INT);
      ELSE
        INSERT INTO homework_submissions (homework_id, student_id, student_name, status)
        VALUES (hw_id, student_rec.id, student_rec.name, 'not_submitted');
      END IF;
    END LOOP;

    RAISE NOTICE '고3 수학 심화: % 명 제출 기록 생성', submission_count;
  END IF;
END $$;

-- =====================================================
-- 3. 박민수 기초반 과제들 제출 기록
-- =====================================================
DO $$
DECLARE
  hw_rec RECORD;
  student_rec RECORD;
  submission_count INT := 0;
BEGIN
  FOR hw_rec IN
    SELECT id, title, class_name
    FROM homework
    WHERE class_name = '박민수 기초반'
  LOOP
    submission_count := 0;

    FOR student_rec IN
      SELECT DISTINCT s.id, s.name
      FROM students s
      WHERE s.class_name = '박민수 기초반'
    LOOP
      submission_count := submission_count + 1;

      -- 70% 제출률
      IF random() < 0.7 THEN
        INSERT INTO homework_submissions (homework_id, student_id, student_name, status, submitted_at)
        VALUES (hw_rec.id, student_rec.id, student_rec.name, 'submitted', NOW() - (random() * INTERVAL '5 days'))
        ON CONFLICT (homework_id, student_id) DO NOTHING;
      ELSE
        INSERT INTO homework_submissions (homework_id, student_id, student_name, status)
        VALUES (hw_rec.id, student_rec.id, student_rec.name, 'not_submitted')
        ON CONFLICT (homework_id, student_id) DO NOTHING;
      END IF;
    END LOOP;

    RAISE NOTICE '박민수 기초반 - %: % 명 제출 기록 생성', hw_rec.title, submission_count;
  END LOOP;
END $$;

-- =====================================================
-- 4. 최지혜 영어반 과제 제출 기록
-- =====================================================
DO $$
DECLARE
  hw_id UUID;
  hw_class_name TEXT := '최지혜 영어반';
  student_rec RECORD;
  submission_count INT := 0;
BEGIN
  SELECT id INTO hw_id
  FROM homework
  WHERE class_name = hw_class_name
  ORDER BY created_at DESC
  LIMIT 1;

  IF hw_id IS NOT NULL THEN
    FOR student_rec IN
      SELECT DISTINCT s.id, s.name
      FROM students s
      WHERE s.class_name = hw_class_name
    LOOP
      submission_count := submission_count + 1;

      -- 90% 제출률
      IF random() < 0.9 THEN
        INSERT INTO homework_submissions (homework_id, student_id, student_name, status, submitted_at)
        VALUES (hw_id, student_rec.id, student_rec.name, 'submitted', NOW() - (random() * INTERVAL '3 days'))
        ON CONFLICT (homework_id, student_id) DO NOTHING;
      ELSE
        INSERT INTO homework_submissions (homework_id, student_id, student_name, status)
        VALUES (hw_id, student_rec.id, student_rec.name, 'not_submitted')
        ON CONFLICT (homework_id, student_id) DO NOTHING;
      END IF;
    END LOOP;

    RAISE NOTICE '최지혜 영어반: % 명 제출 기록 생성', submission_count;
  END IF;
END $$;

-- =====================================================
-- 5. 이철수 과학반 과제 제출 기록
-- =====================================================
DO $$
DECLARE
  hw_id UUID;
  hw_class_name TEXT := '이철수 과학반';
  student_rec RECORD;
  submission_count INT := 0;
BEGIN
  SELECT id INTO hw_id
  FROM homework
  WHERE class_name = hw_class_name
  ORDER BY created_at DESC
  LIMIT 1;

  IF hw_id IS NOT NULL THEN
    FOR student_rec IN
      SELECT DISTINCT s.id, s.name
      FROM students s
      WHERE s.class_name = hw_class_name
    LOOP
      submission_count := submission_count + 1;

      -- 60% 제출률 (늦은 제출 포함)
      IF random() < 0.4 THEN
        INSERT INTO homework_submissions (homework_id, student_id, student_name, status, submitted_at)
        VALUES (hw_id, student_rec.id, student_rec.name, 'submitted', NOW() - (random() * INTERVAL '2 days'))
        ON CONFLICT (homework_id, student_id) DO NOTHING;
      ELSIF random() < 0.5 THEN
        INSERT INTO homework_submissions (homework_id, student_id, student_name, status, submitted_at)
        VALUES (hw_id, student_rec.id, student_rec.name, 'late', NOW() - (random() * INTERVAL '1 day'))
        ON CONFLICT (homework_id, student_id) DO NOTHING;
      ELSE
        INSERT INTO homework_submissions (homework_id, student_id, student_name, status)
        VALUES (hw_id, student_rec.id, student_rec.name, 'not_submitted')
        ON CONFLICT (homework_id, student_id) DO NOTHING;
      END IF;
    END LOOP;

    RAISE NOTICE '이철수 과학반: % 명 제출 기록 생성', submission_count;
  END IF;
END $$;

-- =====================================================
-- 확인 쿼리
-- =====================================================
-- SELECT h.class_name, h.title, h.total_students, h.submitted_count,
--        COUNT(hs.id) as actual_submissions,
--        COUNT(CASE WHEN hs.status = 'submitted' THEN 1 END) as submitted,
--        COUNT(CASE WHEN hs.status = 'late' THEN 1 END) as late,
--        COUNT(CASE WHEN hs.status = 'not_submitted' THEN 1 END) as not_submitted
-- FROM homework h
-- LEFT JOIN homework_submissions hs ON h.id = hs.homework_id
-- GROUP BY h.id, h.class_name, h.title, h.total_students, h.submitted_count
-- ORDER BY h.class_name;
