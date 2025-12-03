/**
 * 실시간 알림 발송 유틸리티
 * - API 이벤트 발생 시 호출
 * - 카카오 알림톡 발송
 *
 * [템플릿 사용 가이드]
 * 1. 조직 설정에서 messageTemplatesParent를 가져옵니다
 * 2. fillTemplate()으로 변수를 치환합니다
 * 3. 템플릿이 없으면 create*Message() 함수를 fallback으로 사용합니다
 */
import type { Env } from "../env";

// ============================================================
// 기본 메시지 템플릿 (설정에서 가져오지 못할 경우 fallback)
// 통합된 키: late, absent, checkin, checkout, study_out, study_return, ...
// ============================================================
export const DEFAULT_TEMPLATES: Record<string, string> = {
  // 출결 알림 (통합)
  'late': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 예정 시간({{예정시간}})에 아직 도착하지 않아 안내드립니다. 확인 부탁드립니다.',
  'absent': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 오늘 예정된 일정에 출석하지 않아 결석 처리되었습니다. 사유 확인이 필요하시면 연락 부탁드립니다.',
  'checkin': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 안전하게 도착했습니다. 오늘도 열심히 공부하겠습니다!',
  'checkout': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 일과를 마치고 귀가했습니다. 안전하게 귀가하길 바랍니다.',
  // 독서실 전용
  'study_out': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 잠시 외출합니다.',
  'study_return': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 복귀했습니다.',
  // 수업 리포트
  'lesson_report': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생의 {{수업명}} 수업 리포트입니다.\n\n📅 날짜: {{날짜}}\n📚 수업 내용: {{수업내용}}\n📝 숙제: {{숙제}}\n\n오늘도 수고했어요!',
  // 시험 결과
  'exam_result': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생의 시험 결과를 안내드립니다.\n\n{{시험명}}: {{점수}}점\n\n열심히 준비한 만큼 좋은 결과로 이어지길 바랍니다. 궁금하신 점은 편하게 연락 주세요!',
  // 과제 관련
  'assignment_new': '{{기관명}}입니다, 학부모님.\n\n새 과제가 등록되었습니다.\n\n📚 수업: {{수업명}}\n📝 과제: {{과제명}}\n📅 마감일: {{마감일}}\n\n과제 제출 잊지 마세요!',
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
  | "lesson_report"
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
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * 알림 발송 (DB 기록 + 카카오 알림톡)
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
    message,
    metadata,
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

    // 텔레그램으로 모니터링 알림 전송 (lesson_report는 태그 없이 깔끔하게)
    const typeEmoji = getTypeEmoji(type);
    const telegramMessage = type === "lesson_report"
      ? `${typeEmoji} ${studentName} 학생 수업일지\n\n${message}`
      : `${typeEmoji} [${type.toUpperCase()}] ${studentName}\n\n${message}`;
    await sendTelegram(env, telegramMessage);

    // 카카오 알림톡 발송
    if (recipientPhone) {
      const templateCode = getTemplateCode(type);
      await sendKakaoAlimtalk(env, recipientPhone, message, templateCode);
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
 * 알림 타입별 카카오 템플릿 코드 반환
 */
function getTemplateCode(type: NotificationType): string {
  const templates: Record<NotificationType, string> = {
    late: "GOLDPEN_LATE_001",
    absent: "GOLDPEN_ABSENT_001",
    checkin: "GOLDPEN_CHECKIN_001",
    checkout: "GOLDPEN_CHECKOUT_001",
    study_out: "GOLDPEN_STUDY_BREAK_001",
    study_return: "GOLDPEN_STUDY_RETURN_001",
    lesson_report: "GOLDPEN_LESSON_001",
    exam_result: "GOLDPEN_EXAM_001",
    assignment_new: "GOLDPEN_HOMEWORK_001",
  };
  return templates[type] || "GOLDPEN_DEFAULT_001";
}

/**
 * 카카오 알림톡 발송 (Solapi 기준)
 */
async function sendKakaoAlimtalk(
  env: Env,
  phone: string,
  message: string,
  templateCode: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // 환경 변수에서 카카오 설정 가져오기
  const apiKey = env.KAKAO_ALIMTALK_API_KEY;
  const secretKey = env.KAKAO_ALIMTALK_SECRET_KEY;
  const senderKey = env.KAKAO_ALIMTALK_SENDER_KEY;

  // 설정이 없으면 로그만 출력 (개발 모드)
  if (!apiKey || !senderKey) {
    console.log(`[Kakao] Dev mode - Would send to ${phone}: ${message.substring(0, 50)}...`);
    return { success: true, messageId: `mock_${Date.now()}` };
  }

  try {
    // Solapi API 사용
    const timestamp = Date.now().toString();
    const signature = await generateHmacSignature(apiKey, secretKey || "", timestamp);

    const response = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${timestamp}, salt=${timestamp}, signature=${signature}`,
      },
      body: JSON.stringify({
        message: {
          to: phone.replace(/[^0-9]/g, ""), // 하이픈 제거
          from: senderKey,
          kakaoOptions: {
            pfId: senderKey,
            templateId: templateCode,
          },
          text: message,
        },
      }),
    });

    const result = (await response.json()) as { groupId?: string; errorMessage?: string };

    if (response.ok && result.groupId) {
      console.log(`[Kakao] Sent successfully: ${result.groupId}`);
      return { success: true, messageId: result.groupId };
    }

    console.error(`[Kakao] API error:`, result);
    return { success: false, error: result.errorMessage || "Solapi API error" };
  } catch (error) {
    console.error(`[Kakao] Error:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * HMAC-SHA256 서명 생성 (Solapi 인증용)
 */
async function generateHmacSignature(
  apiKey: string,
  secretKey: string,
  timestamp: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(timestamp + apiKey);
  const key = encoder.encode(secretKey);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
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
 * 수업 리포트 메시지 생성
 * @deprecated 대신 getTemplateFromOrg()와 fillTemplate() 사용 권장
 */
export function createLessonReportMessage(
  orgName: string,
  studentName: string,
  className: string,
  date: string,
  content?: string,
  homework?: string
): string {
  return fillTemplate(DEFAULT_TEMPLATES['lesson_report'], {
    '기관명': orgName,
    '학생명': studentName,
    '수업명': className,
    '날짜': formatDateSimple(date),
    '수업내용': content || '-',
    '숙제': homework || '-',
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
 * 새 과제 알림 메시지 생성
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
    '과제명': homeworkTitle,
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
 * 알림 타입별 이모지 반환
 */
function getTypeEmoji(type: NotificationType): string {
  const emojis: Record<NotificationType, string> = {
    late: "⏰",
    absent: "❌",
    checkin: "✅",
    checkout: "👋",
    study_out: "🚶",
    study_return: "🔙",
    lesson_report: "📚",
    exam_result: "📊",
    assignment_new: "📝",
  };
  return emojis[type] || "📋";
}

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
