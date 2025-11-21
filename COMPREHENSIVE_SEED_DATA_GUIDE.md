# 전체 더미데이터 프로덕션 마이그레이션 가이드

## 📋 개요

`lib/data/mockData.ts`의 모든 하드코딩 데이터를 프로덕션 Supabase DB로 마이그레이션합니다.

**대상 유저**: `demo@goldpen.kr`
**Organization ID**: `3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3`

---

## 📊 마이그레이션 데이터 상세

### 1. Teachers (5명)
| 이름 | 이메일 | UUID |
|------|--------|------|
| 김선생 | kim@goldpen.kr | 11111111-1111-1111-1111-111111111111 |
| 박선생 | park@goldpen.kr | 22222222-2222-2222-2222-222222222222 |
| 이선생 | lee@goldpen.kr | 33333333-3333-3333-3333-333333333333 |
| 최선생 | choi@goldpen.kr | 44444444-4444-4444-4444-444444444444 |
| 정선생 | jung@goldpen.kr | 55555555-5555-5555-5555-555555555555 |

### 2. Rooms (7개 강의실)
- **A동**: A301 (25석), A201 (20석), A302 (15석)
- **B동**: B201 (20석), B202 (22석)
- **C동**: C101 (18석), C202 (15석)

### 3. Students (124명 - 학년별 분포)
```
초등학생: 18명
중1: 22명
중2: 25명
중3: 20명
고1: 15명
고2: 12명
고3: 12명
─────────────
총계: 124명
```

**주요 학생** (mockData에서 언급):
- 김민준 (중1)
- 이서연 (중1)
- 박지우 (중1)
- 김철수 (중3)
- 이영희 (중3)
- 박민수 (고1)

### 4. Classes (16개 반)

#### 오전 수업 (3개)
1. **고3 수학 모의고사반** - 김선생, A301, 09:00-12:00
2. **중등 영어 기초반** - 박선생, B201, 10:00-12:00
3. **초등 수학 사고력반** - 이선생, A201, 11:00-13:00

#### 오후 수업 (6개)
4. **고1 수학 특강반** - 김선생, A301, 14:00-16:00
5. **중2 과학 실험반** - 최선생, C101, 14:30-16:30
6. **고2 영어 회화반** - 박선생, B201, 15:00-17:00
7. **중3 국어 독해반** - 이선생, A201, 16:00-18:00
8. **고3 영어 심화반** - 박선생, B202, 17:00-19:00
9. **중1 수학 기초반** - 김선생, A302, 17:30-19:30

#### 저녁 수업 (5개)
10. **고2 물리 심화반** - 정선생, C202, 18:00-20:00
11. **중3 화학 실험반** - 최선생, C101, 18:30-20:30
12. **고1 국어 문법반** - 이선생, A201, 19:00-21:00
13. **고3 수학 심화반** - 김선생, A301, 19:30-21:30
14. **중2 영어 문법반** - 박선생, B201, 20:00-22:00

#### 야간 수업 (2개)
15. **고3 야간 자율학습** - 김선생, A301, 21:00-23:00
16. **재수생 특강반** - 정선생, C202, 21:30-23:30

---

## 🚀 실행 방법

### Step 1: Supabase Dashboard 접속
```
https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/sql/new
```

### Step 2: SQL 파일 복사 & 실행

다음 파일의 **전체 내용**을 복사:
```bash
supabase/migrations/20251121_comprehensive_seed_data.sql
```

Supabase Dashboard SQL Editor에 붙여넣고 **Run** 클릭

### Step 3: 실행 결과 확인

SQL 실행 후 자동으로 출력되는 결과 확인:

```sql
-- 자동 실행되는 확인 쿼리 (파일 마지막 부분)
SELECT
  'users (teachers)' as table_name, COUNT(*) as count
FROM users WHERE role = 'teacher'
UNION ALL
SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL
SELECT 'students', COUNT(*) FROM students
UNION ALL
SELECT 'classes', COUNT(*) FROM classes
ORDER BY table_name;
```

**예상 결과**:
```
┌──────────────────┬───────┐
│   table_name     │ count │
├──────────────────┼───────┤
│ classes          │ 16    │
│ rooms            │ 7     │
│ students         │ 124   │
│ users (teachers) │ 5     │
└──────────────────┴───────┘
```

### Step 4: 상세 데이터 검증

#### 4-1. Teachers 확인
```sql
SELECT name, email, role
FROM users
WHERE role = 'teacher'
ORDER BY name;
```

#### 4-2. Rooms 확인
```sql
SELECT name, capacity, location
FROM rooms
ORDER BY name;
```

#### 4-3. Students 학년별 분포 확인
```sql
SELECT
  CASE
    WHEN grade LIKE '초등%' THEN '초등'
    ELSE grade
  END as grade_group,
  COUNT(*) as count
FROM students
GROUP BY grade_group
ORDER BY grade_group;
```

예상 결과:
```
초등: 18
중1: 22
중2: 25
중3: 20
고1: 15
고2: 12
고3: 12
```

#### 4-4. Classes와 Teachers 관계 확인
```sql
SELECT
  c.name as class_name,
  u.name as teacher_name,
  c.subject
FROM classes c
JOIN users u ON c.teacher_id = u.id
ORDER BY c.created_at;
```

---

## ⚠️ 주의사항

### 1. RLS 임시 비활성화
- SQL 파일에 `SET session_replication_role = replica;` 포함
- Service Role로 실행되므로 Dashboard에서만 실행 가능
- 실행 완료 후 자동으로 RLS 재활성화

### 2. UUID 충돌
만약 데이터가 이미 존재하면 다음 명령으로 삭제:
```sql
-- 주의: 기존 데이터 완전 삭제!
DELETE FROM classes;
DELETE FROM students;
DELETE FROM rooms;
DELETE FROM users WHERE role = 'teacher';
```

### 3. Foreign Key 관계
- Teachers → Classes (teacher_id)
- Organization → 모든 테이블 (org_id)
- 삭제 순서: Classes → Students → Rooms → Teachers

---

## 🎯 다음 단계

### 1. 추가 데이터 마이그레이션 필요
현재 SQL은 기본 데이터만 포함. 다음 데이터는 별도 작업 필요:

- [ ] **Enrollments** (학생-반 연결)
- [ ] **Consultations** (상담 데이터)
- [ ] **Attendance** (출결 기록)
- [ ] **Exams** (시험 기록)
- [ ] **Homework** (과제 데이터)
- [ ] **Lessons** (수업일지)
- [ ] **Billing/Expenses** (매출/지출)

### 2. Supabase Auth 사용자 생성
```
Dashboard > Authentication > Users > Invite user
Email: demo@goldpen.kr
Password: (설정)
```

### 3. 프론트엔드 연결
- `lib/data/mockData.ts` 제거
- 실제 DB 쿼리로 교체
- Widget 컴포넌트 데이터 소스 변경

---

## 📝 기술적 특징

### 1. Clean SQL Format
- ❌ `\restrict` 같은 PostgreSQL 메타커맨드 없음
- ✅ 순수 SQL INSERT 문만 사용
- ✅ Supabase Dashboard 직접 실행 가능

### 2. UUID Strategy
- Teachers: 규칙적 UUID (11111111-..., 22222222-...)
- Rooms: A동(a1111...), B동(b1111...), C동(c1111...)
- Classes: 순차적 UUID (c0000001-..., c0000002-...)
- Students: Auto-generated UUID (gen_random_uuid())

### 3. Data Integrity
- 모든 외래키 관계 유지
- Organization ID 통일
- Teacher-Class 연결 완료
- 학년별 학생 분포 정확

---

## 📊 데이터 출처

| 데이터 | 출처 파일 | 라인 |
|--------|-----------|------|
| Teachers | mockData.ts | todayClasses.teacher |
| Rooms | mockData.ts | todayClasses.room |
| Students (학년 분포) | mockData.ts | gradeDistribution |
| Students (총 수) | mockData.ts | stats.totalStudents |
| Classes | mockData.ts | todayClasses |

---

**생성일**: 2025-11-21
**마이그레이션 파일**: `supabase/migrations/20251121_comprehensive_seed_data.sql`
**대상 환경**: Production Supabase (ipqhhqduppzvsqwwzjkp)
