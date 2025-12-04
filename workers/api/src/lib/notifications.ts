/**
 * 실시간 알림 발송 유틸리티
 * - API 이벤트 발생 시 호출
 * - 카카오 알림톡 발송 (Solapi API 사용)
 *
 * [템플릿 사용 가이드]
 * 1. 조직 설정에서 messageTemplatesParent를 가져옵니다
 * 2. fillTemplate()으로 변수를 치환합니다
 * 3. 템플릿이 없으면 create*Message() 함수를 fallback으로 사용합니다
 *
 * [Solapi 연동]
 * - Solapi 알림톡 API 사용 (https://api.solapi.com)
 * - 템플릿 코드 매핑: lib/solapi.ts 참조
 */
import type { Env } from "../env";
import {
  sendSolapiAlimtalk,
  type NotificationType as SolapiNotificationType,
} from "./solapi";

// ============================================================
// 기본 메시지 템플릿 (설정에서 가져오지 못할 경우 fallback)
// 통합된 키: late, absent, checkin, checkout, study_out, study_return, ...
// ============================================================
export const DEFAULT_TEMPLATES: Record<string, string> = {
  // 출결 알림 (통합) - Solapi 템플릿 변수에 맞춤
  'late': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 예정 시간({{시간}})에 아직 도착하지 않아 안내드립니다. 확인 부탁드립니다.',
  'absent': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 오늘 예정된 일정에 출석하지 않아 결석 처리되었습니다. 사유 확인이 필요하시면 연락 부탁드립니다.',
  'checkin': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 안전하게 도착했습니다. 오늘도 열심히 공부하겠습니다!',
  'checkout': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 일과를 마치고 귀가했습니다. 안전하게 귀가하길 바랍니다.',
  // 독서실 전용
  'study_out': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 잠시 외출합니다.',
  'study_return': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 복귀했습니다.',
  // 수업 리포트 (Solapi 템플릿 변수에 맞춤: 기관명, 학생명, 오늘수업, 학습포인트, 선생님코멘트, 원장님코멘트, 숙제, 복습팁)
  'lesson_report': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생의 수업 리포트입니다.\n\n📚 오늘 수업: {{오늘수업}}\n💡 학습 포인트: {{학습포인트}}\n👨‍🏫 선생님 코멘트: {{선생님코멘트}}\n👔 원장님 코멘트: {{원장님코멘트}}\n📝 숙제: {{숙제}}\n📖 복습 팁: {{복습팁}}\n\n오늘도 수고했어요!',
  // 시험 결과
  'exam_result': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생의 시험 결과를 안내드립니다.\n\n{{시험명}}: {{점수}}점\n\n열심히 준비한 만큼 좋은 결과로 이어지길 바랍니다. 궁금하신 점은 편하게 연락 주세요!',
  // 과제 관련 (Solapi 템플릿 변수에 맞춤: 과제명 -> 과제)
  'assignment_new': '{{기관명}}입니다, 학부모님.\n\n새 과제가 등록되었습니다.\n\n📚 수업: {{수업명}}\n📝 과제: {{과제}}\n📅 마감일: {{마감일}}\n\n과제 제출 잊지 마세요!',
};

/**
 * 템플릿 변수 치환 함수
 * @param template - 템플릿 문자열 (예: "{{기관명}}입니다, {{학생명}} 학생...")
 * @param variables - 변수 객체 (예: { '기관명': '골든펜', '학생명': '김철수' })
 * @returns 치환된 문자열
 */
export function fillTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return result;
}

/**
 * 날짜를 간단한 한국어 형식으로 포맷
 * @param date - Date 객체 또는 날짜 문자열
 * @returns 포맷된 날짜 문자열 (예: "12월 3일")
 */
export function formatDateSimple(date: string | Date | null | undefined): string {
  if (!date) return '-';
  let dateStr: string;

  // Date 객체인지 확인 (toISOString 메서드 존재 여부로 체크)
  if (typeof date === 'object' && date !== null && typeof (date as Date).toISOString === 'function') {
    dateStr = (date as Date).toISOString();
  } else {
    dateStr = String(date);
  }

  // ISO 날짜 형식에서 날짜만 추출 (YYYY-MM-DD)
  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${parseInt(isoMatch[2], 10)}월 ${parseInt(isoMatch[3], 10)}일`;
  }

  // "Mon Dec 02 2025" 형식 처리
  const longMatch = dateStr.match(/\w{3}\s+(\w{3})\s+(\d{1,2})\s+(\d{4})/);
  if (longMatch) {
    const months: Record<string, number> = {
      'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
      'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
    };
    const month = months[longMatch[1]] || 1;
    const day = parseInt(longMatch[2], 10);
    return `${month}월 ${day}일`;
  }

  return dateStr;
}

/**
 * 조직 설정에서 템플릿을 가져오는 함수
 * @param client - DB 클라이언트
 * @param orgId - 조직 ID
 * @param templateKey - 템플릿 키 (예: 'academy_checkin')
 * @returns 템플릿 문자열 (없으면 기본 템플릿)
 */
export async function getTemplateFromOrg(
  client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
  orgId: string,
  templateKey: string
): Promise<string> {
  try {
    const result = await client.query(
      `SELECT settings FROM organizations WHERE id = $1`,
      [orgId]
    );
    if (result.rows.length > 0) {
      const settings = (result.rows[0] as { settings?: Record<string, unknown> }).settings;
      if (settings?.messageTemplatesParent) {
        const templates = settings.messageTemplatesParent as Record<string, string>;
        if (templates[templateKey]) {
          return templates[templateKey];
        }
      }
    }
  } catch (error) {
    console.error(`[Templates] Failed to get template for org ${orgId}:`, error);
  }
  return DEFAULT_TEMPLATES[templateKey] || '';
}

// 알림 타입 정의 (통합된 키)
export type NotificationType =
  | "late" | "absent"
  | "checkin" | "checkout"
  | "study_out" | "study_return"
  | "daily_report" | "lesson_report"
  | "exam_result"
  | "assignment_new";

export interface NotificationParams {
  orgId: string;
  orgName: string;
  studentId: string;
  studentName: string;
  type: NotificationType;
  classId?: string;
  className?: string;
  recipientPhone?: string;
  recipientName?: string; // 수신자명 (학부모 이름)
  message: string;
  metadata?: Record<string, unknown>;
  // PPURIO 알림톡용 템플릿 변수
  templateVariables?: Record<string, string>;
}

// ============================================================
// 큐 기반 알림 삽입 (권장 - Queue Worker에서 처리)
// ============================================================

/**
 * 알림 큐에 삽입 (Queue Worker에서 처리됨)
 * - 1분마다 Cron이 Queue Worker를 실행하여 처리
 * - 잔액 차감, 알림톡 발송, 텔레그램 전송 모두 Queue Worker에서 통합 처리
 * - 대량 발송 시 안정적
 */
export interface NotificationQueuePayload {
  student_id: string;
  // assignment_new
  class_id?: string;
  class_name?: string;
  title?: string;
  due_date?: string;
  description?: string;
  // exam_result
  exam_id?: string;
  exam_title?: string;
  score?: number;
  total_score?: number;
  // lesson_report
  lesson_id?: string;
  오늘수업?: string;
  학습포인트?: string;
  선생님코멘트?: string;
  원장님코멘트?: string;
  숙제?: string;
  복습팁?: string;
}

export async function insertNotificationQueue(
  client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
  orgId: string,
  type: NotificationType,
  payload: NotificationQueuePayload
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const result = await client.query(
      `INSERT INTO notification_queue (org_id, type, payload, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id`,
      [orgId, type, JSON.stringify(payload)]
    );

    const insertedRow = result.rows[0] as { id: string } | undefined;
    if (insertedRow?.id) {
      console.log(`[NotificationQueue] Inserted: ${type} for student ${payload.student_id}`);
      return { success: true, id: insertedRow.id };
    }

    return { success: false, error: 'Insert failed - no id returned' };
  } catch (error) {
    console.error(`[NotificationQueue] Insert error:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * 여러 알림을 큐에 일괄 삽입
 * @param client - DB 클라이언트
 * @param orgId - 조직 ID
 * @param type - 알림 타입 (모든 아이템에 동일하게 적용)
 * @param items - 알림 페이로드 배열
 */
export async function insertNotificationQueueBatch(
  client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
  orgId: string,
  type: NotificationType,
  items: NotificationQueuePayload[]
): Promise<{ success: boolean; insertedCount: number; error?: string }> {
  if (items.length === 0) {
    return { success: true, insertedCount: 0 };
  }

  try {
    const values: unknown[] = [];
    const placeholders: string[] = [];

    items.forEach((item, i) => {
      const offset = i * 3;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, 'pending')`);
      values.push(orgId, type, JSON.stringify(item));
    });

    await client.query(
      `INSERT INTO notification_queue (org_id, type, payload, status)
       VALUES ${placeholders.join(', ')}`,
      values
    );

    console.log(`[NotificationQueue] Batch inserted: ${items.length} ${type} notifications`);
    return { success: true, insertedCount: items.length };
  } catch (error) {
    console.error(`[NotificationQueue] Batch insert error:`, error);
    return { success: false, insertedCount: 0, error: String(error) };
  }
}

// ============================================================
// 직접 발송 (레거시 - 새 코드에서는 insertNotificationQueue 사용 권장)
// ============================================================

/**
 * 알림 발송 (DB 기록 + 카카오 알림톡)
 * - 잔액 확인 후 발송
 * - 잔액 부족 시 실패 처리
 *
 * @deprecated 새 코드에서는 insertNotificationQueue() 사용 권장
 */
export async function sendNotification(
  client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
  env: Env,
  params: NotificationParams
): Promise<{ success: boolean; error?: string }> {
  const {
    orgId,
    orgName,
    studentId,
    studentName,
    type,
    classId,
    recipientPhone,
    recipientName,
    message,
    metadata,
    templateVariables,
  } = params;

  const today = new Date().toISOString().split("T")[0];

  try {
    // 중복 체크 - 같은 날 같은 타입의 알림이 이미 발송되었는지
    const checkResult = await client.query(
      `SELECT id FROM notification_logs
       WHERE org_id = $1 AND student_id = $2 AND type = $3 AND target_date = $4::date
       ${classId ? "AND class_id = $5" : "AND class_id IS NULL"}
       LIMIT 1`,
      classId ? [orgId, studentId, type, today, classId] : [orgId, studentId, type, today]
    );

    if (checkResult.rows.length > 0) {
      console.log(`[Notification] Skipping duplicate: ${type} for ${studentName} on ${today}`);
      return { success: true };
    }

    // ============================================================
    // 잔액 확인 및 차감 로직
    // ============================================================
    console.log(`[Notification] 잔액 차감 로직 시작: ${orgName} - ${studentName} (${type})`);

    // 1. 알림톡 가격 조회
    const pricingResult = await client.query(
      `SELECT price, cost FROM message_pricing
       WHERE message_type = 'kakao_alimtalk' AND is_active = true
       LIMIT 1`
    );
    const pricing = pricingResult.rows[0] as { price: number; cost: number } | undefined;
    const price = pricing?.price ?? 100; // 기본값 100원
    const cost = pricing?.cost ?? 12;    // 기본값 12원
    console.log(`[Notification] 가격 조회: price=${price}, cost=${cost}`);

    // 2. 현재 잔액 확인
    const balanceResult = await client.query(
      `SELECT credit_balance FROM organizations WHERE id = $1`,
      [orgId]
    );
    const currentBalance = (balanceResult.rows[0] as { credit_balance: number })?.credit_balance ?? 0;
    console.log(`[Notification] 현재 잔액: ${orgName} = ${currentBalance}원`);

    // 3. 잔액 부족 체크
    if (currentBalance < price) {
      console.log(`[Notification] 잔액 부족: ${orgName} (잔액: ${currentBalance}원, 필요: ${price}원)`);

      // message_logs에 실패 기록
      try {
        await client.query(
          `INSERT INTO message_logs (
            org_id, message_type, recipient_count,
            price_per_message, cost_per_message,
            total_price, total_cost, profit,
            status, description
          ) VALUES ($1, 'kakao_alimtalk', 1, $2, $3, $2, $3, $4, 'failed', $5)`,
          [orgId, price, cost, price - cost, `${type}: ${studentName} (잔액부족)`]
        );
      } catch (logError) {
        console.error(`[MessageLog] Failed to record insufficient balance:`, logError);
      }

      return { success: false, error: '잔액부족' };
    }

    // 4. 잔액 차감 (트랜잭션처럼 동작하도록 UPDATE ... RETURNING 사용)
    const deductResult = await client.query(
      `UPDATE organizations
       SET credit_balance = credit_balance - $1, updated_at = NOW()
       WHERE id = $2 AND credit_balance >= $1
       RETURNING credit_balance`,
      [price, orgId]
    );

    if (deductResult.rows.length === 0) {
      // 동시성 문제로 차감 실패 (다른 요청이 먼저 차감함)
      console.log(`[Notification] 잔액 차감 실패 (동시성): ${orgName}`);
      return { success: false, error: '잔액부족' };
    }

    const newBalance = (deductResult.rows[0] as { credit_balance: number }).credit_balance;
    console.log(`[Notification] 잔액 차감: ${orgName} (${currentBalance} -> ${newBalance}원, -${price}원)`);

    // 5. credit_transactions에 차감 내역 기록
    try {
      await client.query(
        `INSERT INTO credit_transactions (
          org_id, type, amount, balance_after, description
        ) VALUES ($1, 'deduction', $2, $3, $4)`,
        [orgId, -price, newBalance, `알림톡 발송: ${type} - ${studentName}`]
      );
    } catch (txError) {
      console.error(`[CreditTransaction] Failed to record deduction:`, txError);
    }

    // ============================================================
    // 알림 발송 (잔액 차감 후)
    // ============================================================

    // 알림 기록 저장 (새 타입은 마이그레이션 후 저장 가능)
    try {
      await client.query(
        `INSERT INTO notification_logs (
          org_id, student_id, type, class_id, target_date,
          recipient_phone, message, status
        ) VALUES ($1, $2, $3, $4, $5::date, $6, $7, 'sent')`,
        [
          orgId,
          studentId,
          type,
          classId || null,
          today,
          recipientPhone || null,
          message,
        ]
      );
      console.log(`[Notification] Recorded: ${type} for ${studentName}`);
    } catch (logError) {
      // 새 타입은 마이그레이션 전까지 로그 저장 실패할 수 있음 - 알림 발송은 계속 진행
      console.log(`[Notification] Log save skipped (migration needed): ${type} - ${logError}`);
    }

    // lesson_report 텔레그램은 lessons.[id].ts의 /notify 엔드포인트에서 발송 (중복 방지)

    // 알림 발송 내역 기록 (message_logs) - 성공
    try {
      await client.query(
        `INSERT INTO message_logs (
          org_id, message_type, recipient_count,
          price_per_message, cost_per_message,
          total_price, total_cost, profit,
          status, description
        ) VALUES ($1, 'kakao_alimtalk', 1, $2, $3, $2, $3, $4, 'sent', $5)`,
        [orgId, price, cost, price - cost, `${type}: ${studentName}`]
      );
      console.log(`[MessageLog] Recorded notification for org ${orgId}: ${type}`);
    } catch (logError) {
      console.error(`[MessageLog] Failed to record:`, logError);
    }

    // 카카오 알림톡 발송 (Solapi API)
    if (recipientPhone) {
      // 타입 매핑 (assignment_new -> assignment)
      const solapiType = mapToSolapiType(type);

      // 기본 변수 설정 (templateVariables가 없는 경우)
      const defaultVariables: Record<string, string> = {
        "기관명": orgName,
        "학생명": studentName,
      };

      // templateVariables가 있으면 병합
      const variables = templateVariables
        ? { ...defaultVariables, ...templateVariables }
        : defaultVariables;

      const alimtalkResult = await sendSolapiAlimtalk(env, {
        type: solapiType,
        phone: recipientPhone,
        recipientName: recipientName || `${studentName} 학부모`,
        variables,
      });

      if (!alimtalkResult.success) {
        console.log(`[Notification] Alimtalk failed: ${alimtalkResult.error}`);
      } else {
        console.log(`[Notification] Solapi 알림톡 발송 성공: ${type} -> ${recipientPhone}`);
      }

      // 텔레그램으로도 전송 (모니터링용)
      await sendTelegramWithSolapiFormat(env, solapiType, variables, recipientPhone);
    } else {
      console.log(`[Notification] Skipping Kakao (no phone): ${message}`);
    }

    return { success: true };
  } catch (error) {
    console.error(`[Notification] Error for ${studentName}:`, error);

    // 에러 기록
    try {
      await client.query(
        `INSERT INTO notification_logs (
          org_id, student_id, type, class_id, target_date,
          recipient_phone, message, status, error_message
        ) VALUES ($1, $2, $3, $4, $5::date, $6, $7, 'failed', $8)
        ON CONFLICT (org_id, student_id, type, class_id, target_date) DO UPDATE
        SET status = 'failed', error_message = $8`,
        [
          orgId,
          studentId,
          type,
          classId || null,
          today,
          recipientPhone || null,
          message,
          String(error),
        ]
      );
    } catch {
      // 무시
    }

    return { success: false, error: String(error) };
  }
}

/**
 * 벌크 알림 발송 (여러 건을 한 번에 처리)
 * - 총 필요 금액을 먼저 계산하여 잔액 확인
 * - 잔액이 충분하면 한 번에 차감 후 발송
 * - 잔액이 부족하면 가능한 만큼만 발송
 */
export interface BulkNotificationResult {
  totalRequested: number;
  totalSent: number;
  totalFailed: number;
  insufficientBalance: boolean;
  deductedAmount: number;
  remainingBalance: number;
  failedItems: Array<{ studentName: string; reason: string }>;
}

export async function sendBulkNotifications(
  client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
  env: Env,
  orgId: string,
  orgName: string,
  notifications: Array<Omit<NotificationParams, 'orgId' | 'orgName'>>
): Promise<BulkNotificationResult> {
  const result: BulkNotificationResult = {
    totalRequested: notifications.length,
    totalSent: 0,
    totalFailed: 0,
    insufficientBalance: false,
    deductedAmount: 0,
    remainingBalance: 0,
    failedItems: [],
  };

  if (notifications.length === 0) {
    return result;
  }

  try {
    // 1. 알림톡 가격 조회
    const pricingResult = await client.query(
      `SELECT price, cost FROM message_pricing
       WHERE message_type = 'kakao_alimtalk' AND is_active = true
       LIMIT 1`
    );
    const pricing = pricingResult.rows[0] as { price: number; cost: number } | undefined;
    const pricePerMessage = pricing?.price ?? 100;
    const costPerMessage = pricing?.cost ?? 12;

    // 2. 총 필요 금액 계산
    const totalRequired = pricePerMessage * notifications.length;

    // 3. 현재 잔액 확인 및 차감 (원자적 연산)
    // UPDATE ... WHERE credit_balance >= totalRequired 로 동시성 문제 방지
    const deductResult = await client.query(
      `UPDATE organizations
       SET credit_balance = credit_balance - $1, updated_at = NOW()
       WHERE id = $2 AND credit_balance >= $1
       RETURNING credit_balance`,
      [totalRequired, orgId]
    );

    let availableCount = notifications.length;
    let deductedAmount = totalRequired;
    let newBalance: number;

    if (deductResult.rows.length === 0) {
      // 잔액 부족 - 부분 발송 시도
      const balanceResult = await client.query(
        `SELECT credit_balance FROM organizations WHERE id = $1`,
        [orgId]
      );
      const currentBalance = (balanceResult.rows[0] as { credit_balance: number })?.credit_balance ?? 0;

      // 보낼 수 있는 최대 건수 계산
      availableCount = Math.floor(currentBalance / pricePerMessage);
      deductedAmount = availableCount * pricePerMessage;

      if (availableCount === 0) {
        // 1건도 보낼 수 없음
        console.log(`[BulkNotification] 잔액 부족: ${orgName} (잔액: ${currentBalance}원, 필요: ${totalRequired}원, 요청: ${notifications.length}건)`);

        result.insufficientBalance = true;
        result.totalFailed = notifications.length;
        result.remainingBalance = currentBalance;
        result.failedItems = notifications.map(n => ({
          studentName: n.studentName,
          reason: '잔액부족'
        }));

        // 실패 내역 벌크 기록
        await recordBulkMessageLogs(client, orgId, notifications, pricePerMessage, costPerMessage, 'failed', '(잔액부족)');

        return result;
      }

      // 부분 차감
      const partialDeductResult = await client.query(
        `UPDATE organizations
         SET credit_balance = credit_balance - $1, updated_at = NOW()
         WHERE id = $2 AND credit_balance >= $1
         RETURNING credit_balance`,
        [deductedAmount, orgId]
      );

      if (partialDeductResult.rows.length === 0) {
        // 동시성 문제로 차감 실패
        result.insufficientBalance = true;
        result.totalFailed = notifications.length;
        result.failedItems = notifications.map(n => ({
          studentName: n.studentName,
          reason: '잔액부족(동시성)'
        }));
        return result;
      }

      newBalance = (partialDeductResult.rows[0] as { credit_balance: number }).credit_balance;
      result.insufficientBalance = true;

      console.log(`[BulkNotification] 부분 발송: ${orgName} (${availableCount}/${notifications.length}건, -${deductedAmount}원)`);
    } else {
      newBalance = (deductResult.rows[0] as { credit_balance: number }).credit_balance;
      console.log(`[BulkNotification] 전체 발송: ${orgName} (${notifications.length}건, -${deductedAmount}원)`);
    }

    result.deductedAmount = deductedAmount;
    result.remainingBalance = newBalance;

    // 4. credit_transactions에 벌크 차감 내역 기록
    const notificationTypes = [...new Set(notifications.slice(0, availableCount).map(n => n.type))].join(', ');
    await client.query(
      `INSERT INTO credit_transactions (
        org_id, type, amount, balance_after, description
      ) VALUES ($1, 'deduction', $2, $3, $4)`,
      [orgId, -deductedAmount, newBalance, `벌크 알림톡 발송: ${notificationTypes} (${availableCount}건)`]
    );

    // 5. 발송할 알림과 실패할 알림 분리
    const toSend = notifications.slice(0, availableCount);
    const toFail = notifications.slice(availableCount);

    // 6. 성공 건 처리 (message_logs 벌크 기록 + 실제 발송)
    if (toSend.length > 0) {
      await recordBulkMessageLogs(client, orgId, toSend, pricePerMessage, costPerMessage, 'sent', '');

      // 실제 알림 발송 (Solapi 알림톡)
      for (const notification of toSend) {
        try {
          // 카카오 알림톡 발송 (Solapi)
          if (notification.recipientPhone) {
            const solapiType = mapToSolapiType(notification.type);
            const variables = notification.templateVariables || {
              "기관명": orgName,
              "학생명": notification.studentName,
            };

            const alimtalkResult = await sendSolapiAlimtalk(env, {
              type: solapiType,
              phone: notification.recipientPhone,
              recipientName: notification.recipientName || `${notification.studentName} 학부모`,
              variables,
            });

            if (alimtalkResult.success) {
              console.log(`[BulkNotification] Solapi 발송 성공: ${notification.type} -> ${notification.recipientPhone}`);
            } else {
              console.log(`[BulkNotification] Solapi 발송 실패: ${alimtalkResult.error}`);
            }

            // 텔레그램으로도 전송 (모니터링용)
            await sendTelegramWithSolapiFormat(env, solapiType, variables, notification.recipientPhone);
          }

          result.totalSent++;
        } catch (sendError) {
          console.error(`[BulkNotification] Send error for ${notification.studentName}:`, sendError);
          result.totalSent++; // 비용은 이미 차감되었으므로 sent로 카운트
        }
      }
    }

    // 7. 실패 건 처리 (잔액 부족으로 발송 못 한 건들)
    if (toFail.length > 0) {
      await recordBulkMessageLogs(client, orgId, toFail, pricePerMessage, costPerMessage, 'failed', '(잔액부족)');
      result.totalFailed = toFail.length;
      result.failedItems = toFail.map(n => ({
        studentName: n.studentName,
        reason: '잔액부족'
      }));
    }

    return result;
  } catch (error) {
    console.error(`[BulkNotification] Error:`, error);
    result.totalFailed = notifications.length;
    result.failedItems = notifications.map(n => ({
      studentName: n.studentName,
      reason: String(error)
    }));
    return result;
  }
}

/**
 * message_logs 벌크 INSERT 헬퍼
 */
async function recordBulkMessageLogs(
  client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
  orgId: string,
  notifications: Array<Omit<NotificationParams, 'orgId' | 'orgName'>>,
  price: number,
  cost: number,
  status: 'sent' | 'failed',
  suffix: string
): Promise<void> {
  if (notifications.length === 0) return;

  // 벌크 INSERT를 위한 VALUES 생성
  const values: unknown[] = [];
  const placeholders: string[] = [];

  notifications.forEach((n, i) => {
    const offset = i * 5;
    placeholders.push(`($${offset + 1}, 'kakao_alimtalk', 1, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
    values.push(orgId, price, cost, status, `${n.type}: ${n.studentName}${suffix}`);
  });

  try {
    await client.query(
      `INSERT INTO message_logs (
        org_id, message_type, recipient_count,
        price_per_message, cost_per_message, status, description
      ) VALUES ${placeholders.join(', ')}`,
      values
    );
  } catch (error) {
    console.error(`[BulkMessageLogs] Error:`, error);
  }
}

/**
 * NotificationType -> SolapiNotificationType 매핑
 * (assignment_new -> assignment 등)
 */
function mapToSolapiType(type: NotificationType): SolapiNotificationType {
  const mapping: Record<NotificationType, SolapiNotificationType> = {
    late: "late",
    absent: "absent",
    checkin: "checkin",
    checkout: "checkout",
    study_out: "study_out",
    study_return: "study_return",
    daily_report: "daily_report", // 당일 학습 진행 결과
    lesson_report: "lesson_report", // 수업일지 전송
    exam_result: "exam_result",
    assignment_new: "assignment", // assignment_new -> assignment
  };
  return mapping[type] || "checkin";
}

// ============================================================
// 헬퍼 함수들 - 각 시나리오별 메시지 생성
// ============================================================
//
// ⚠️ 이 함수들은 하드코딩된 메시지를 반환합니다.
// 새 코드에서는 아래 패턴을 사용하세요:
//
// const template = await getTemplateFromOrg(client, orgId, 'academy_checkin');
// const message = fillTemplate(template, { '기관명': orgName, '학생명': studentName, '시간': time });
//
// ============================================================

/**
 * 등원 체크인 메시지 생성
 * @deprecated 대신 getTemplateFromOrg()와 fillTemplate() 사용 권장
 */
export function createCheckinMessage(
  orgName: string,
  studentName: string,
  time: string
): string {
  return fillTemplate(DEFAULT_TEMPLATES['checkin'], {
    '기관명': orgName,
    '학생명': studentName,
    '시간': time,
  });
}

/**
 * 하원 체크아웃 메시지 생성
 * @deprecated 대신 getTemplateFromOrg()와 fillTemplate() 사용 권장
 */
export function createCheckoutMessage(
  orgName: string,
  studentName: string,
  time: string,
  studyMinutes?: number
): string {
  const studyTimeStr = studyMinutes
    ? ` (총 학습시간: ${Math.floor(studyMinutes / 60)}시간 ${studyMinutes % 60}분)`
    : "";
  return fillTemplate(DEFAULT_TEMPLATES['checkout'], {
    '기관명': orgName,
    '학생명': studentName,
    '시간': time,
  }) + studyTimeStr;
}

/**
 * 독서실 외출 메시지 생성
 * @deprecated 대신 getTemplateFromOrg()와 fillTemplate() 사용 권장
 */
export function createStudyOutMessage(
  orgName: string,
  studentName: string,
  time: string
): string {
  return fillTemplate(DEFAULT_TEMPLATES['study_out'], {
    '기관명': orgName,
    '학생명': studentName,
    '시간': time,
  });
}

/**
 * 독서실 복귀 메시지 생성
 * @deprecated 대신 getTemplateFromOrg()와 fillTemplate() 사용 권장
 */
export function createStudyReturnMessage(
  orgName: string,
  studentName: string,
  time: string
): string {
  return fillTemplate(DEFAULT_TEMPLATES['study_return'], {
    '기관명': orgName,
    '학생명': studentName,
    '시간': time,
  });
}

/**
 * 수업 리포트 메시지 생성 (Solapi 변수명에 맞춤)
 * Solapi 변수: 기관명, 학생명, 오늘수업, 학습포인트, 선생님코멘트, 원장님코멘트, 숙제, 복습팁
 * @deprecated 대신 getTemplateFromOrg()와 fillTemplate() 사용 권장
 */
export function createLessonReportMessage(
  orgName: string,
  studentName: string,
  variables: {
    오늘수업?: string;
    학습포인트?: string;
    선생님코멘트?: string;
    원장님코멘트?: string;
    숙제?: string;
    복습팁?: string;
  }
): string {
  return fillTemplate(DEFAULT_TEMPLATES['lesson_report'], {
    '기관명': orgName,
    '학생명': studentName,
    '오늘수업': variables.오늘수업 || '-',
    '학습포인트': variables.학습포인트 || '-',
    '선생님코멘트': variables.선생님코멘트 || '-',
    '원장님코멘트': variables.원장님코멘트 || '-',
    '숙제': variables.숙제 || '-',
    '복습팁': variables.복습팁 || '-',
  });
}

/**
 * 시험 결과 메시지 생성
 * @deprecated 대신 getTemplateFromOrg()와 fillTemplate() 사용 권장
 */
export function createExamResultMessage(
  orgName: string,
  studentName: string,
  examTitle: string,
  score: number,
  totalScore: number,
  rank?: number,
  totalStudents?: number
): string {
  const scoreStr = rank && totalStudents
    ? `${score}/${totalScore}점 (${totalStudents}명 중 ${rank}등)`
    : `${score}/${totalScore}점`;

  return fillTemplate(DEFAULT_TEMPLATES['exam_result'], {
    '기관명': orgName,
    '학생명': studentName,
    '시험명': examTitle,
    '점수': scoreStr,
  });
}

/**
 * 새 과제 알림 메시지 생성 (Solapi 변수명에 맞춤: 과제명 -> 과제)
 * @deprecated 대신 getTemplateFromOrg()와 fillTemplate() 사용 권장
 */
export function createAssignmentNewMessage(
  orgName: string,
  className: string,
  homeworkTitle: string,
  dueDate: string,
  description?: string
): string {
  const baseMessage = fillTemplate(DEFAULT_TEMPLATES['assignment_new'], {
    '기관명': orgName,
    '수업명': className,
    '과제': homeworkTitle,
    '마감일': dueDate,
  });

  if (description) {
    return baseMessage.replace('\n\n과제 제출', `\n📋 내용: ${description}\n\n과제 제출`);
  }
  return baseMessage;
}

// ============================================================
// 텔레그램 모니터링 알림
// ============================================================

/**
 * 텔레그램으로 모니터링 알림 전송
 */
async function sendTelegram(
  env: Env,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('[Telegram] No token/chatId configured. Message:', message.substring(0, 50));
    return { success: false, error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured' };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    );

    const result = await response.json() as { ok: boolean; description?: string };

    if (result.ok) {
      console.log('[Telegram] Message sent successfully');
      return { success: true };
    }

    console.error('[Telegram] API error:', result);
    return { success: false, error: result.description || 'Telegram API error' };
  } catch (error) {
    console.error('[Telegram] Error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 텔레그램으로 Solapi 형식의 알림 전송 (모니터링용)
 * Queue Worker의 sendTelegramWithSolapiFormat() 와 동일한 형식
 */
async function sendTelegramWithSolapiFormat(
  env: Env,
  type: string,
  variables: Record<string, string>,
  phone: string
): Promise<void> {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('[Telegram] Skipping - no config');
    return;
  }

  // 타입별 한글 레이블
  const typeLabels: Record<string, string> = {
    late: '지각 알림',
    absent: '결석 알림',
    checkin: '등원 알림',
    checkout: '하원 알림',
    study_out: '외출 알림',
    study_return: '복귀 알림',
    daily_report: '일일 리포트',
    lesson_report: '수업일지',
    exam_result: '시험 결과',
    assignment: '과제 알림',
  };

  const typeLabel = typeLabels[type] || type;

  // 변수 포맷팅
  let variablesText = '';
  for (const [key, value] of Object.entries(variables)) {
    variablesText += `  ${key}: ${value}\n`;
  }

  const message = `[Solapi API - ${type}]
타입: ${typeLabel}
수신자: ${phone}
변수:
${variablesText}`;

  try {
    await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
        }),
      }
    );
    console.log(`[Telegram] Sent Solapi format: ${type} -> ${phone}`);
  } catch (error) {
    console.error('[Telegram] Error sending Solapi format:', error);
  }
}
