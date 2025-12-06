-- =====================================================
-- Lessons and Homework Submissions Dummy Data
-- Created: 2025-11-30
-- Purpose: 수업일지 더미 데이터와 과제 제출 데이터 생성
-- =====================================================

-- =====================================================
-- PART 1: 수업일지(lessons) 더미 데이터
-- =====================================================

-- 1. 박민수 기초반 수업일지 (3개)
INSERT INTO lessons (
  id, org_id, class_id, teacher_id, lesson_date, lesson_time, duration_minutes,
  subject, content, student_attitudes, comprehension_level,
  homework_assigned, next_lesson_plan, created_at
)
SELECT
  gen_random_uuid(),
  (SELECT org_id FROM homework LIMIT 1),
  NULL,
  (SELECT id FROM users WHERE name = '박민수' LIMIT 1),
  NOW()::date - INTERVAL '7 days',
  '14:00',
  90,
  '국어',
  '품사의 종류와 특징에 대해 학습했습니다. 명사, 대명사, 동사, 형용사의 차이점을 설명하고 예문으로 연습했습니다.',
  '전반적으로 집중력이 좋았으며, 질문도 활발하게 했습니다.',
  'high',
  '품사와 문장 성분 복습하기. 교재 p.50-60 문제 풀이',
  '문장 성분 분석 학습 예정',
  NOW() - INTERVAL '7 days'
WHERE EXISTS (SELECT 1 FROM homework LIMIT 1);

INSERT INTO lessons (
  id, org_id, class_id, teacher_id, lesson_date, lesson_time, duration_minutes,
  subject, content, student_attitudes, comprehension_level,
  homework_assigned, next_lesson_plan, created_at
)
SELECT
  gen_random_uuid(),
  (SELECT org_id FROM homework LIMIT 1),
  NULL,
  (SELECT id FROM users WHERE name = '박민수' LIMIT 1),
  NOW()::date - INTERVAL '3 days',
  '14:00',
  90,
  '수학',
  '기초 연산 복습과 분수, 소수의 사칙연산을 학습했습니다.',
  '수학 문제 풀이에 적극적으로 참여했습니다.',
  'medium',
  '수학 연산 문제집 1장 풀이',
  '방정식 기초 학습 예정',
  NOW() - INTERVAL '3 days'
WHERE EXISTS (SELECT 1 FROM homework LIMIT 1);

INSERT INTO lessons (
  id, org_id, class_id, teacher_id, lesson_date, lesson_time, duration_minutes,
  subject, content, student_attitudes, comprehension_level,
  homework_assigned, next_lesson_plan, created_at
)
SELECT
  gen_random_uuid(),
  (SELECT org_id FROM homework LIMIT 1),
  NULL,
  (SELECT id FROM users WHERE name = '박민수' LIMIT 1),
  NOW()::date,
  '14:00',
  90,
  '국어',
  '문장 성분(주어, 서술어, 목적어, 보어)에 대해 학습하고 문장 분석 연습을 했습니다.',
  '이해도가 높고 문장 분석에 흥미를 보였습니다.',
  'high',
  '국어 문법 기초 복습',
  '문장의 호응 관계 학습 예정',
  NOW()
WHERE EXISTS (SELECT 1 FROM homework LIMIT 1);

-- 2. 고3 수학 심화반 (고3 수학 모의고사반) 수업일지 (2개)
INSERT INTO lessons (
  id, org_id, class_id, teacher_id, lesson_date, lesson_time, duration_minutes,
  subject, content, student_attitudes, comprehension_level,
  homework_assigned, next_lesson_plan, created_at
)
SELECT
  gen_random_uuid(),
  (SELECT org_id FROM homework LIMIT 1),
  (SELECT id FROM classes WHERE name = '고3 수학 모의고사반' LIMIT 1),
  (SELECT teacher_id FROM classes WHERE name = '고3 수학 모의고사반' LIMIT 1),
  NOW()::date - INTERVAL '5 days',
  '18:00',
  120,
  '수학',
  '미적분 - 미분의 정의와 미분계수 계산 연습. 평균변화율과 순간변화율의 개념을 정립했습니다.',
  '대부분의 학생이 진지하게 참여했으나, 일부 개념 이해에 어려움을 보였습니다.',
  'medium',
  '미적분 교재 Chapter 5 연습문제 전체',
  '적분의 기초 개념 도입',
  NOW() - INTERVAL '5 days'
WHERE EXISTS (SELECT 1 FROM classes WHERE name = '고3 수학 모의고사반' LIMIT 1);

INSERT INTO lessons (
  id, org_id, class_id, teacher_id, lesson_date, lesson_time, duration_minutes,
  subject, content, student_attitudes, comprehension_level,
  homework_assigned, next_lesson_plan, created_at
)
SELECT
  gen_random_uuid(),
  (SELECT org_id FROM homework LIMIT 1),
  (SELECT id FROM classes WHERE name = '고3 수학 모의고사반' LIMIT 1),
  (SELECT teacher_id FROM classes WHERE name = '고3 수학 모의고사반' LIMIT 1),
  NOW()::date,
  '18:00',
  120,
  '수학',
  '적분의 정의와 부정적분 계산. 기본 적분 공식을 학습하고 연습문제를 풀었습니다.',
  '전반적으로 이해도가 향상되었고, 질문이 활발했습니다.',
  'high',
  '적분 연습문제 30문항',
  '정적분과 넓이 계산',
  NOW()
WHERE EXISTS (SELECT 1 FROM classes WHERE name = '고3 수학 모의고사반' LIMIT 1);

-- 3. 최지혜 영어반 수업일지 (2개)
INSERT INTO lessons (
  id, org_id, class_id, teacher_id, lesson_date, lesson_time, duration_minutes,
  subject, content, student_attitudes, comprehension_level,
  homework_assigned, next_lesson_plan, created_at
)
SELECT
  gen_random_uuid(),
  (SELECT org_id FROM homework LIMIT 1),
  NULL,
  (SELECT id FROM users WHERE name = '최지혜짱' LIMIT 1),
  NOW()::date - INTERVAL '4 days',
  '16:00',
  60,
  '영어',
  'Unit 3-4 핵심 문법 정리: 현재완료와 과거 시제 비교. 실생활 예문으로 연습했습니다.',
  '문법 규칙 이해에 집중하며 열심히 노트 정리를 했습니다.',
  'medium',
  'Unit 3-4 필수 단어 100개 암기',
  '독해 지문 분석 연습',
  NOW() - INTERVAL '4 days'
WHERE EXISTS (SELECT 1 FROM users WHERE name = '최지혜짱' LIMIT 1);

INSERT INTO lessons (
  id, org_id, class_id, teacher_id, lesson_date, lesson_time, duration_minutes,
  subject, content, student_attitudes, comprehension_level,
  homework_assigned, next_lesson_plan, created_at
)
SELECT
  gen_random_uuid(),
  (SELECT org_id FROM homework LIMIT 1),
  NULL,
  (SELECT id FROM users WHERE name = '최지혜짱' LIMIT 1),
  NOW()::date,
  '16:00',
  60,
  '영어',
  '독해 지문 분석 연습. 주제문 찾기와 세부사항 파악 전략을 학습했습니다.',
  '독해에 대한 자신감이 생기고 있습니다.',
  'high',
  '독해 지문 5개 분석',
  '어휘력 강화 수업',
  NOW()
WHERE EXISTS (SELECT 1 FROM users WHERE name = '최지혜짱' LIMIT 1);

-- 4. 이철수 과학반 수업일지 (2개)
INSERT INTO lessons (
  id, org_id, class_id, teacher_id, lesson_date, lesson_time, duration_minutes,
  subject, content, student_attitudes, comprehension_level,
  homework_assigned, next_lesson_plan, created_at
)
SELECT
  gen_random_uuid(),
  (SELECT org_id FROM homework LIMIT 1),
  NULL,
  (SELECT id FROM users WHERE name = '이철수' LIMIT 1),
  NOW()::date - INTERVAL '6 days',
  '15:00',
  90,
  '과학',
  '뉴턴의 운동 법칙 1,2,3법칙 학습. 실험 영상과 함께 개념을 정리했습니다.',
  '물리에 흥미를 보이며 적극적으로 질문했습니다.',
  'high',
  '물리 실험 보고서 (자유 낙하 실험)',
  '에너지 보존 법칙 학습',
  NOW() - INTERVAL '6 days'
WHERE EXISTS (SELECT 1 FROM users WHERE name = '이철수' LIMIT 1);

INSERT INTO lessons (
  id, org_id, class_id, teacher_id, lesson_date, lesson_time, duration_minutes,
  subject, content, student_attitudes, comprehension_level,
  homework_assigned, next_lesson_plan, created_at
)
SELECT
  gen_random_uuid(),
  (SELECT org_id FROM homework LIMIT 1),
  NULL,
  (SELECT id FROM users WHERE name = '이철수' LIMIT 1),
  NOW()::date,
  '15:00',
  90,
  '과학',
  '자유 낙하 실험 결과 분석 및 에너지 보존 법칙 도입. 위치에너지와 운동에너지의 변환을 학습했습니다.',
  '실험 결과에 대한 토론이 활발했습니다.',
  'high',
  '에너지 보존 문제 풀이 20문항',
  '역학적 에너지 심화',
  NOW()
WHERE EXISTS (SELECT 1 FROM users WHERE name = '이철수' LIMIT 1);


-- =====================================================
-- PART 2: 과제 제출(homework_submissions) 더미 데이터
-- =====================================================

-- 박민수 기초반 학생들 - 국어 문법 기초 복습 과제 제출
-- 학생 3명 중 2명 제출 (67%)
INSERT INTO homework_submissions (homework_id, student_id, student_name, status, submitted_at, score, feedback)
SELECT
  hw.id,
  '4a4836a6-a815-4c80-b85a-bc772601f791',  -- 강시작
  '강시작',
  'submitted',
  NOW() - INTERVAL '1 day',
  85,
  '전반적으로 잘 풀었습니다. 형용사와 동사 구분에 더 주의하세요.'
FROM homework hw
WHERE hw.class_name = '박민수 기초반' AND hw.title = '국어 문법 기초 복습'
ON CONFLICT (homework_id, student_id) DO UPDATE SET
  status = 'submitted',
  submitted_at = NOW() - INTERVAL '1 day',
  score = 85;

INSERT INTO homework_submissions (homework_id, student_id, student_name, status, submitted_at, score, feedback)
SELECT
  hw.id,
  'a4921fb9-9bb4-418f-90ff-1aba1714fe41',  -- 김철수
  '김철수',
  'submitted',
  NOW() - INTERVAL '2 days',
  92,
  '우수합니다! 문장 성분 분석이 정확합니다.'
FROM homework hw
WHERE hw.class_name = '박민수 기초반' AND hw.title = '국어 문법 기초 복습'
ON CONFLICT (homework_id, student_id) DO UPDATE SET
  status = 'submitted',
  submitted_at = NOW() - INTERVAL '2 days',
  score = 92;

INSERT INTO homework_submissions (homework_id, student_id, student_name, status)
SELECT
  hw.id,
  'c1514288-2fe1-4d7a-a1a6-c3494189ef4a',  -- 홍길동
  '홍길동',
  'not_submitted'
FROM homework hw
WHERE hw.class_name = '박민수 기초반' AND hw.title = '국어 문법 기초 복습'
ON CONFLICT (homework_id, student_id) DO NOTHING;

-- 박민수 기초반 - 수학 연산 문제집 과제 (이전 과제) - 3명 모두 제출 (100%)
INSERT INTO homework_submissions (homework_id, student_id, student_name, status, submitted_at, score, feedback)
SELECT
  hw.id,
  '4a4836a6-a815-4c80-b85a-bc772601f791',
  '강시작',
  'submitted',
  NOW() - INTERVAL '5 days',
  78,
  '분수 연산 부분 복습이 필요합니다.'
FROM homework hw
WHERE hw.class_name = '박민수 기초반' AND hw.title = '수학 연산 문제집 1장'
ON CONFLICT (homework_id, student_id) DO UPDATE SET
  status = 'submitted',
  submitted_at = NOW() - INTERVAL '5 days',
  score = 78;

INSERT INTO homework_submissions (homework_id, student_id, student_name, status, submitted_at, score, feedback)
SELECT
  hw.id,
  'a4921fb9-9bb4-418f-90ff-1aba1714fe41',
  '김철수',
  'submitted',
  NOW() - INTERVAL '4 days',
  88,
  '전체적으로 잘 풀었습니다.'
FROM homework hw
WHERE hw.class_name = '박민수 기초반' AND hw.title = '수학 연산 문제집 1장'
ON CONFLICT (homework_id, student_id) DO UPDATE SET
  status = 'submitted',
  submitted_at = NOW() - INTERVAL '4 days',
  score = 88;

INSERT INTO homework_submissions (homework_id, student_id, student_name, status, submitted_at, score, feedback)
SELECT
  hw.id,
  'c1514288-2fe1-4d7a-a1a6-c3494189ef4a',
  '홍길동',
  'late',
  NOW() - INTERVAL '2 days',
  72,
  '늦게 제출했지만 성실하게 풀었습니다.'
FROM homework hw
WHERE hw.class_name = '박민수 기초반' AND hw.title = '수학 연산 문제집 1장'
ON CONFLICT (homework_id, student_id) DO UPDATE SET
  status = 'late',
  submitted_at = NOW() - INTERVAL '2 days',
  score = 72;


-- 고3 수학 심화반 (고3 수학 모의고사반) - 미적분 심화 문제 풀이
-- 5명 중 3명 제출 (60%)
INSERT INTO homework_submissions (homework_id, student_id, student_name, status, submitted_at, score, feedback)
SELECT
  hw.id,
  s.id,
  s.name,
  'submitted',
  NOW() - INTERVAL '1 day',
  95,
  '훌륭합니다! 미분 개념을 완벽히 이해하고 있습니다.'
FROM homework hw
CROSS JOIN (
  SELECT id, name FROM students
  WHERE class_name = '고3 수학 모의고사반'
  ORDER BY name
  LIMIT 1
) s
WHERE hw.class_name = '고3 수학 심화' AND hw.title = '미적분 심화 문제 풀이'
ON CONFLICT (homework_id, student_id) DO UPDATE SET
  status = 'submitted',
  submitted_at = NOW() - INTERVAL '1 day',
  score = 95;

INSERT INTO homework_submissions (homework_id, student_id, student_name, status, submitted_at, score, feedback)
SELECT
  hw.id,
  s.id,
  s.name,
  'submitted',
  NOW() - INTERVAL '2 days',
  88,
  '잘했습니다. 응용 문제에서 조금 더 연습이 필요합니다.'
FROM homework hw
CROSS JOIN (
  SELECT id, name FROM students
  WHERE class_name = '고3 수학 모의고사반'
  ORDER BY name
  LIMIT 1 OFFSET 1
) s
WHERE hw.class_name = '고3 수학 심화' AND hw.title = '미적분 심화 문제 풀이'
ON CONFLICT (homework_id, student_id) DO UPDATE SET
  status = 'submitted',
  submitted_at = NOW() - INTERVAL '2 days',
  score = 88;

INSERT INTO homework_submissions (homework_id, student_id, student_name, status, submitted_at, score, feedback)
SELECT
  hw.id,
  s.id,
  s.name,
  'submitted',
  NOW() - INTERVAL '1 day',
  82,
  '기본 문제는 잘 풀었습니다. 심화 문제 복습 권장합니다.'
FROM homework hw
CROSS JOIN (
  SELECT id, name FROM students
  WHERE class_name = '고3 수학 모의고사반'
  ORDER BY name
  LIMIT 1 OFFSET 2
) s
WHERE hw.class_name = '고3 수학 심화' AND hw.title = '미적분 심화 문제 풀이'
ON CONFLICT (homework_id, student_id) DO UPDATE SET
  status = 'submitted',
  submitted_at = NOW() - INTERVAL '1 day',
  score = 82;

-- 나머지 2명은 미제출
INSERT INTO homework_submissions (homework_id, student_id, student_name, status)
SELECT
  hw.id,
  s.id,
  s.name,
  'not_submitted'
FROM homework hw
CROSS JOIN (
  SELECT id, name FROM students
  WHERE class_name = '고3 수학 모의고사반'
  ORDER BY name
  LIMIT 1 OFFSET 3
) s
WHERE hw.class_name = '고3 수학 심화' AND hw.title = '미적분 심화 문제 풀이'
ON CONFLICT (homework_id, student_id) DO NOTHING;

INSERT INTO homework_submissions (homework_id, student_id, student_name, status)
SELECT
  hw.id,
  s.id,
  s.name,
  'not_submitted'
FROM homework hw
CROSS JOIN (
  SELECT id, name FROM students
  WHERE class_name = '고3 수학 모의고사반'
  ORDER BY name
  LIMIT 1 OFFSET 4
) s
WHERE hw.class_name = '고3 수학 심화' AND hw.title = '미적분 심화 문제 풀이'
ON CONFLICT (homework_id, student_id) DO NOTHING;


-- 최지혜 영어반 - 영어 단어 암기 테스트
-- 학생이 있다면 일부 제출 처리
INSERT INTO homework_submissions (homework_id, student_id, student_name, status, submitted_at, score, feedback)
SELECT
  hw.id,
  s.id,
  s.name,
  'submitted',
  NOW() - INTERVAL '1 day',
  90,
  '단어 암기 우수합니다!'
FROM homework hw
CROSS JOIN (
  SELECT id, name FROM students
  WHERE class_name = '최지혜 영어반'
  ORDER BY name
  LIMIT 1
) s
WHERE hw.class_name = '최지혜 영어반' AND hw.title = '영어 단어 암기 테스트'
ON CONFLICT (homework_id, student_id) DO UPDATE SET
  status = 'submitted',
  submitted_at = NOW() - INTERVAL '1 day',
  score = 90;


-- 이철수 과학반 - 물리 실험 보고서
-- 학생이 있다면 제출 처리
INSERT INTO homework_submissions (homework_id, student_id, student_name, status, submitted_at, score, feedback)
SELECT
  hw.id,
  s.id,
  s.name,
  'submitted',
  NOW() - INTERVAL '2 days',
  88,
  '실험 결과 분석이 정확합니다. 결론 도출 과정이 논리적입니다.'
FROM homework hw
CROSS JOIN (
  SELECT id, name FROM students
  WHERE class_name = '이철수 과학반'
  ORDER BY name
  LIMIT 1
) s
WHERE hw.class_name = '이철수 과학반' AND hw.title = '물리 실험 보고서'
ON CONFLICT (homework_id, student_id) DO UPDATE SET
  status = 'submitted',
  submitted_at = NOW() - INTERVAL '2 days',
  score = 88;


-- =====================================================
-- PART 3: homework 테이블의 total_students 업데이트
-- =====================================================

-- 박민수 기초반 과제들 - 학생 수 3명으로 설정
UPDATE homework
SET total_students = 3
WHERE class_name = '박민수 기초반';

-- 고3 수학 심화반 과제 - 학생 수 5명으로 설정
UPDATE homework
SET total_students = 5
WHERE class_name = '고3 수학 심화';

-- 최지혜 영어반 과제 - 학생 수 계산
UPDATE homework hw
SET total_students = (
  SELECT COUNT(*) FROM students s WHERE s.class_name = '최지혜 영어반'
)
WHERE hw.class_name = '최지혜 영어반';

-- 이철수 과학반 과제 - 학생 수 계산
UPDATE homework hw
SET total_students = (
  SELECT COUNT(*) FROM students s WHERE s.class_name = '이철수 과학반'
)
WHERE hw.class_name = '이철수 과학반';


-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Created:
--   - 수업일지 약 9개 (각 반별 2-3개)
--   - 과제 제출 데이터 (homework_submissions)
--   - homework.total_students 업데이트
-- =====================================================
