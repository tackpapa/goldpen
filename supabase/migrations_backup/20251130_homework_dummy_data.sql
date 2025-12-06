-- =====================================================
-- Homework Dummy Data Migration
-- Created: 2025-11-30
-- Purpose: 박민수 강사 학생들의 과제 더미 데이터 추가
-- =====================================================

-- 1. 박민수 강사의 학생들을 "박민수 기초반"으로 배정
UPDATE students
SET class_name = '박민수 기초반'
WHERE id IN (
  '4a4836a6-a815-4c80-b85a-bc772601f791',  -- 강시작
  'a4921fb9-9bb4-418f-90ff-1aba1714fe41',  -- 김철수
  'c1514288-2fe1-4d7a-a1a6-c3494189ef4a'   -- 홍길동
);

-- 2. 박민수 기초반에 과제 추가
-- org_id는 기존 homework에서 가져옴
INSERT INTO homework (
  id,
  org_id,
  class_name,
  title,
  description,
  due_date,
  created_at
)
SELECT
  gen_random_uuid(),
  (SELECT org_id FROM homework LIMIT 1),
  '박민수 기초반',
  '국어 문법 기초 복습',
  '품사와 문장 성분 복습하기. 교재 p.50-60 문제 풀이',
  NOW() + INTERVAL '7 days',
  NOW()
WHERE EXISTS (SELECT 1 FROM homework LIMIT 1);

-- 3. 추가 과제 (이전 과제)
INSERT INTO homework (
  id,
  org_id,
  class_name,
  title,
  description,
  due_date,
  created_at
)
SELECT
  gen_random_uuid(),
  (SELECT org_id FROM homework LIMIT 1),
  '박민수 기초반',
  '수학 연산 문제집 1장',
  '기초 연산 문제 50문항 풀이',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '10 days'
WHERE EXISTS (SELECT 1 FROM homework LIMIT 1);

-- 4. 최지혜짱 강사 학생들을 위한 반 배정 및 과제 추가
UPDATE students
SET class_name = '최지혜 영어반'
WHERE teacher_id IN (
  SELECT id FROM users WHERE name = '최지혜짱' LIMIT 1
)
AND class_name = '미배정';

-- 최지혜 영어반 과제 추가
INSERT INTO homework (
  id,
  org_id,
  class_name,
  title,
  description,
  due_date,
  created_at
)
SELECT
  gen_random_uuid(),
  (SELECT org_id FROM homework LIMIT 1),
  '최지혜 영어반',
  '영어 단어 암기 테스트',
  'Unit 3-4 필수 단어 100개 암기',
  NOW() + INTERVAL '5 days',
  NOW()
WHERE EXISTS (SELECT 1 FROM homework LIMIT 1);

-- 5. 김영희 강사 학생들 (이미 반이 있는 경우 과제 추가)
INSERT INTO homework (
  id,
  org_id,
  class_name,
  title,
  description,
  due_date,
  created_at
)
SELECT
  gen_random_uuid(),
  (SELECT org_id FROM homework LIMIT 1),
  '고3 수학 심화',
  '미적분 심화 문제 풀이',
  '미적분 교재 Chapter 5 연습문제 전체',
  NOW() + INTERVAL '4 days',
  NOW()
WHERE EXISTS (SELECT 1 FROM homework LIMIT 1);

-- 6. 이철수 강사 학생들을 위한 과제
UPDATE students
SET class_name = '이철수 과학반'
WHERE teacher_id IN (
  SELECT id FROM users WHERE name = '이철수' LIMIT 1
)
AND class_name = '미배정';

INSERT INTO homework (
  id,
  org_id,
  class_name,
  title,
  description,
  due_date,
  created_at
)
SELECT
  gen_random_uuid(),
  (SELECT org_id FROM homework LIMIT 1),
  '이철수 과학반',
  '물리 실험 보고서',
  '자유 낙하 실험 결과 보고서 작성',
  NOW() + INTERVAL '6 days',
  NOW()
WHERE EXISTS (SELECT 1 FROM homework LIMIT 1);
