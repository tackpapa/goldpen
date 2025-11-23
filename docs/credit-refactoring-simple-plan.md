# 크레딧 시스템 리팩토링 - 간결한 플랜

## 🎯 목표

**단순 필드명 변경:**
1. `class_credits` 테이블 → `students.credit` (시간 단위 INTEGER)
2. `study_room_passes` 테이블 + `students.remaining_minutes` → `students.seatsremainingtime` (분 단위 INTEGER)

**충전 로직은 동일 유지:**
- 독서실 일(day) 충전 → 분으로 변환 (기존과 동일)
- 독서실 시간(hour) 충전 → 분으로 변환 (기존과 동일)

---

## 📝 작업 순서

### 1단계: SQL 마이그레이션 (1일)

**파일:** `supabase/migrations/20251125_refactor_credits.sql`

**작업 내용:**
1. `students` 테이블에 새 컬럼 추가
   - `credit` INTEGER DEFAULT 0 (수업 크레딧, 시간 단위)
   - `seatsremainingtime` INTEGER DEFAULT 0 (독서실 시간, 분 단위)

2. 기존 데이터 마이그레이션
   - `class_credits` 활성 데이터 → `students.credit` 합산
   - `study_room_passes` 활성 데이터 → `students.seatsremainingtime` 합산 (일/시간 → 분 변환)
   - `students.remaining_minutes` → `students.seatsremainingtime` 병합

3. 기존 테이블/컬럼 삭제
   - `class_credits` 테이블 DROP
   - `study_room_passes` 테이블 DROP
   - `students.remaining_minutes` 컬럼 DROP

---

### 2단계: 타입 정의 업데이트 (0.5일)

**파일:** `lib/types/database.ts`

**작업 내용:**
- `Student` 인터페이스에 필드 추가:
  - `credit: number`
  - `seatsremainingtime: number`
- `remaining_minutes` 제거

---

### 3단계: 코드 업데이트 (2일)

**영향받는 파일: 15개**

#### API Routes (4개)
1. `app/api/payments/route.ts`
   - `class_credits` 테이블 INSERT → `students.credit` UPDATE
   - `study_room_passes` 테이블 INSERT → `students.seatsremainingtime` UPDATE
   - granted_credits_id, granted_pass_id 필드 제거

2. `app/api/seat-assignments/route.ts`
   - `remaining_minutes` → `seatsremainingtime`

3. `app/api/class-enrollments/route.ts`
   - SELECT 쿼리 수정

4. `app/api/students/[id]/modal/route.ts`
   - `class_credits` 테이블 조회 → `students.credit` 사용

#### Components (3개)
1. `components/students/PaymentTab.tsx`
   - UI 동일, 백엔드 연동만 수정

2. `components/students/ClassCreditsTab.tsx`
   - `class_credits` 조회 → `students.credit` 사용
   - 이력 표시는 `payments` 테이블에서 조회

3. `components/students/HistoryTab.tsx`
   - 크레딧 표시 로직 수정

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

---

### 4단계: 빌드 & 테스트 (1일)

**테스트 항목:**
1. 결제 플로우 테스트
   - 수업 크레딧 결제 → `students.credit` 증가 확인
   - 독서실 일/시간 결제 → `students.seatsremainingtime` 증가 확인 (분 단위 변환)

2. 좌석 배정 플로우 테스트
   - 체크인 시 `seatsremainingtime` 차감 확인
   - 체크아웃 시 정확한 시간 차감 확인

3. 빌드 검증
   - `pnpm build` 성공 확인
   - TypeScript 에러 0건

---

## 📊 작업 분량

| 단계 | 소요 시간 | 파일 수 |
|------|----------|---------|
| SQL 마이그레이션 | 1일 | 1개 |
| 타입 정의 | 0.5일 | 1개 |
| 코드 업데이트 | 2일 | 15개 |
| 테스트 & 빌드 | 1일 | - |
| **합계** | **4.5일** | **17개** |

---

## 🔄 롤백 전략

**문제 발생 시:**
1. Migration 파일 롤백 SQL 실행
2. 코드 변경 사항 git revert
3. 빌드 & 배포

**데이터 백업:**
- Migration 실행 전 `class_credits`, `study_room_passes` 테이블 백업
- Migration 실행 후 `students.credit`, `students.seatsremainingtime` 검증 쿼리

---

## ⚠️ 주의사항

1. **단위 혼동 방지:**
   - `students.credit`: 시간 단위 (10 = 10시간)
   - `students.seatsremainingtime`: 분 단위 (600 = 10시간 = 600분)

2. **독서실 충전 로직 유지:**
   - 일(day) 입력 → `amount * 24 * 60` (분으로 변환)
   - 시간(hour) 입력 → `amount * 60` (분으로 변환)
   - 기존 로직과 동일

3. **이력 추적:**
   - 수업 크레딧 구매 이력 → `payments` 테이블의 `granted_credits_hours`
   - 독서실 충전 이력 → `payments` 테이블의 `granted_pass_amount`, `granted_pass_type`

---

## 📌 중요 규칙

**코드/SQL 실행문 작성 시:**
- ❌ 사용자에게 절대 보여주지 않음
- ✅ 바로 실행 또는 파일로 저장만
- **이유:** 토큰 낭비 방지

**문서 작성:**
- ✅ 플랜, 작업 목록, 요약만
- ❌ 상세 코드 예시 불필요

---

**마지막 업데이트:** 2025-11-23
**상태:** 승인 대기
