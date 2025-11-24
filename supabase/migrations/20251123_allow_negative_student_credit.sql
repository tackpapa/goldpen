-- Allow student.credit to go negative (tracks 미납 크레딧)
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_credit_check;
