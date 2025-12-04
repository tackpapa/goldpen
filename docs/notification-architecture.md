# 알림톡 발송 아키텍처

> 최종 업데이트: 2025-12-04

## 개요

GoldPen의 알림톡 발송 시스템은 **DB Queue 기반 비동기 처리** 방식을 사용합니다. 모든 알림은 `notification_queue` 테이블에 먼저 저장되고, 1분마다 실행되는 Cron Worker가 큐를 처리하여 실제 발송합니다.

## 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           알림 생성 소스                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  프론트엔드   │  │   Cron       │  │  프론트엔드   │  │  프론트엔드   │ │
│  │  (seats)     │  │  (1분 주기)   │  │  (lessons)   │  │  (homework)  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                 │                 │         │
│         ▼                 ▼                 ▼                 ▼         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      API Worker (Hono)                            │  │
│  │  /api/attendance/* │ /api/lessons/:id/notify │ /api/homework     │  │
│  │  /api/exams/:id/scores                                            │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                   │
│                                     ▼                                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              insertNotificationQueueBatch()                       │  │
│  │              (workers/api/src/lib/notifications.ts)               │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                   │
└─────────────────────────────────────┼───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        notification_queue (DB)                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ id | org_id | type | payload | status | retry_count | created_at  │ │
│  │────────────────────────────────────────────────────────────────────│ │
│  │ ... | ... | assignment_new | {...} | pending | 0 | 2025-12-04 ... │ │
│  │ ... | ... | exam_result    | {...} | pending | 0 | 2025-12-04 ... │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      │ (1분마다 Cron 실행)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Cron Worker (1분 주기)                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ processNotificationQueue()                                         │ │
│  │ - pending 상태 알림 조회                                            │ │
│  │ - 타입별 처리 (checkin, checkout, assignment_new, exam_result, ...) │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  Queue Worker (Consumer)                                │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ sendNotificationWithBalancePostgres()                              │ │
│  │ - 잔액 확인 및 차감                                                  │ │
│  │ - 트랜잭션 기록 (credit_transactions)                               │ │
│  │ - 메시지 로그 기록 (message_logs)                                    │ │
│  │ - 알림 로그 기록 (notification_logs)                                 │ │
│  │ - Solapi 알림톡 발송                                                 │ │
│  │ - Telegram 모니터링 발송                                             │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                   ┌──────────────────┼──────────────────┐
                   ▼                  ▼                  ▼
           ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
           │   Solapi    │    │  Telegram   │    │     DB      │
           │  알림톡 API  │    │   Bot API   │    │   Logging   │
           └─────────────┘    └─────────────┘    └─────────────┘
```

## 알림 타입 (10개)

| # | 타입 | 설명 | 트리거 | Solapi 템플릿 ID |
|---|------|------|--------|------------------|
| 1 | `late` | 지각 알림 | Cron (수업 시작 후) | `7omf6A4JxL` |
| 2 | `absent` | 결석 알림 | Cron (수업 종료 후) | `grzUv3iBJ8` |
| 3 | `checkin` | 등원 알림 | API (출석 체크) | `09nmpwYZnv` |
| 4 | `checkout` | 하원 알림 | API (하원 체크) | `TJygY5dhpe` |
| 5 | `study_out` | 외출 알림 | API (외출 체크) | `a4Qhq4ubGx` |
| 6 | `study_return` | 복귀 알림 | API (복귀 체크) | `ncH60rIuUj` |
| 7 | `daily_report` | 일일 학습 리포트 | Cron (하루 종료) | `6dkVxZdXta` |
| 8 | `lesson_report` | 수업일지 알림 | API (강사 수동) | `gcrkaJcXt7` |
| 9 | `exam_result` | 시험 결과 알림 | API (점수 등록) | `KfVANY1h0J` |
| 10 | `assignment` | 과제 알림 | API (과제 생성) | `s2crA6UhRd` |

## 데이터베이스 테이블

### notification_queue (알림 큐)

```sql
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  type TEXT NOT NULL,  -- 알림 타입
  payload JSONB NOT NULL,  -- 알림 데이터 (student_id, 템플릿 변수 등)
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_org_type ON notification_queue(org_id, type);
```

### notification_logs (알림 로그)

```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  student_id UUID NOT NULL,
  type TEXT NOT NULL,  -- CHECK constraint로 제한
  class_id UUID,
  target_date DATE NOT NULL,
  scheduled_time TIME,
  recipient_phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- type CHECK constraint
CHECK (type = ANY (ARRAY[
  'study_late', 'study_absent',
  'class_late', 'class_absent',
  'commute_late', 'commute_absent',
  'academy_checkin', 'academy_checkout',
  'study_checkin', 'study_checkout',
  'study_out', 'study_return',
  'lesson_report', 'exam_result',
  'assignment_new', 'daily_report'
]))
```

### message_logs (메시지 비용 로그)

```sql
CREATE TABLE message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  message_type TEXT NOT NULL,  -- 'kakao_alimtalk', 'sms' 등
  recipient_count INTEGER DEFAULT 1,
  price_per_message INTEGER,  -- 판매가
  cost_per_message INTEGER,   -- 원가
  total_price INTEGER,
  total_cost INTEGER,
  profit INTEGER,
  status TEXT,  -- 'sent', 'failed'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### credit_transactions (크레딧 차감 기록)

```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  type TEXT NOT NULL,  -- 'deduction', 'charge' 등
  amount INTEGER NOT NULL,  -- 음수: 차감, 양수: 충전
  balance_after INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 주요 파일 구조

```
workers/
├── api/src/
│   ├── lib/
│   │   ├── notifications.ts       # insertNotificationQueueBatch()
│   │   └── solapi.ts              # Solapi 템플릿 정의
│   └── routes/
│       ├── attendance.ts          # checkin/checkout → Queue
│       ├── homework.ts            # assignment_new → Queue
│       ├── exams.[id].scores.ts   # exam_result → Queue
│       └── lessons.[id].ts        # lesson_report → Queue
│
├── cron/src/
│   └── index.ts                   # Cron 스케줄러 (1분 주기)
│
├── queue/src/
│   └── index.ts                   # Queue Consumer
│       ├── processNotificationQueue()  # 알림 큐 처리
│       ├── processLateAbsent()         # 지각/결석 처리
│       └── processDailyReport()        # 일일 리포트 처리
│
└── shared/src/
    └── notifications.ts           # sendNotificationWithBalancePostgres()
```

## 발송 흐름 상세

### 1. 알림 생성 (API Worker)

```typescript
// workers/api/src/lib/notifications.ts
export async function insertNotificationQueueBatch(
  client: PoolClient,
  orgId: string,
  type: string,
  items: NotificationQueuePayload[]
): Promise<{ insertedCount: number }> {
  // notification_queue에 배치 INSERT
  for (const item of items) {
    await client.query(
      `INSERT INTO notification_queue (org_id, type, payload, status)
       VALUES ($1, $2, $3, 'pending')`,
      [orgId, type, JSON.stringify(item)]
    );
  }
  return { insertedCount: items.length };
}
```

### 2. 큐 처리 (Queue Worker)

```typescript
// workers/queue/src/index.ts - processNotificationQueue()
const pendingNotifications = await sql`
  SELECT * FROM notification_queue
  WHERE status = 'pending'
  ORDER BY created_at ASC
  LIMIT 100
`;

for (const notification of pendingNotifications) {
  // 1. 상태를 'processing'으로 변경
  await sql`UPDATE notification_queue SET status = 'processing' WHERE id = ${notification.id}`;

  // 2. 타입별 처리
  if (notification.type === 'assignment_new') {
    // 과제 알림 처리
  } else if (notification.type === 'exam_result') {
    // 시험 결과 알림 처리
  } // ...

  // 3. sendNotificationWithBalancePostgres() 호출

  // 4. 상태를 'completed'로 변경
  await sql`UPDATE notification_queue SET status = 'completed', processed_at = NOW() WHERE id = ${notification.id}`;
}
```

### 3. 실제 발송 (Shared Library)

```typescript
// workers/shared/src/notifications.ts
export async function sendNotificationWithBalancePostgres(params) {
  // 1. 잔액 확인 및 차감
  const balanceResult = await checkAndDeductBalancePostgres(sql, orgId, orgName);

  // 2. 트랜잭션 기록
  await recordTransactionPostgres(sql, orgId, price, newBalance, type, studentName);

  // 3. 메시지 로그 기록
  await recordMessageLogPostgres(sql, orgId, type, studentName, price, cost, 'sent');

  // 4. notification_logs 기록
  await sql`
    INSERT INTO notification_logs (org_id, student_id, type, message, status, target_date, created_at)
    VALUES (${orgId}, ${studentId}, ${dbType}, ${message}, 'sent', CURRENT_DATE, NOW())
  `;

  // 5. Telegram 발송 (모니터링용)
  await sendTelegramWithSolapiFormat(telegramConfig, type, solapiVariables, recipientPhone);

  // 6. Solapi 알림톡 발송
  await sendSolapiAlimtalk(solapiConfig, { type, phone, recipientName, variables });
}
```

## Solapi 템플릿 변수

각 알림 타입별 템플릿 변수:

| 타입 | 변수 |
|------|------|
| `late` | 기관명, 학생명, 시간 |
| `absent` | 기관명, 학생명 |
| `checkin` | 기관명, 학생명, 시간 |
| `checkout` | 기관명, 학생명, 시간 |
| `study_out` | 기관명, 학생명, 시간 |
| `study_return` | 기관명, 학생명, 시간 |
| `daily_report` | 기관명, 학생명, 날짜, 총학습시간, 완료과목 |
| `lesson_report` | 기관명, 학생명, 오늘수업, 학습포인트, 선생님코멘트, 원장님코멘트, 숙제, 복습팁 |
| `exam_result` | 기관명, 학생명, 시험명, 점수 |
| `assignment` | 기관명, 학생명, 과제, 마감일 |

## 에러 처리 및 재시도

1. **잔액 부족**: `message_logs`에 'failed' 상태로 기록, 알림톡 미발송
2. **Solapi API 오류**: `notification_queue`에 `error_message` 기록, 상태는 'completed'
3. **DB 오류**: `retry_count` 증가, 3회 초과 시 'failed'로 변경

## 모니터링

- **Telegram Bot**: 모든 알림 발송 시 Telegram으로 모니터링 메시지 전송
- **Cloudflare Dashboard**: Worker 로그 확인
- **DB 로그**: `notification_logs`, `message_logs` 테이블 조회

## 배포

```bash
# API Worker 배포
cd workers/api && wrangler deploy

# Queue Worker 배포
cd workers/queue && wrangler deploy

# Cron Worker 배포
cd workers/cron && wrangler deploy
```

## 테스트

```bash
# Cron 테스트 엔드포인트
curl "https://goldpen-attendance-cron.hello-51f.workers.dev/test?type=assignment_new&student=테스트학생&org=골드펜"

# 지원 타입:
# late, absent, checkin, checkout, study_out, study_return,
# daily_report, lesson_report, exam_result, assignment
```
