# 크레딧 시스템 리팩토링 분석

## 📋 현재 구조 분석

### 1. 수업 크레딧 (Class Credits)

**현재 구현:**
- **테이블**: `class_credits` (별도 테이블)
- **필드**:
  - `total_hours` (총 시간)
  - `used_hours` (사용 시간)
  - `remaining_hours` (남은 시간)
  - `expiry_date` (만료일)
  - `status` ('active' | 'expired')

**사용 파일 (5개):**
1. `app/api/payments/route.ts` (line 36-47)
   - 결제 시 `class_credits` 테이블에 INSERT
   - `total_hours`, `used_hours`, `remaining_hours` 생성
2. `components/students/PaymentTab.tsx` (line 103-104)
   - UI: "10 크레딧 = 10시간 수업권"
   - 결제 시 `{ hours: Number(classCredits) }` 전송
3. `components/students/ClassCreditsTab.tsx` (line 30, 83)
   - `remaining_hours`, `total_hours` 표시
4. `components/students/HistoryTab.tsx`
   - 크레딧 사용 내역 표시
5. `app/api/students/[id]/modal/route.ts`
   - 학생 모달에서 크레딧 조회

### 2. 독서실 이용권 (Study Room Pass)

**현재 구현:**
- **테이블**: `study_room_passes` (별도 테이블)
- **필드**:
  - `pass_type` ('days' | 'hours')
  - `total_amount` (총량)
  - `remaining_amount` (남은량)
  - `start_date`, `expiry_date`

**사용 파일 (2개):**
1. `app/api/payments/route.ts` (line 71-83)
   - 결제 시 `study_room_passes` 테이블에 INSERT
   - `pass_type`, `total_amount`, `remaining_amount` 생성
2. `components/students/PaymentTab.tsx` (line 106-108)
   - UI: 이용권 타입 선택 (일수/시간)
   - 결제 시 `{ type: passType, amount: Number(passAmount) }` 전송

### 3. 학생의 남은 분 (Student Remaining Minutes)

**현재 구현:**
- **테이블**: `students` 테이블
- **필드**: `remaining_minutes` (INTEGER, 분 단위)

**사용 파일 (10개):**
1. `supabase/migrations/20251124_liveattendance.sql` (line 8-10)
   - `ALTER TABLE students ADD COLUMN remaining_minutes`
2. `app/api/seat-assignments/route.ts` (line 122, 178, 298)
   - 좌석 배정 시 학생의 `remaining_minutes` 조회
   - 체크인/체크아웃 시 시간 차감
3. `app/[institutionname]/liveattendance/page.tsx` (line 294)
   - 실시간 출석 페이지에서 `remaining_minutes` 표시
4. `app/[institutionname]/(dashboard)/seats/page.tsx`
   - 좌석 관리 페이지에서 남은 시간 표시
5. `hooks/use-seat-assignments-realtime.ts`
   - 실시간 좌석 상태 업데이트
6. `workers/api/src/routes/seats.[id].ts`
   - Workers API에서 좌석 관련 시간 처리
7. `workers/api/src/routes/seats.ts`
   - Workers API에서 좌석 목록 조회
8. `supabase/migrations/20251122_finance_and_seats.sql` (line 62)
   - seats 테이블의 `remaining_minutes` 필드
9. `app/api/class-enrollments/route.ts` (line 27)
   - 수업 등록 시 학생 정보에 `remaining_minutes` 포함
10. `app/[institutionname]/(dashboard)/classes/page.tsx`
    - 반 관리 페이지에서 학생 정보 표시

---

## 🎯 리팩토링 목표

### 새로운 구조

**사용자 요구사항:**
1. **수업 크레딧** (시간 단위) → `students.credit`
2. **독서실 사용 시간** (분 단위 저장, 결제는 시간 단위) → `students.seatsremainingtime`

### 변경 사항

| 현재 | 새 구조 | 단위 | 비고 |
|------|---------|------|------|
| `class_credits` 테이블 | `students.credit` 필드 | 시간 (INTEGER) | 테이블 통합 |
| `study_room_passes` 테이블 | `students.seatsremainingtime` 필드 | 분 (INTEGER) | 테이블 통합 |
| `students.remaining_minutes` | `students.seatsremainingtime` | 분 (INTEGER) | 이름 변경 |

---

## 🔍 세부 분석

### A. 수업 크레딧 사용 패턴

#### 결제 API (`app/api/payments/route.ts`)
```typescript
// 현재 (line 35-47)
const { data: credit, error: creditError } = await supabase
  .from('class_credits')
  .insert({
    org_id,
    student_id,
    total_hours: class_credits.hours,      // 시간 단위
    used_hours: 0,
    remaining_hours: class_credits.hours,
    expiry_date: expiryDate.toISOString().split('T')[0],
    status: 'active',
  })

// 변경 후
await supabase
  .from('students')
  .update({
    credit: student.credit + class_credits.hours  // 시간 단위
  })
  .eq('id', student_id)
```

#### ClassCreditsTab 컴포넌트
```typescript
// 현재 (line 30)
const currentCredits = activeCredits.reduce((sum, c) => sum + (c.remaining_hours || 0), 0)

// 변경 후
const currentCredits = student.credit || 0
```

### B. 독서실 이용권 사용 패턴

#### 결제 API
```typescript
// 현재 (line 71-83)
const { data: pass, error: passError } = await supabase
  .from('study_room_passes')
  .insert({
    org_id,
    student_id,
    pass_type: study_room_pass.type,        // 'days' | 'hours'
    total_amount: study_room_pass.amount,
    remaining_amount: study_room_pass.amount,
    start_date: startDate,
    expiry_date: expiryDate,
    status: 'active',
  })

// 변경 후
const minutesToAdd = study_room_pass.type === 'hours'
  ? study_room_pass.amount * 60  // 시간 → 분 변환
  : study_room_pass.amount * 24 * 60  // 일 → 분 변환

await supabase
  .from('students')
  .update({
    seatsremainingtime: student.seatsremainingtime + minutesToAdd
  })
  .eq('id', student_id)
```

### C. 좌석 시간 차감 패턴

#### 좌석 배정 API (`app/api/seat-assignments/route.ts`)
```typescript
// 현재 (line 122)
.select('*, students(id, name, grade, student_code, remaining_minutes)')

// 변경 후
.select('*, students(id, name, grade, student_code, seatsremainingtime)')

// 현재 (line 178)
remainingMinutes: remainingMinutes ?? a.students?.remaining_minutes ?? null

// 변경 후
seatsremainingtime: remainingMinutes ?? a.students?.seatsremainingtime ?? null
```

---

## 📝 마이그레이션 전략

### Phase 1: 데이터 백업
```sql
-- 기존 데이터 백업
CREATE TABLE class_credits_backup AS SELECT * FROM class_credits;
CREATE TABLE study_room_passes_backup AS SELECT * FROM study_room_passes;
```

### Phase 2: 새 컬럼 추가
```sql
-- students 테이블에 새 컬럼 추가
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS credit INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seatsremainingtime INTEGER DEFAULT 0;
```

### Phase 3: 데이터 마이그레이션
```sql
-- 1. class_credits 데이터를 students.credit으로 통합
UPDATE students s
SET credit = (
  SELECT COALESCE(SUM(remaining_hours), 0)
  FROM class_credits cc
  WHERE cc.student_id = s.id
    AND cc.status = 'active'
);

-- 2. study_room_passes 데이터를 students.seatsremainingtime으로 통합
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
  ),
  0
);

-- 3. remaining_minutes 데이터를 seatsremainingtime으로 복사
UPDATE students
SET seatsremainingtime = COALESCE(remaining_minutes, 0)
WHERE seatsremainingtime = 0;
```

### Phase 4: 기존 컬럼/테이블 삭제
```sql
-- remaining_minutes 삭제
ALTER TABLE students DROP COLUMN IF EXISTS remaining_minutes;

-- 기존 테이블 삭제 (백업 유지)
DROP TABLE IF EXISTS class_credits;
DROP TABLE IF EXISTS study_room_passes;
```

---

## 🚨 영향받는 파일 목록

### 수정 필요 파일 (총 15개)

#### API Routes (3개)
1. `app/api/payments/route.ts`
   - `class_credits` 테이블 INSERT → `students.credit` UPDATE
   - `study_room_passes` 테이블 INSERT → `students.seatsremainingtime` UPDATE
2. `app/api/seat-assignments/route.ts`
   - `remaining_minutes` → `seatsremainingtime`
3. `app/api/class-enrollments/route.ts`
   - SELECT 쿼리 수정
4. `app/api/students/[id]/modal/route.ts`
   - `class_credits` 테이블 조회 → `students.credit` 사용

#### Components (3개)
1. `components/students/PaymentTab.tsx`
   - UI는 동일, API 호출 로직만 수정
2. `components/students/ClassCreditsTab.tsx`
   - `class_credits` 테이블 조회 → `students.credit` 사용
   - 크레딧 내역은 `payments` 테이블에서 조회
3. `components/students/HistoryTab.tsx`
   - 크레딧 관련 표시 로직 수정

#### Pages (3개)
1. `app/[institutionname]/liveattendance/page.tsx`
   - `remaining_minutes` → `seatsremainingtime`
2. `app/[institutionname]/(dashboard)/seats/page.tsx`
   - `remaining_minutes` → `seatsremainingtime`
3. `app/[institutionname]/(dashboard)/classes/page.tsx`
   - SELECT 쿼리 수정

#### Hooks (1개)
1. `hooks/use-seat-assignments-realtime.ts`
   - `remaining_minutes` → `seatsremainingtime`

#### Workers (2개)
1. `workers/api/src/routes/seats.[id].ts`
   - `remaining_minutes` → `seatsremainingtime`
2. `workers/api/src/routes/seats.ts`
   - `remaining_minutes` → `seatsremainingtime`

#### Types (1개)
1. `lib/types/database.ts`
   - Student 타입 수정
   - `remaining_minutes` → `seatsremainingtime`
   - `credit` 필드 추가

#### Migrations (2개)
1. 새로 생성: `supabase/migrations/20251125_refactor_credits.sql`
2. 참고 필요: `supabase/migrations/20251124_liveattendance.sql`

---

## 🎯 다음 단계

1. ✅ 전체 사용처 분석 완료
2. ⏳ Sequential Thinking으로 상세 리팩토링 계획 수립
3. ⏳ SQL 마이그레이션 파일 작성
4. ⏳ 코드베이스 업데이트 (15개 파일)
5. ⏳ 테스트 및 검증
