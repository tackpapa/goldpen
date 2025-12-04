/**
 * PPURIO (뿌리오) 알림톡 API 클라이언트
 *
 * API 문서: https://message.ppurio.com
 * - 토큰 발급: POST /v1/token (Basic Auth)
 * - 카카오 알림톡: POST /v1/kakao
 *
 * 토큰 유효기간: 1일 (24시간)
 */

import type { Env } from "../env";

// ============================================================
// 상수 정의
// ============================================================

const PPURIO_BASE_URL = "https://message.ppurio.com";
const TOKEN_EXPIRY_BUFFER = 60 * 60 * 1000; // 1시간 버퍼 (만료 1시간 전에 갱신)

// 알림톡 메시지 타입
export type PpurioMessageType =
  | "ALT"  // 알림톡 only (발송 실패 시 대체 발송 없음)
  | "ALL"  // 알림톡 + LMS (실패 시 LMS로 대체)
  | "ALH"  // 알림톡 + 이미지 강조형
  | "ALI"; // 알림톡 + 아이템리스트형

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
// 템플릿 코드 매핑 (뿌리오 심사 완료 후 사용)
// ============================================================

interface TemplateConfig {
  code: string;
  variables: string[]; // 템플릿에서 사용하는 변수 목록 (순서대로 var1, var2, ...)
}

/**
 * 알림 타입별 뿌리오 템플릿 코드 매핑
 * - 템플릿 변수는 {{변수명}} 형태로 정의되어 있음
 * - API 호출 시 changeWord.var1, var2, ... 순서로 치환
 */
export const PPURIO_TEMPLATES: Record<NotificationType, TemplateConfig> = {
  // 지각 알림: 기관명, 학생명, 예정시간
  late: {
    code: "ppur_2025120317492211178028222",
    variables: ["기관명", "학생명", "예정시간"],
  },
  // 결석 알림: 기관명, 학생명
  absent: {
    code: "ppur_2025120317514650432881225",
    variables: ["기관명", "학생명"],
  },
  // 등원 알림: 기관명, 학생명, 시간
  checkin: {
    code: "ppur_2025120317530550432576395",
    variables: ["기관명", "학생명", "시간"],
  },
  // 하원 알림: 기관명, 학생명, 시간
  checkout: {
    code: "ppur_2025120317542511178662081",
    variables: ["기관명", "학생명", "시간"],
  },
  // 외출 알림: 기관명, 학생명, 시간
  study_out: {
    code: "ppur_2025120317562150432207191",
    variables: ["기관명", "학생명", "시간"],
  },
  // 복귀 알림: 기관명, 학생명, 시간
  study_return: {
    code: "ppur_2025120317575350432614027",
    variables: ["기관명", "학생명", "시간"],
  },
  // 학습 알림: 기관명, 학생명, 날짜, 총학습시간, 완료과목 (레거시)
  study_report: {
    code: "ppur_2025120318000211178759229",
    variables: ["기관명", "학생명", "날짜", "총학습시간", "완료과목"],
  },
  // 당일 학습 진행 결과: 기관명, 학생명, 날짜, 총학습시간, 완료과목 (Cron 자동 발송)
  daily_report: {
    code: "ppur_2025120318000211178759229", // study_report와 동일 템플릿 사용
    variables: ["기관명", "학생명", "날짜", "총학습시간", "완료과목"],
  },
  // 수업일지 알림: 기관명, 학생명, 오늘수업, 학습포인트, 선생님, 원장님, 숙제, 복습팁 (강사 수동 발송)
  lesson_report: {
    code: "ppur_2025120319015350432662810",
    variables: ["기관명", "학생명", "오늘수업", "학습포인트", "선생님", "원장님", "숙제", "복습팁"],
  },
  // 시험관리 알림: 기관명, 학생명, 시험명, 점수
  exam_result: {
    code: "ppur_2025120318045611178336963",
    variables: ["기관명", "학생명", "시험명", "점수"],
  },
  // 과제관리 알림: 기관명, 학생명, 과제명, 마감일
  assignment: {
    code: "ppur_2025120318064650432195611",
    variables: ["기관명", "학생명", "과제명", "마감일"],
  },
};

// ============================================================
// 토큰 관리
// ============================================================

interface TokenCache {
  token: string;
  expiresAt: number; // Unix timestamp (ms)
}

// 메모리 캐시 (Workers는 stateless이므로 요청마다 새로 발급될 수 있음)
// 프로덕션에서는 KV 또는 D1에 저장 권장
let tokenCache: TokenCache | null = null;

interface TokenResponse {
  token: string;
  type: string;
  expired: string; // ISO date string
}

/**
 * PPURIO API 토큰 발급
 * - Basic Auth: base64(account:authKey)
 * - 토큰 유효기간: 1일
 */
async function fetchToken(env: Env): Promise<string> {
  const account = env.PPURIO_ACCOUNT;
  const authKey = env.PPURIO_AUTH_KEY;

  if (!account || !authKey) {
    throw new Error("PPURIO_ACCOUNT 또는 PPURIO_AUTH_KEY가 설정되지 않았습니다");
  }

  // Basic Auth 헤더 생성
  const credentials = btoa(`${account}:${authKey}`);

  const response = await fetch(`${PPURIO_BASE_URL}/v1/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[PPURIO] Token fetch failed:", response.status, errorText);
    throw new Error(`토큰 발급 실패: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as TokenResponse;

  // 캐시에 저장
  const expiresAt = new Date(data.expired).getTime() - TOKEN_EXPIRY_BUFFER;
  tokenCache = {
    token: data.token,
    expiresAt,
  };

  console.log(`[PPURIO] Token fetched, expires at: ${data.expired}`);
  return data.token;
}

/**
 * 유효한 토큰 가져오기 (캐시 또는 새로 발급)
 */
async function getToken(env: Env): Promise<string> {
  // 캐시된 토큰이 유효하면 반환
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  // 새 토큰 발급
  return fetchToken(env);
}

// ============================================================
// 알림톡 발송
// ============================================================

interface PpurioTarget {
  to: string;          // 수신번호 (01012345678)
  name?: string;       // 수신자명
  changeWord?: {       // 템플릿 변수 치환
    var1?: string;
    var2?: string;
    var3?: string;
    var4?: string;
    var5?: string;
    var6?: string;
    var7?: string;
    var8?: string;
  };
}

interface PpurioKakaoRequest {
  account: string;
  messageType: PpurioMessageType;
  senderProfile: string;
  templateCode: string;
  duplicateFlag: "N" | "Y";
  isResend?: "Y" | "N";
  resendType?: "SMS" | "LMS";
  targetCount: number;
  targets: PpurioTarget[];
  refKey?: string;
}

interface PpurioKakaoResponse {
  code: string;
  description: string;
  refKey?: string;
  messageKey?: string;
}

export interface SendAlimtalkParams {
  type: NotificationType;
  phone: string;
  recipientName?: string;
  variables: Record<string, string>; // { '기관명': '골든펜', '학생명': '김철수', ... }
  refKey?: string; // 고유 식별키 (중복 방지)
}

export interface SendAlimtalkResult {
  success: boolean;
  messageKey?: string;
  refKey?: string;
  error?: string;
}

/**
 * 뿌리오 알림톡 발송
 *
 * @param env - 환경 변수
 * @param params - 발송 파라미터
 * @returns 발송 결과
 *
 * @example
 * ```ts
 * const result = await sendPpurioAlimtalk(env, {
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
export async function sendPpurioAlimtalk(
  env: Env,
  params: SendAlimtalkParams
): Promise<SendAlimtalkResult> {
  const { type, phone, recipientName, variables, refKey } = params;

  // 환경 변수 확인
  const account = env.PPURIO_ACCOUNT;
  const senderProfile = env.PPURIO_SENDER_PROFILE;

  if (!account || !senderProfile) {
    console.log(`[PPURIO] Dev mode - Would send ${type} to ${phone}`);
    return {
      success: true,
      messageKey: `mock_${Date.now()}`,
      refKey: refKey || `ref_${Date.now()}`,
    };
  }

  // 템플릿 설정 가져오기
  const templateConfig = PPURIO_TEMPLATES[type];
  if (!templateConfig) {
    return {
      success: false,
      error: `알 수 없는 알림 타입: ${type}`,
    };
  }

  // 변수 치환 객체 생성 (var1, var2, ... 순서로)
  const changeWord: PpurioTarget["changeWord"] = {};
  templateConfig.variables.forEach((varName, index) => {
    const key = `var${index + 1}` as keyof typeof changeWord;
    changeWord[key] = variables[varName] || "";
  });

  // 전화번호 정규화 (하이픈 제거)
  const normalizedPhone = phone.replace(/[^0-9]/g, "");

  try {
    const token = await getToken(env);

    const requestBody: PpurioKakaoRequest = {
      account,
      messageType: "ALT", // 알림톡 only (실패 시 대체 발송 없음)
      senderProfile,
      templateCode: templateConfig.code,
      duplicateFlag: "N", // 중복 허용 안 함
      targetCount: 1,
      targets: [
        {
          to: normalizedPhone,
          name: recipientName,
          changeWord,
        },
      ],
      refKey: refKey || `${type}_${normalizedPhone}_${Date.now()}`,
    };

    console.log(`[PPURIO] Sending ${type} to ${normalizedPhone}:`, {
      templateCode: templateConfig.code,
      variables: changeWord,
    });

    const response = await fetch(`${PPURIO_BASE_URL}/v1/kakao`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const result = (await response.json()) as PpurioKakaoResponse;

    if (!response.ok || result.code !== "1000") {
      console.error("[PPURIO] Send failed:", result);
      return {
        success: false,
        error: result.description || `API 오류: ${result.code}`,
        refKey: result.refKey,
      };
    }

    console.log(`[PPURIO] Sent successfully:`, {
      messageKey: result.messageKey,
      refKey: result.refKey,
    });

    return {
      success: true,
      messageKey: result.messageKey,
      refKey: result.refKey,
    };
  } catch (error) {
    console.error("[PPURIO] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================
// 헬퍼 함수
// ============================================================

/**
 * 알림 타입에 해당하는 템플릿 변수 목록 반환
 */
export function getTemplateVariables(type: NotificationType): string[] {
  return PPURIO_TEMPLATES[type]?.variables || [];
}

/**
 * 템플릿 코드 반환
 */
export function getTemplateCode(type: NotificationType): string {
  return PPURIO_TEMPLATES[type]?.code || "";
}

/**
 * 모든 템플릿 정보 반환 (디버깅용)
 */
export function getAllTemplates(): Record<NotificationType, TemplateConfig> {
  return { ...PPURIO_TEMPLATES };
}
