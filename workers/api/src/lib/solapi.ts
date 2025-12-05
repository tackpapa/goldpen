/**
 * Solapi 알림톡 API 클라이언트
 *
 * API 문서: https://developers.solapi.com/
 * - 인증: HMAC-SHA256 서명
 * - 메시지 발송: POST https://api.solapi.com/messages/v4/send
 *
 * 이전 PPURIO를 대체하여 Solapi 사용
 */

import type { Env } from "../env";

// ============================================================
// 상수 정의
// ============================================================

const SOLAPI_BASE_URL = "https://api.solapi.com";

// 알림 타입 (시스템 내부)
export type NotificationType =
  | "late"          // 지각 알림
  | "absent"        // 결석 알림
  | "checkin"       // 등원 알림
  | "checkout"      // 하원 알림
  | "study_out"     // 외출 알림
  | "study_return"  // 복귀 알림
  | "study_report"  // 학습 알림 (레거시)
  | "daily_report"  // 당일 학습 진행 결과 (Cron 자동 발송)
  | "lesson_report" // 수업일지 알림 (강사 수동 발송)
  | "exam_result"   // 시험관리 알림
  | "assignment";   // 과제관리 알림

// ============================================================
// 템플릿 설정 (Solapi 대시보드에서 등록 후 templateId 입력 필요)
// ============================================================

interface TemplateConfig {
  templateId: string;  // Solapi 템플릿 ID
  variables: string[]; // 템플릿에서 사용하는 변수 목록
}

/**
 * 알림 타입별 Solapi 템플릿 설정
 * - 템플릿 변수는 #{변수명} 형태로 정의되어 있음
 * - Solapi 대시보드에서 등록/승인된 템플릿 ID (2024-12-04 승인)
 */
export const SOLAPI_TEMPLATES: Record<NotificationType, TemplateConfig> = {
  // 지각 알림: 기관명, 학생명, 시간
  late: {
    templateId: "KA01TP251204073512160e3wLOmjadHo",
    variables: ["기관명", "학생명", "시간"],
  },
  // 결석 알림: 기관명, 학생명
  absent: {
    templateId: "KA01TP251204073716590X9PIO4lqHJO",
    variables: ["기관명", "학생명"],
  },
  // 등원 알림: 기관명, 학생명, 시간
  checkin: {
    templateId: "KA01TP2512040736374033MaMtCvbrOU",
    variables: ["기관명", "학생명", "시간"],
  },
  // 하원 알림: 기관명, 학생명, 시간
  checkout: {
    templateId: "KA01TP251204073555285nNM7Zije4g6",
    variables: ["기관명", "학생명", "시간"],
  },
  // 외출 알림: 기관명, 학생명, 시간
  study_out: {
    templateId: "KA01TP251204073126106rpWtFqsElst",
    variables: ["기관명", "학생명", "시간"],
  },
  // 복귀 알림: 기관명, 학생명, 시간
  study_return: {
    templateId: "KA01TP251204073216240Al5TN6oZpK1",
    variables: ["기관명", "학생명", "시간"],
  },
  // 학습 알림: 기관명, 학생명, 날짜, 총학습시간, 완료과목 (레거시 - daily_report와 동일)
  study_report: {
    templateId: "KA01TP251204073400351Ji007ORdhMl",
    variables: ["기관명", "학생명", "날짜", "총학습시간", "완료과목"],
  },
  // 당일 학습 진행 결과: 기관명, 학생명, 날짜, 총학습시간, 완료과목 (Cron 자동 발송)
  daily_report: {
    templateId: "KA01TP251204073400351Ji007ORdhMl",
    variables: ["기관명", "학생명", "날짜", "총학습시간", "완료과목"],
  },
  // 수업일지 알림: 기관명, 학생명, 오늘수업, 학습포인트, 선생님코멘트, 원장님코멘트, 숙제, 복습팁 (강사 수동 발송)
  lesson_report: {
    templateId: "KA01TP251204072710607rwTlsMrEZev",
    variables: ["기관명", "학생명", "오늘수업", "학습포인트", "선생님코멘트", "원장님코멘트", "숙제", "복습팁"],
  },
  // 시험관리 알림: 기관명, 학생명, 시험명, 점수
  exam_result: {
    templateId: "KA01TP251204073020148HJTQIvTPKBy",
    variables: ["기관명", "학생명", "시험명", "점수"],
  },
  // 과제관리 알림: 기관명, 학생명, 과제, 마감일
  assignment: {
    templateId: "KA01TP251204072838441p4prMiI6EES",
    variables: ["기관명", "학생명", "과제", "마감일"],
  },
};

// ============================================================
// HMAC-SHA256 인증
// ============================================================

/**
 * Solapi HMAC-SHA256 인증 헤더 생성
 */
async function createAuthHeader(apiKey: string, apiSecret: string): Promise<string> {
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

// ============================================================
// 알림톡 발송
// ============================================================

export interface SendAlimtalkParams {
  type: NotificationType;
  phone: string;
  recipientName?: string;
  variables: Record<string, string>; // { '기관명': '골든펜', '학생명': '김철수', ... }
  refKey?: string; // 고유 식별키 (중복 방지)
}

export interface SendAlimtalkResult {
  success: boolean;
  messageId?: string;
  groupId?: string;
  error?: string;
}

/**
 * Solapi 알림톡 발송
 *
 * @param env - 환경 변수
 * @param params - 발송 파라미터
 * @returns 발송 결과
 *
 * @example
 * ```ts
 * const result = await sendSolapiAlimtalk(env, {
 *   type: "checkin",
 *   phone: "01012345678",
 *   recipientName: "김철수 학부모",
 *   variables: {
 *     "기관명": "골든펜 학원",
 *     "학생명": "김철수",
 *     "시간": "14:30",
 *   },
 * });
 * ```
 */
export async function sendSolapiAlimtalk(
  env: Env,
  params: SendAlimtalkParams
): Promise<SendAlimtalkResult> {
  const { type, phone, recipientName, variables } = params;

  // 환경 변수 확인
  const apiKey = env.SOLAPI_API_KEY;
  const apiSecret = env.SOLAPI_API_SECRET;
  const pfId = env.SOLAPI_PF_ID;
  const senderPhone = env.SOLAPI_SENDER_PHONE;

  if (!apiKey || !apiSecret || !pfId) {
    console.log(`[Solapi] Dev mode - Would send ${type} to ${phone}`);
    return {
      success: true,
      messageId: `mock_${Date.now()}`,
    };
  }

  // 템플릿 설정 가져오기
  const templateConfig = SOLAPI_TEMPLATES[type];
  if (!templateConfig) {
    return {
      success: false,
      error: `알 수 없는 알림 타입: ${type}`,
    };
  }

  // 템플릿 ID가 없으면 스킵
  if (!templateConfig.templateId) {
    console.log(`[Solapi] Template not configured for ${type}`);
    return {
      success: false,
      error: `템플릿 미설정: ${type}`,
    };
  }

  // 전화번호 정규화 (하이픈 제거)
  const normalizedPhone = phone.replace(/[^0-9]/g, "");

  // Solapi 변수 형식: #{변수명} → 값
  const kakaoVariables: Record<string, string> = {};
  templateConfig.variables.forEach((varName) => {
    kakaoVariables[`#{${varName}}`] = variables[varName] || "";
  });

  // 요청 바디 구성
  const requestBody = {
    message: {
      to: normalizedPhone,
      from: senderPhone || "",
      kakaoOptions: {
        pfId,
        templateId: templateConfig.templateId,
        variables: kakaoVariables,
        disableSms: false, // 실패 시 SMS 대체발송
      },
    },
  };

  // 상세 로그 출력 (디버깅용)
  console.log(`[Solapi] ========== 알림톡 발송 준비 ==========`);
  console.log(`[Solapi] 타입: ${type}`);
  console.log(`[Solapi] 수신자: ${normalizedPhone}`);
  console.log(`[Solapi] 템플릿 ID: ${templateConfig.templateId}`);
  console.log(`[Solapi] 입력 변수:`, JSON.stringify(variables, null, 2));
  console.log(`[Solapi] Solapi 변수:`, JSON.stringify(kakaoVariables, null, 2));
  console.log(`[Solapi] 전체 요청:`, JSON.stringify(requestBody, null, 2));
  console.log(`[Solapi] =========================================`);

  // DRY_RUN 모드: API 호출 없이 로그만 출력 (테스트용)
  // 템플릿 승인 완료 - 실제 발송 활성화
  const DRY_RUN = false;
  if (DRY_RUN) {
    console.log(`[Solapi] DRY_RUN 모드 - API 호출 건너뜀`);
    return {
      success: true,
      messageId: `dry_run_${Date.now()}`,
    };
  }

  try {
    const authHeader = await createAuthHeader(apiKey, apiSecret);

    console.log(`[Solapi] Sending ${type} to ${normalizedPhone}:`, {
      templateId: templateConfig.templateId,
      variables: kakaoVariables,
    });

    const response = await fetch(`${SOLAPI_BASE_URL}/messages/v4/send`, {
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

    if (!response.ok || result.errorCode) {
      console.error("[Solapi] Send failed:", result);
      return {
        success: false,
        error: result.errorMessage || result.statusMessage || `API 오류`,
      };
    }

    console.log(`[Solapi] Sent successfully:`, {
      groupId: result.groupId,
      messageId: result.messageId,
    });

    return {
      success: true,
      messageId: result.messageId,
      groupId: result.groupId,
    };
  } catch (error) {
    console.error("[Solapi] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================
// 템플릿 ID 업데이트 함수
// ============================================================

/**
 * 단일 템플릿 ID 업데이트
 */
export function updateTemplateId(type: NotificationType, templateId: string): void {
  if (SOLAPI_TEMPLATES[type]) {
    SOLAPI_TEMPLATES[type].templateId = templateId;
    console.log(`[Solapi] Template updated: ${type} → ${templateId}`);
  }
}

/**
 * 모든 템플릿 ID 일괄 업데이트
 */
export function updateAllTemplateIds(templateIds: Partial<Record<NotificationType, string>>): void {
  for (const [type, templateId] of Object.entries(templateIds)) {
    if (templateId && SOLAPI_TEMPLATES[type as NotificationType]) {
      SOLAPI_TEMPLATES[type as NotificationType].templateId = templateId;
    }
  }
  console.log(`[Solapi] Templates updated:`, templateIds);
}

// ============================================================
// 헬퍼 함수
// ============================================================

/**
 * 알림 타입에 해당하는 템플릿 변수 목록 반환
 */
export function getTemplateVariables(type: NotificationType): string[] {
  return SOLAPI_TEMPLATES[type]?.variables || [];
}

/**
 * 템플릿 ID 반환
 */
export function getTemplateId(type: NotificationType): string {
  return SOLAPI_TEMPLATES[type]?.templateId || "";
}

/**
 * 모든 템플릿 정보 반환 (디버깅용)
 */
export function getAllTemplates(): Record<NotificationType, TemplateConfig> {
  return { ...SOLAPI_TEMPLATES };
}

// ============================================================
// Legacy PPURIO 호환 (deprecated)
// ============================================================

// PPURIO 함수와의 호환성을 위해 동일한 인터페이스 export
export const sendPpurioAlimtalk = sendSolapiAlimtalk;
