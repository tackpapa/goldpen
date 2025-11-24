# TODO: org_id/멀티테넌트 보강 작업 리스트 (API · BFF · Frontend · DB)

## 1) DB 마이그레이션 (필수)
- [x] class_enrollments
  - org_id 컬럼 NOT NULL + FK(organizations) 적용
  - student_id FK(students) 보장
  - 인덱스: (org_id), (org_id, class_id)
- [x] call_records
  - org_id UUID NOT NULL FK organizations(id)
  - student_id TEXT → UUID FK students(id)
  - RLS: org_id = get_user_org_id()
  - 인덱스: (org_id), (org_id, student_id)
- [x] livescreen_state
  - org_id UUID NOT NULL FK organizations
  - student_id TEXT → UUID FK students
  - RLS 정책 추가
- [x] manager_calls
  - org_id UUID NOT NULL FK organizations
  - student_id TEXT → UUID FK students
  - RLS 정책 추가
- [x] outing_records
  - org_id UUID NOT NULL FK organizations
  - student_id TEXT → UUID FK students
  - RLS 정책 추가
- [x] sleep_records
  - org_id UUID NOT NULL FK organizations
  - student_id TEXT → UUID FK students
  - RLS 정책 추가
- [x] waitlist_consultations
  - org_id 컬럼 추가 + FK
  - 관련 FK 정리 및 RLS

- [x] attendance_logs 신규 테이블 생성 + RLS (20251124_attendance_logs.sql) ✔ 적용
- [x] legacy attendance 테이블 더미 데이터 삭제

## 2) 출결/좌석/로그 테이블 역할 분리
- [x] attendance_log(or attendance_logs): 기관 체류(등원/하원) 영속 기록용 확정, org_id/학생 FK/RLS/인덱스 생성 완료.
- [x] seat_assignments: 실시간 상태·버튼 트리거 전용 유지, 체크인/아웃 시 attendance_logs 기록하도록 분리(Edge API).
- [x] sleep_records/outing_records/call_records/manager_calls: 좌석 사용 중 세부 이벤트 용도 정리, org_id 컬럼/ RLS 적용.

## 3) API/BFF 수정 (org 필터 + 역할 분리)
- [x] /api/students/[id]/modal
  - attendance_logs 기반 출결/체류 계산으로 교체
  - usages → attendance_logs/sleep/outing 분리, org_id 필터 반영
- [x] /api/class-enrollments
  - org_id 필터 적용 완료 (active만 조회)
- [x] /api/classes/[id]/assign-students
  - 삽입 페이로드에 org_id 포함, 기존 배정 삭제도 org 범위
- [x] /api/seat-assignments
  - 체크인/체크아웃 시 attendance_logs 기록 + org_id 강제
  - class_enrollments 조회에 org_id 필터 추가
- [x] /api/attendance
  - class_enrollments join에 org_id 필터 추가
- [x] /api/attendance/reconcile
  - class_enrollments 조회 org_id 필터 추가
- [x] BFF/콘솔 구독 관련 (app/[institutionname]/(dashboard)/seats, livescreen)
  - Supabase Realtime 채널 from('call_records' 등) → org_id 필터 반영
  - fetch/get queries org_id 스코프 확인
- [ ] 신규 `/api/attendance/logs` (옵션): 기간/학생별 조회 전용으로 seats/liveattendance/모달 공통 사용
- [ ] `/api/attendance/logs` 추가 (liveattendance 키패드 → attendance_logs 직접 기록 + 기간/학생별 조회 GET 지원) — 테스트 종료 후 일시 비활성

- [x] /api/attendance dev 서비스 폴백 후 정상 동작 확인 (401 해소)
## 4) Frontend 수정
- [x] /seats 페이지: 등원/하원 버튼 → attendance_logs 기록 흐름 확인(SeatAssignments API) + 토스트 반영
- [x] liveattendance 페이지: seat_assignments 실시간 상태 + attendance_logs 직접 기록(키패드) 동기화 + 옵티미스틱 피드백
- [x] StudyRoomTab: 총/월/평균/리스트 = attendance_logs 기반(usages), seatsremainingtime 잔여시간 사용, 휴식/외출/콜 별도
- [x] 실시간/조회 쿼리 org_id 필터 적용 (call_records, manager_calls, outing_records, sleep_records, livescreen_state 등)
- [x] Realtime 구독 채널 필터에 org_id 조건 추가 (supabase.channel where clause)

## 5) 테스트/검증 (증명 가능)
- [x] 마이그레이션 후 describe/constraint 확인 (attendance_log, seat_assignments, sleep/outing/call/manager_calls)
- [ ] API 스크립트(HTTPie/Postman):
  - 로그인 → seat-assignments 배정 → PUT check_in → PUT check_out
  - GET attendance_log(or /api/students/[id]/modal)에서 duration/횟수 반영 확인
  - GET modal에서 sleep/outing/call/manager_call org 스코프 확인
  - [x] (부분) service=1 dev 모드로 0319, 8391, 1235 학생 check_out → check_in 성공, attendance_logs 반영 확인
- [ ] Attendance 페이지 학생명 표시 보완 (student relation null 대비 보강) → 서버 보강 완료, 화면 확인 필요
- [x] DB 쿼리 검증: org_id != expected 행이 0건인지 확인 (sleep/outing/call/manager_calls/attendance_log)
- [ ] Playwright 단기 시나리오: /seats 체크인/아웃 후 모달에서 통계·리스트 갱신 스냅샷
- [ ] liveattendance 화면 실시간 상태 갱신 확인(좌석 상태) + attendance_log 기록 누락 여부 로그 캡처
- [ ] 결과/로그/응답 JSON을 TODO 문서에 링크·캡처로 남겨 “정상 동작” 증명

- [x] Apply attendance_logs migration (requires DB URL or psql access)
- [x] Apply attendance_logs migration (직접 psql 연결로 적용)

## 6) 배포 전 점검
- [x] Next dev 빌드/실행 확인 (8000 포트)
- [ ] Edge runtime API 경로에서 org_id 컬럼 미존재 에러가 사라졌는지 로그 확인

## 7) LiveScreen (좌석 필수 공부데이터) — 좌석 배정 없으면 기록 불가
- [x] seat_assignments GET: student_code/org_id 포함 확인 및 org 필터 재점검
- [x] livescreen/{seatNumber} 로드 시 seat_assignment 없으면 기록 UI 비활성 + 경고
- [x] useLivescreenState: sleep/outing/livescreen_state CRUD 시 studentId/orgId 없으면 중단, org_id/seat_number 저장
- [x] study 데이터 API (subjects, daily-study-stats, daily-planners): org 필터 적용, student_id 사용 (코드 fallback 없음). study-time-rankings는 org 필터 기존 적용.
- [x] org 불일치/좌석 미배정 시 기록/조회 차단 가드 추가 (실측/에러 메시지 확인)
- [ ] 테스트: 좌석 배정 O → sleep/outing/타이머/플래너 기록 DB 반영 확인, 좌석 배정 X → 기록 차단/오류 메시지 확인; org mismatch 차단 확인 (진행 예정)
