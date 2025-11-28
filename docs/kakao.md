# 카카오 알림톡 (Alimtalk) 연동 가이드

> GoldPen 출결 알림 시스템

---

## 개요

### 알림톡이란?
- 카카오톡으로 발송되는 **정보성 메시지**
- 광고 불가, 사전 승인된 템플릿만 발송 가능
- 수신 동의 없이 발송 가능 (정보성 메시지)
- 단가: 약 7~10원/건

### GoldPen 알림 종류

| 타입 | 설명 | 발송 시점 |
|------|------|----------|
| `study_late` | 독서실 지각 | 등원 예정 시간 경과 |
| `study_absent` | 독서실 결석 | 하원 예정 시간 경과 |
| `class_late` | 강의 지각 | 수업 시작 시간 경과 |
| `class_absent` | 강의 결석 | 수업 종료 시간 경과 |

---

## 제공업체: 뿌리오 (Ppurio)

### 선택 이유
- 국내 대표 메시징 플랫폼
- 알림톡/친구톡/SMS 통합 지원
- 합리적인 단가
- REST API 제공

### 공식 문서
- 홈페이지: https://www.ppurio.com
- API 문서: https://www.ppurio.com/api-guide
- 개발자 센터: https://dev.ppurio.com

### 단가 (2024년 기준, VAT 별도)
| 서비스 | 단가 |
|--------|------|
| 알림톡 | ~8원/건 |
| 친구톡 텍스트 | ~15원/건 |
| 친구톡 이미지 | ~25원/건 |
| SMS | ~20원/건 |
| LMS | ~50원/건 |

---

## 사전 준비

### 1. 카카오 비즈니스 채널 개설
1. [카카오 비즈니스](https://business.kakao.com) 접속
2. 카카오톡 채널 생성
3. 비즈니스 채널 전환 (사업자등록증 필요)

### 2. 뿌리오 계정 생성
1. [뿌리오](https://www.ppurio.com) 회원가입
2. 사업자 인증
3. API 키 발급

### 3. 발신 프로필 연동
1. 뿌리오 대시보드 → 카카오톡 → 발신프로필 관리
2. 카카오 비즈니스 채널 연동
3. 발신 프로필 키 확인

### 4. 템플릿 등록 및 승인
1. 뿌리오 대시보드 → 카카오톡 → 템플릿 관리
2. 템플릿 작성 (아래 템플릿 참고)
3. 검수 요청 (1~3 영업일 소요)
4. 승인 완료 후 템플릿 코드 확인

---

## 환경 변수 설정

### Cloudflare Workers (크론)
```bash
cd workers/cron

# 뿌리오 API 설정
wrangler secret put PPURIO_API_KEY        # API 키
wrangler secret put PPURIO_API_SECRET     # API 시크릿
wrangler secret put PPURIO_SENDER_KEY     # 발신 프로필 키
wrangler secret put PPURIO_ACCOUNT        # 계정 ID
```

### Next.js (.env.local)
```bash
# 뿌리오 API 설정
PPURIO_API_KEY=your_api_key
PPURIO_API_SECRET=your_api_secret
PPURIO_SENDER_KEY=your_sender_key
PPURIO_ACCOUNT=your_account_id
```

---

## 템플릿 정의

### 지각 알림 (GOLDPEN_LATE_001)
```
[골드펜] 지각 알림

안녕하세요, #{학부모명}님.

#{학생명} 학생이 아직 등원하지 않았습니다.

예정 시간: #{예정시간}
현재 시간: #{현재시간}

문의: #{기관연락처}
```

### 결석 알림 (GOLDPEN_ABSENT_001)
```
[골드펜] 결석 알림

안녕하세요, #{학부모명}님.

#{학생명} 학생이 오늘 결석 처리되었습니다.

예정 시간: #{예정시간}

사유 확인이 필요하시면 연락 부탁드립니다.

문의: #{기관연락처}
```

### 등원 알림 (GOLDPEN_CHECKIN_001)
```
[골드펜] 등원 알림

#{학생명} 학생이 등원했습니다.

등원 시간: #{등원시간}

오늘도 열심히 공부하겠습니다!
```

### 하원 알림 (GOLDPEN_CHECKOUT_001)
```
[골드펜] 하원 알림

#{학생명} 학생이 하원했습니다.

하원 시간: #{하원시간}
총 학습 시간: #{학습시간}

오늘도 수고하셨습니다!
```

---

## 구현 파일 위치

```
lib/messaging/
└── kakao-alimtalk.ts        # 메인 알림톡 유틸리티
                              # - 템플릿 정의
                              # - 발송 함수
                              # - 편의 래퍼 함수

workers/cron/
└── src/index.ts              # 크론 워커
                              # - 매 1분 실행
                              # - 독서실/강의 출결 체크
                              # - 지각/결석 알림 발송

supabase/migrations/
├── 20251125_org_settings_and_usages.sql  # kakao_talk_usages 테이블
└── 20251128_create_notification_logs.sql  # notification_logs 테이블
```

---

## 뿌리오 API 연동

### API 엔드포인트
```
Base URL: https://api.ppurio.com
알림톡 발송: POST /v1/message/alimtalk
```

### 인증 방식
```
Authorization: Bearer {access_token}
```

### 발송 요청 예시
```typescript
const response = await fetch('https://api.ppurio.com/v1/message/alimtalk', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    account: 'your_account_id',
    messageType: 'AT',  // 알림톡
    content: message,
    from: senderKey,
    to: phoneNumber,
    templateCode: 'GOLDPEN_LATE_001',
    // 버튼 (선택)
    buttons: [{
      type: 'WL',  // 웹링크
      name: '자세히 보기',
      url: 'https://goldpen.kr',
    }],
  }),
});
```

### 응답 예시
```json
{
  "code": "200",
  "message": "성공",
  "data": {
    "messageKey": "msg_123456789",
    "sendCnt": 1,
    "successCnt": 1
  }
}
```

---

## 사용 내역 조회

### DB 테이블

**kakao_talk_usages** (발송 기록)
```sql
SELECT * FROM kakao_talk_usages
WHERE org_id = 'your_org_id'
ORDER BY sent_at DESC;
```

**notification_logs** (알림 로그, 중복 방지)
```sql
SELECT * FROM notification_logs
WHERE org_id = 'your_org_id'
  AND target_date = CURRENT_DATE;
```

### API 엔드포인트
- `GET /[org]/settings/kakao-usage` - 기관별 사용 내역
- `GET /api/admin/kakao` - 전체 사용 현황 (슈퍼관리자)

---

## 크론 로직 요약

```
매 1분마다 실행:

[독서실 출결]
1. commute_schedules에서 오늘 요일 일정 조회
2. attendance_logs에서 오늘 체크인 여부 확인
3. 등원 시간 경과 + 체크인 없음 → study_late 알림
4. 하원 시간 경과 + 체크인 없음 → study_absent 알림

[강의 출결]
1. classes.schedule에서 오늘 수업 조회
2. attendance에서 출석 여부 확인
3. 수업 시작 경과 + 출석 없음 → class_late 알림
4. 수업 종료 경과 + 출석 없음 → class_absent 알림

[중복 방지]
- notification_logs 테이블에서 오늘 이미 발송했는지 확인
- UNIQUE(org_id, student_id, type, class_id, target_date)
```

---

## 배포

### 크론 워커 배포
```bash
cd workers/cron

# 개발
pnpm dev

# 배포
pnpm deploy              # 개발 환경
pnpm deploy:prod         # 프로덕션
```

### 마이그레이션 실행
```bash
# notification_logs 테이블 생성
node --input-type=module --eval "
import pg from 'pg';
import fs from 'fs';
const client = new pg.Client({ connectionString: 'YOUR_DB_URL' });
await client.connect();
const sql = fs.readFileSync('./supabase/migrations/20251128_create_notification_logs.sql', 'utf8');
await client.query(sql);
await client.end();
"
```

---

## TODO

- [ ] 뿌리오 계정 생성 및 API 키 발급
- [ ] 카카오 비즈니스 채널 개설
- [ ] 발신 프로필 연동
- [ ] 템플릿 등록 및 승인 (4개)
- [ ] 환경 변수 설정 (wrangler secret)
- [ ] lib/messaging/kakao-alimtalk.ts 뿌리오 API로 수정
- [ ] workers/cron/src/index.ts 뿌리오 API로 수정
- [ ] 테스트 발송
- [ ] 프로덕션 배포

---

## 참고 자료

- [카카오 비즈니스](https://business.kakao.com)
- [뿌리오 홈페이지](https://www.ppurio.com)
- [뿌리오 API 문서](https://dev.ppurio.com)
- [카카오 알림톡 가이드](https://kakaobusiness.gitbook.io/main/ad/bizmessage/notice/alimtalk)

---

**마지막 업데이트**: 2025-11-28
