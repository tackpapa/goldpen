# Live Screen Feature - 독서실 라이브 스크린

학생들이 독서실에서 사용하는 개인 학습 관리 화면입니다.

## URL 구조

```
/{institutionname}/livescreen/{seatNumber}
```

예시:
- `/classflow/livescreen/1` - 지점명: classflow, 좌석번호: 1번
- `/gangnam/livescreen/25` - 지점명: gangnam, 좌석번호: 25번

## 주요 기능

### 1. 📝 일일 플래너 (Daily Planner)
- 오늘 공부할 내용을 과목별로 작성
- 완료 체크 기능
- 전체 화면 모달로 표시

### 2. ⏱️ 공부 타이머 (Study Timer)
- 시작/일시정지/초기화 기능
- 시간/분/초 단위로 표시
- 실시간 공부 시간 추적

### 3. 🚪 외출 관리 (Outing)
- **빠른 선택 버튼**: 식사, 카페, 학교, 학원, 부모님, 병원, 편의점 (7가지)
- 직접 입력 옵션 (기타 사유)
- 외출/복귀 상태 관리
- 외출 시간 기록

### 4. 😴 수면 관리 (Sleep)
- 하루 2회 제한
- **15분 자동 기상**: 최대 15분 후 자동 기상
- 실시간 카운트다운 표시 (MM:SS)
- 수면 시작/기상 시간 기록
- 수면 시간 계산

### 5. 🏆 공부시간 랭킹 (Ranking)
- 일간/주간/월간 랭킹
- 전체 학생 대비 순위
- 1~3등 특별 표시 (금/은/동 메달)
- 성명은 성만 공개 (김**, 이** 형태)
- 나의 순위와 누적 시간 표시

## 컴포넌트 구조

```
components/livescreen/
├── StudyTimer.tsx           # 공부 타이머
├── DailyPlannerModal.tsx    # 일일 플래너 모달
├── OutingModal.tsx          # 외출 신청 모달
└── StudyTimeRanking.tsx     # 공부시간 랭킹 표시
```

## 데이터 저장

현재는 localStorage를 사용하여 클라이언트 측에 저장:
- `livescreen-state-{studentId}-{seatNumber}` - 라이브 스크린 상태
- `daily-planner-{studentId}-{date}` - 일일 플래너 데이터

향후 Supabase 연동 시 서버 DB로 마이그레이션 필요.

## 타입 정의

모든 타입은 `/lib/types/database.ts`에 정의되어 있습니다:

- `DailyPlanner` - 일일 플래너
- `OutingRecord` - 외출 기록
- `SleepRecord` - 수면 기록
- `StudyTimeRecord` - 공부시간 기록
- `StudyTimeRanking` - 공부시간 랭킹
- `LiveScreenState` - 라이브 스크린 상태

## UI/UX 디자인

### 반응형 디자인
- **Primary Target**: 태블릿 (768px ~ 1024px)
- **Secondary**: 데스크톱 (1024px+)
- **Mobile**: 최소 지원 (480px+)

Tailwind breakpoints:
- `md:` - 태블릿 (768px)
- `lg:` - 데스크톱 (1024px)

### 하단 네비게이션 바 (Bottom Navigation)
- **모바일 앱 스타일**: 화면 하단 고정
- **4가지 주요 기능**: 플래너, 외출, 잠자기, 랭킹/타이머 토글
- **실시간 상태 표시**:
  - 플래너: 완료한 계획 개수 뱃지
  - 외출: 외출 중일 때 "복귀" 버튼으로 전환
  - 잠자기: 수면 횟수 뱃지 / 수면 중 카운트다운 표시
  - 랭킹/타이머: 클릭 시 토글 (아이콘과 텍스트 변경)
- **안전 영역**: 하단 20px 여백 (`pb-20`)

## 사용 예시

```typescript
// 라이브 스크린 페이지로 이동
router.push('/classflow/livescreen/1')

// 학생 ID와 좌석 번호는 페이지에서 자동으로 가져옴
// 향후 인증 시스템과 연동하여 자동 인식
```

## TODO - 향후 개선사항

- [ ] Supabase 연동 (localStorage → Database)
- [ ] 실시간 랭킹 업데이트 (Supabase Realtime)
- [ ] 학생 인증 시스템 연동
- [ ] 공부 세션 자동 저장
- [ ] 학습 통계 및 그래프
- [ ] 목표 설정 기능
- [ ] 학부모 알림 연동

## 접근 방법

현재는 URL에 직접 접근하여 사용:
```
http://localhost:3000/classflow/livescreen/1
```

향후 독서실관리 페이지에서 각 좌석 카드에 "라이브 스크린" 버튼 추가 예정.
