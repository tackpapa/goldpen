/**
 * GoldPen 공유 알림 라이브러리
 * - API Worker와 Queue Worker에서 공통으로 사용
 * - 잔액 확인/차감, 알림톡 발송, 텔레그램 발송 통합
 */

// ============================================================
// 타입 정의
// ============================================================

export interface DbClient {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PostgresSql = any;

export interface TelegramConfig {
  botToken?: string;
  chatId?: string;
}

export interface SolapiConfig {
  apiKey?: string;      // SOLAPI_API_KEY
  apiSecret?: string;   // SOLAPI_API_SECRET
  pfId?: string;        // SOLAPI_PF_ID (카카오 채널 연동 후 발급)
  senderPhone?: string; // SOLAPI_SENDER_PHONE (발신번호)
}

// Legacy - PPURIO 호환성 유지 (deprecated)
export interface PpurioConfig {
  account?: string;
  authKey?: string;
  senderProfile?: string;
  password?: string;
  senderKey?: string;
}

export type NotificationType =
  | "late" | "absent"
  | "checkin" | "checkout"
  | "study_out" | "study_return"
  | "daily_report" | "lesson_report"
  | "exam_result"
  | "assignment_new" | "assignment";

export interface NotificationParams {
  orgId: string;
  orgName: string;
  studentId: string;
  studentName: string;
  type: NotificationType;
  classId?: string;
  className?: string;
  recipientPhone?: string;
  recipientName?: string;
  message: string;
  metadata?: Record<string, unknown>;
  templateVariables?: Record<string, string>;
}

export interface BalanceCheckResult {
  success: boolean;
  currentBalance: number;
  price: number;
  cost: number;
  newBalance?: number;
  error?: string;
}

export interface NotificationResult {
  success: boolean;
  error?: string;
  balanceDeducted?: number;
}

// ============================================================
// 기본 메시지 템플릿
// ============================================================

export const DEFAULT_TEMPLATES: Record<string, string> = {
  'late': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 예정 시간({{예정시간}})에 아직 도착하지 않아 안내드립니다. 확인 부탁드립니다.',
  'absent': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 오늘 예정된 일정에 출석하지 않아 결석 처리되었습니다. 사유 확인이 필요하시면 연락 부탁드립니다.',
  'checkin': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 안전하게 도착했습니다. 오늘도 열심히 공부하겠습니다!',
  'checkout': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 일과를 마치고 귀가했습니다. 안전하게 귀가하길 바랍니다.',
  'study_out': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 잠시 외출합니다.',
  'study_return': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 복귀했습니다.',
  'daily_report': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생의 {{날짜}} 학습 현황을 전해드립니다.\n\n오늘 총 {{총학습시간}} 동안 열심히 공부했고, {{완료과목}} 과목을 완료했습니다. 꾸준히 노력하는 모습이 대견합니다. 앞으로도 응원 부탁드립니다!',
  'lesson_report': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생의 {{수업명}} 수업 리포트입니다.\n\n📅 날짜: {{날짜}}\n📚 수업 내용: {{수업내용}}\n📝 숙제: {{숙제}}\n\n오늘도 수고했어요!',
  'exam_result': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생의 시험 결과를 안내드립니다.\n\n{{시험명}}: {{점수}}점\n\n열심히 준비한 만큼 좋은 결과로 이어지길 바랍니다.',
  'assignment_new': '{{기관명}}입니다, 학부모님.\n\n새 과제가 등록되었습니다.\n\n📚 수업: {{수업명}}\n📝 과제: {{과제명}}\n📅 마감일: {{마감일}}\n\n과제 제출 잊지 마세요!',
};

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * 템플릿 변수 치환
 */
export function fillTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return result;
}

/**
 * 날짜 포맷 (한국어)
 */
export function formatDateSimple(date: string | Date | null | undefined): string {
  if (!date) return '-';
  let dateStr: string;

  if (typeof date === 'object' && date !== null && typeof (date as Date).toISOString === 'function') {
    dateStr = (date as Date).toISOString();
  } else {
    dateStr = String(date);
  }

  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${parseInt(isoMatch[2], 10)}월 ${parseInt(isoMatch[3], 10)}일`;
  }

  return dateStr;
}

/**
 * 현재 시간 문자열 (한국시간)
 */
export function getKoreanTimeString(): string {
  return new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul"
  });
}

// ============================================================
// 텔레그램 발송
// ============================================================

export async function sendTelegram(
  config: TelegramConfig,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const { botToken, chatId } = config;

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

// ============================================================
// 텔레그램으로 Solapi API 형식 전송 (테스트용)
// ============================================================

/**
 * Solapi API 요청 형식 그대로 텔레그램으로 전송
 * - 템플릿 승인 후 이 함수만 제거하면 알림톡 바로 작동
 */
export async function sendTelegramWithSolapiFormat(
  config: TelegramConfig,
  type: NotificationType,
  variables: Record<string, string>,
  recipientPhone?: string
): Promise<{ success: boolean; error?: string }> {
  const { botToken, chatId } = config;

  if (!botToken || !chatId) {
    console.log('[Telegram/Solapi] No token/chatId configured');
    return { success: false, error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured' };
  }

  const templateConfig = SOLAPI_TEMPLATE_CONFIGS[type];
  if (!templateConfig) {
    console.error(`[Telegram/Solapi] Unknown type: ${type}`);
    return { success: false, error: `Unknown type: ${type}` };
  }

  // Solapi 변수 형식으로 변환: #{변수명} → 값
  const solapiVariables: Record<string, string> = {};
  templateConfig.variables.forEach((varName) => {
    solapiVariables[`#{${varName}}`] = variables[varName] || "";
  });

  // Solapi API 요청 형식 그대로
  const solapiRequest = {
    type,
    templateId: templateConfig.templateId,
    to: recipientPhone || "N/A",
    variables: solapiVariables,
  };

  const message = `[Solapi API - ${type}]\n${JSON.stringify(solapiRequest, null, 2)}`;

  try {
    const response = await fetch(
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

    const result = await response.json() as { ok: boolean; description?: string };

    if (result.ok) {
      console.log(`[Telegram/Solapi] Sent ${type} format successfully`);
      return { success: true };
    }

    console.error('[Telegram/Solapi] API error:', result);
    return { success: false, error: result.description || 'Telegram API error' };
  } catch (error) {
    console.error('[Telegram/Solapi] Error:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================================
// Solapi 알림톡 발송 (PPURIO 대체)
// ============================================================

// Solapi 템플릿 설정 - 템플릿 ID는 Solapi 대시보드에서 등록 후 입력
// 변수는 #{변수명} 형태로 템플릿에 등록되어야 함
interface TemplateConfig {
  templateId: string;  // Solapi 템플릿 ID
  variables: string[]; // 변수 목록 (기관명, 학생명 등)
}

// Solapi 템플릿 설정 - Solapi 대시보드에서 등록된 템플릿 ID
// 변수는 #{변수명} 형태로 Solapi에 등록되어 있음
export const SOLAPI_TEMPLATE_CONFIGS: Record<NotificationType, TemplateConfig> = {
  // 지각 알림: 기관명, 학생명, 시간
  late: {
    templateId: "7omf6A4JxL",
    variables: ["기관명", "학생명", "시간"],
  },
  // 결석 알림: 기관명, 학생명
  absent: {
    templateId: "grzUv3iBJ8",
    variables: ["기관명", "학생명"],
  },
  // 등원 알림: 기관명, 학생명, 시간
  checkin: {
    templateId: "09nmpwYZnv",
    variables: ["기관명", "학생명", "시간"],
  },
  // 하원 알림: 기관명, 학생명, 시간
  checkout: {
    templateId: "TJygY5dhpe",
    variables: ["기관명", "학생명", "시간"],
  },
  // 외출 알림: 기관명, 학생명, 시간
  study_out: {
    templateId: "a4Qhq4ubGx",
    variables: ["기관명", "학생명", "시간"],
  },
  // 복귀 알림: 기관명, 학생명, 시간
  study_return: {
    templateId: "ncH60rIuUj",
    variables: ["기관명", "학생명", "시간"],
  },
  // 당일 학습 진행 결과: 기관명, 학생명, 날짜, 총학습시간, 완료과목 (Cron 자동 발송)
  daily_report: {
    templateId: "6dkVxZdXta",
    variables: ["기관명", "학생명", "날짜", "총학습시간", "완료과목"],
  },
  // 수업일지 알림: 기관명, 학생명, 오늘수업, 학습포인트, 선생님코멘트, 원장님코멘트, 숙제, 복습팁 (강사 수동 발송)
  lesson_report: {
    templateId: "gcrkaJcXt7",
    variables: ["기관명", "학생명", "오늘수업", "학습포인트", "선생님코멘트", "원장님코멘트", "숙제", "복습팁"],
  },
  // 시험관리 알림: 기관명, 학생명, 시험명, 점수
  exam_result: {
    templateId: "KfVANY1h0J",
    variables: ["기관명", "학생명", "시험명", "점수"],
  },
  // 과제관리 알림: 기관명, 학생명, 과제, 마감일
  assignment_new: {
    templateId: "s2crA6UhRd",
    variables: ["기관명", "학생명", "과제", "마감일"],
  },
  assignment: {
    templateId: "s2crA6UhRd",
    variables: ["기관명", "학생명", "과제", "마감일"],
  },
};

/**
 * Solapi HMAC-SHA256 인증 헤더 생성
 */
async function createSolapiAuthHeader(apiKey: string, apiSecret: string): Promise<string> {
  const date = new Date().toISOString();
  const salt = crypto.randomUUID().replace(/-/g, '').substring(0, 32);
  const data = date + salt;

  // HMAC-SHA256 서명 생성 (Web Crypto API 사용 - Edge Runtime 호환)
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const messageData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signatureHex}`;
}

/**
 * Solapi 알림톡 발송 함수
 */
export async function sendSolapiAlimtalk(
  config: SolapiConfig,
  params: {
    type: NotificationType;
    phone: string;
    recipientName?: string;
    variables: Record<string, string>;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { apiKey, apiSecret, pfId, senderPhone } = config;

  if (!apiKey || !apiSecret || !pfId) {
    console.log(`[Solapi] Dev mode - Would send ${params.type} to ${params.phone}`);
    return { success: true, messageId: `mock_${Date.now()}` };
  }

  const templateConfig = SOLAPI_TEMPLATE_CONFIGS[params.type];
  if (!templateConfig) {
    console.error(`[Solapi] Unknown type: ${params.type}`);
    return { success: false, error: `Unknown type: ${params.type}` };
  }

  // 템플릿 ID가 없으면 스킵
  if (!templateConfig.templateId) {
    console.log(`[Solapi] Template not configured for ${params.type}`);
    return { success: false, error: `Template not configured: ${params.type}` };
  }

  // 전화번호 정규화 (하이픈 제거)
  const normalizedPhone = params.phone.replace(/[^0-9]/g, "");

  // Solapi 변수 형식: #{변수명} → 값
  const variables: Record<string, string> = {};
  templateConfig.variables.forEach((varName) => {
    variables[`#{${varName}}`] = params.variables[varName] || "";
  });

  try {
    // HMAC-SHA256 인증 헤더 생성
    const authHeader = await createSolapiAuthHeader(apiKey, apiSecret);

    // 알림톡 발송 요청
    const requestBody = {
      message: {
        to: normalizedPhone,
        from: senderPhone || "",
        kakaoOptions: {
          pfId,
          templateId: templateConfig.templateId,
          variables,
          disableSms: false, // 실패 시 SMS 대체발송
        },
      },
    };

    console.log(`[Solapi] Sending ${params.type} to ${normalizedPhone}:`, {
      templateId: templateConfig.templateId,
      variables,
    });

    const response = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json() as {
      groupId?: string;
      messageId?: string;
      statusCode?: string;
      statusMessage?: string;
      errorCode?: string;
      errorMessage?: string;
    };

    if (response.ok && !result.errorCode) {
      console.log(`[Solapi] Sent successfully:`, {
        groupId: result.groupId,
        messageId: result.messageId,
      });
      return { success: true, messageId: result.messageId || result.groupId };
    }

    console.error("[Solapi] Send failed:", result);
    return { success: false, error: result.errorMessage || result.statusMessage || `API 오류` };
  } catch (error) {
    console.error("[Solapi] Error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Solapi 템플릿 ID 업데이트 함수 (런타임에 호출 가능)
 */
export function updateSolapiTemplateId(type: NotificationType, templateId: string): void {
  if (SOLAPI_TEMPLATE_CONFIGS[type]) {
    SOLAPI_TEMPLATE_CONFIGS[type].templateId = templateId;
    console.log(`[Solapi] Template updated: ${type} → ${templateId}`);
  }
}

/**
 * 모든 Solapi 템플릿 ID 일괄 업데이트
 */
export function updateAllSolapiTemplateIds(templateIds: Partial<Record<NotificationType, string>>): void {
  for (const [type, templateId] of Object.entries(templateIds)) {
    if (templateId && SOLAPI_TEMPLATE_CONFIGS[type as NotificationType]) {
      SOLAPI_TEMPLATE_CONFIGS[type as NotificationType].templateId = templateId;
    }
  }
  console.log(`[Solapi] Templates updated:`, templateIds);
}

// Legacy PPURIO 함수 (deprecated - Solapi로 대체됨)
export async function sendPpurioAlimtalk(
  config: PpurioConfig,
  params: {
    type: NotificationType;
    phone: string;
    recipientName?: string;
    variables: Record<string, string>;
  }
): Promise<{ success: boolean; messageKey?: string; error?: string }> {
  console.warn("[PPURIO] Deprecated - Use sendSolapiAlimtalk instead");
  return { success: false, error: "PPURIO deprecated - use Solapi" };
}

// ============================================================
// 잔액 확인 및 차감 (pg client 버전)
// ============================================================

export async function checkAndDeductBalance(
  client: DbClient,
  orgId: string,
  orgName: string
): Promise<BalanceCheckResult> {
  try {
    // 1. 알림톡 가격 조회
    const pricingResult = await client.query(
      `SELECT price, cost FROM message_pricing
       WHERE message_type = 'kakao_alimtalk' AND is_active = true
       LIMIT 1`
    );
    const pricing = pricingResult.rows[0] as { price: number; cost: number } | undefined;
    const price = pricing?.price ?? 100;
    const cost = pricing?.cost ?? 12;

    // 2. 현재 잔액 확인
    const balanceResult = await client.query(
      `SELECT credit_balance FROM organizations WHERE id = $1`,
      [orgId]
    );
    const currentBalance = (balanceResult.rows[0] as { credit_balance: number })?.credit_balance ?? 0;

    console.log(`[Balance] ${orgName}: 현재 ${currentBalance}원, 필요 ${price}원`);

    // 3. 잔액 부족 체크
    if (currentBalance < price) {
      console.log(`[Balance] 잔액 부족: ${orgName}`);
      return {
        success: false,
        currentBalance,
        price,
        cost,
        error: '잔액부족'
      };
    }

    // 4. 원자적 잔액 차감
    const deductResult = await client.query(
      `UPDATE organizations
       SET credit_balance = credit_balance - $1, updated_at = NOW()
       WHERE id = $2 AND credit_balance >= $1
       RETURNING credit_balance`,
      [price, orgId]
    );

    if (deductResult.rows.length === 0) {
      console.log(`[Balance] 차감 실패 (동시성): ${orgName}`);
      return {
        success: false,
        currentBalance,
        price,
        cost,
        error: '잔액부족(동시성)'
      };
    }

    const newBalance = (deductResult.rows[0] as { credit_balance: number }).credit_balance;
    console.log(`[Balance] 차감 완료: ${orgName} (${currentBalance} → ${newBalance}원, -${price}원)`);

    return {
      success: true,
      currentBalance,
      price,
      cost,
      newBalance
    };
  } catch (error) {
    console.error(`[Balance] Error for ${orgName}:`, error);
    return {
      success: false,
      currentBalance: 0,
      price: 100,
      cost: 12,
      error: String(error)
    };
  }
}

// ============================================================
// 잔액 확인 및 차감 (postgres.js 버전 - Queue Worker용)
// ============================================================

export async function checkAndDeductBalancePostgres(
  sql: PostgresSql,
  orgId: string,
  orgName: string
): Promise<BalanceCheckResult> {
  try {
    // 1. 알림톡 가격 조회
    const pricingRows = await sql<{ price: number; cost: number }[]>`
      SELECT price, cost FROM message_pricing
      WHERE message_type = 'kakao_alimtalk' AND is_active = true
      LIMIT 1
    `;
    const price = pricingRows[0]?.price ?? 100;
    const cost = pricingRows[0]?.cost ?? 12;

    // 2. 현재 잔액 확인
    const balanceRows = await sql<{ credit_balance: number }[]>`
      SELECT credit_balance FROM organizations WHERE id = ${orgId}
    `;
    const currentBalance = balanceRows[0]?.credit_balance ?? 0;

    console.log(`[Balance] ${orgName}: 현재 ${currentBalance}원, 필요 ${price}원`);

    // 3. 잔액 부족 체크
    if (currentBalance < price) {
      console.log(`[Balance] 잔액 부족: ${orgName}`);
      return {
        success: false,
        currentBalance,
        price,
        cost,
        error: '잔액부족'
      };
    }

    // 4. 원자적 잔액 차감
    const deductRows = await sql<{ credit_balance: number }[]>`
      UPDATE organizations
      SET credit_balance = credit_balance - ${price}, updated_at = NOW()
      WHERE id = ${orgId} AND credit_balance >= ${price}
      RETURNING credit_balance
    `;

    if (deductRows.length === 0) {
      console.log(`[Balance] 차감 실패 (동시성): ${orgName}`);
      return {
        success: false,
        currentBalance,
        price,
        cost,
        error: '잔액부족(동시성)'
      };
    }

    const newBalance = deductRows[0].credit_balance;
    console.log(`[Balance] 차감 완료: ${orgName} (${currentBalance} → ${newBalance}원, -${price}원)`);

    return {
      success: true,
      currentBalance,
      price,
      cost,
      newBalance
    };
  } catch (error) {
    console.error(`[Balance] Error for ${orgName}:`, error);
    return {
      success: false,
      currentBalance: 0,
      price: 100,
      cost: 12,
      error: String(error)
    };
  }
}

// ============================================================
// 트랜잭션 기록 (postgres.js 버전)
// ============================================================

export async function recordTransactionPostgres(
  sql: PostgresSql,
  orgId: string,
  price: number,
  newBalance: number,
  type: NotificationType,
  studentName: string
): Promise<void> {
  try {
    await sql`
      INSERT INTO credit_transactions (
        org_id, type, amount, balance_after, description
      ) VALUES (
        ${orgId}, 'deduction', ${-price}, ${newBalance}, ${`알림톡 발송: ${type} - ${studentName}`}
      )
    `;
  } catch (error) {
    console.error(`[Transaction] Failed to record:`, error);
  }
}

// ============================================================
// 메시지 로그 기록 (postgres.js 버전)
// ============================================================

export async function recordMessageLogPostgres(
  sql: PostgresSql,
  orgId: string,
  type: NotificationType,
  studentName: string,
  price: number,
  cost: number,
  status: 'sent' | 'failed',
  suffix: string = ''
): Promise<void> {
  try {
    await sql`
      INSERT INTO message_logs (
        org_id, message_type, recipient_count,
        price_per_message, cost_per_message,
        total_price, total_cost, profit,
        status, description
      ) VALUES (
        ${orgId}, 'kakao_alimtalk', 1,
        ${price}, ${cost},
        ${price}, ${cost}, ${price - cost},
        ${status}, ${`${type}: ${studentName}${suffix}`}
      )
    `;
  } catch (error) {
    console.error(`[MessageLog] Failed to record:`, error);
  }
}

// ============================================================
// 통합 알림 발송 함수 (postgres.js 버전 - Queue Worker용)
// ============================================================

export interface SendNotificationPostgresParams {
  sql: PostgresSql;
  telegramConfig: TelegramConfig;
  solapiConfig?: SolapiConfig;  // Solapi로 변경 (PPURIO 대체)
  ppurioConfig?: PpurioConfig;  // Legacy 호환성
  orgId: string;
  orgName: string;
  studentId: string;
  studentName: string;
  type: NotificationType;
  recipientPhone?: string;
  recipientName?: string;
  message: string;
  templateVariables?: Record<string, string>; // 추가 템플릿 변수
}

export async function sendNotificationWithBalancePostgres(
  params: SendNotificationPostgresParams
): Promise<NotificationResult> {
  const {
    sql,
    telegramConfig,
    solapiConfig,
    orgId,
    orgName,
    studentId,
    studentName,
    type,
    recipientPhone,
    recipientName,
    message,
    templateVariables,
  } = params;

  console.log(`[Notification] 시작: ${orgName} - ${studentName} (${type})`);

  // 1. 잔액 확인 및 차감
  const balanceResult = await checkAndDeductBalancePostgres(sql, orgId, orgName);

  if (!balanceResult.success) {
    // 잔액 부족 - 실패 기록
    await recordMessageLogPostgres(
      sql, orgId, type, studentName,
      balanceResult.price, balanceResult.cost,
      'failed', ' (잔액부족)'
    );
    return { success: false, error: balanceResult.error };
  }

  // 2. 트랜잭션 기록
  await recordTransactionPostgres(
    sql, orgId,
    balanceResult.price,
    balanceResult.newBalance!,
    type, studentName
  );

  // 3. 메시지 로그 기록 (성공)
  await recordMessageLogPostgres(
    sql, orgId, type, studentName,
    balanceResult.price, balanceResult.cost,
    'sent', ''
  );

  // 4. notification_logs 기록 (알림톡 통계용)
  // checkin/checkout은 DB CHECK constraint에 따라 academy_* 또는 study_*로 변환 필요
  // 여기서는 기본적으로 academy_*로 저장 (스터디카페는 Queue Worker에서 직접 처리)
  let dbType = type;
  if (type === 'checkin') dbType = 'academy_checkin' as NotificationType;
  if (type === 'checkout') dbType = 'academy_checkout' as NotificationType;

  try {
    await sql`
      INSERT INTO notification_logs (org_id, student_id, type, message, status, target_date, created_at)
      VALUES (${orgId}, ${studentId}, ${dbType}, ${message}, 'sent', CURRENT_DATE, NOW())
    `;
  } catch (error) {
    console.error(`[NotificationLogs] Failed to record:`, error);
  }

  // Solapi 변수 준비 (기관명, 학생명 + 추가 변수)
  const solapiVariables: Record<string, string> = {
    "기관명": orgName,
    "학생명": studentName,
    ...templateVariables, // 추가 변수 병합
  };

  // 4. 텔레그램 발송 (Solapi API 형식으로 - 테스트/모니터링용)
  // TODO: Solapi 템플릿 승인 후 이 블록 제거
  if (telegramConfig.botToken && telegramConfig.chatId) {
    await sendTelegramWithSolapiFormat(telegramConfig, type, solapiVariables, recipientPhone);
  }

  // 5. 카카오 알림톡 발송 (Solapi)
  // TODO: Solapi 템플릿 승인 후 DRY_RUN 해제
  if (recipientPhone && solapiConfig) {
    await sendSolapiAlimtalk(solapiConfig, {
      type,
      phone: recipientPhone,
      recipientName: recipientName || `${studentName} 학부모`,
      variables: solapiVariables,
    });
  }

  console.log(`[Notification] 완료: ${orgName} - ${studentName} (${type}), -${balanceResult.price}원`);

  return {
    success: true,
    balanceDeducted: balanceResult.price
  };
}

// ============================================================
// 메시지 생성 헬퍼 함수들
// ============================================================

export function createCheckinMessage(orgName: string, studentName: string, time: string): string {
  return fillTemplate(DEFAULT_TEMPLATES['checkin'], {
    '기관명': orgName,
    '학생명': studentName,
    '시간': time,
  });
}

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

export function createLateMessage(orgName: string, studentName: string, expectedTime: string): string {
  return fillTemplate(DEFAULT_TEMPLATES['late'], {
    '기관명': orgName,
    '학생명': studentName,
    '예정시간': expectedTime,
  });
}

export function createAbsentMessage(orgName: string, studentName: string): string {
  return fillTemplate(DEFAULT_TEMPLATES['absent'], {
    '기관명': orgName,
    '학생명': studentName,
  });
}

export function createStudyOutMessage(orgName: string, studentName: string, time: string): string {
  return fillTemplate(DEFAULT_TEMPLATES['study_out'], {
    '기관명': orgName,
    '학생명': studentName,
    '시간': time,
  });
}

export function createStudyReturnMessage(orgName: string, studentName: string, time: string): string {
  return fillTemplate(DEFAULT_TEMPLATES['study_return'], {
    '기관명': orgName,
    '학생명': studentName,
    '시간': time,
  });
}
