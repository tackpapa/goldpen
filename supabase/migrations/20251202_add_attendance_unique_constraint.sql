-- attendance 테이블에 UNIQUE 제약 조건 추가
-- 같은 날, 같은 수업, 같은 학생의 출결 기록은 하나만 존재해야 함

-- 기존 중복 데이터 정리 (가장 최근 레코드만 유지)
DELETE FROM attendance a
USING attendance b
WHERE a.org_id = b.org_id
  AND a.class_id = b.class_id
  AND a.student_id = b.student_id
  AND a.date = b.date
  AND a.id < b.id;

-- UNIQUE 제약 조건 추가
ALTER TABLE attendance
ADD CONSTRAINT attendance_org_class_student_date_unique
UNIQUE (org_id, class_id, student_id, date);
