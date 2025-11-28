/**
 * ============================================================
 * 카카오 알림톡 (Alimtalk) API 유틸리티
 * ============================================================
 *
 * 이 파일은 카카오 알림톡 발송을 위한 공통 유틸리티입니다.
 * Cloudflare Workers 크론, Next.js API Route 등에서 사용 가능합니다.
 *
 * ============================================================
 * 사용 방법
 * ============================================================
 *
 * 1. 환경 변수 설정 (필수):
 *    - KAKAO_ALIMTALK_API_KEY: Solapi/NHN/Bizm 등 제공업체 API 키
 *    - KAKAO_ALIMTALK_SECRET_KEY: 시크릿 키 (제공업체에 따라 다름)
 *    - KAKAO_ALIMTALK_SENDER_KEY: 발신 프로필 키 (카카오 비즈 메시지)
 *    - KAKAO_ALIMTALK_TEMPLATE_CODE: 템플릿 코드 (검수 승인된 템플릿)
 *
 * 2. 사용 예시:
 *    import { sendAlimtalk, AlimtalkType, ALIMTALK_TEMPLATES } from '@/lib/messaging/kakao-alimtalk'
 *
 *    await sendAlimtalk({
 *      type: 'ATTENDANCE_LATE',
 *      phone: '01012345678',
 *      variables: {
 *        studentName: '홍길동',
 *        scheduledTime: '09:00',
 *        currentTime: '09:15',
 *      },
 *    })
 *
 * ============================================================
 * 알림톡 제공업체 (택 1)
 * ============================================================
 *
 * 1. Solapi (솔라피) - 추천
 *    - https://solapi.com
 *    - 단가: 약 8원/건
 *    - 특징: 개발 문서 우수, Node.js SDK 제공
 *
 * 2. NHN Cloud (Toast)
 *    - https://www.nhncloud.com/service/notification/alimtalk
 *    - 단가: 약 7.5원/건
 *    - 특징: 대량 발송에 유리
 *
 * 3. Bizm (비즈엠)
 *    - https://www.bizmsg.kr
 *    - 단가: 약 7원/건
 *    - 특징: 최저가, 대형 고객 다수
 *
 * ============================================================
 * 템플릿 승인 과정
 * ============================================================
 *
 * 1. 카카오 비즈니스 채널 개설
 * 2. 알림톡 발신 프로필 등록
 * 3. 템플릿 작성 및 승인 요청 (검수 1~3일 소요)
 * 4. 승인 완료 후 템플릿 코드로 발송
 *
 * ============================================================
 */

// ============================================================
// 타입 정의
// ============================================================

/**
 * 알림톡 타입 (출결 관련)
 */
export type AlimtalkType =
  | 'ATTENDANCE_LATE'       // 독서실/강의 지각 알림
  | 'ATTENDANCE_ABSENT'     // 독서실/강의 결석 알림
  | 'ATTENDANCE_CHECKIN'    // 등원 완료 알림
  | 'ATTENDANCE_CHECKOUT'   // 하원 완료 알림
  | 'LESSON_REMINDER'       // 수업 시작 알림
  | 'HOMEWORK_REMINDER'     // 숙제 알림
  | 'EXAM_RESULT'           // 시험 결과 알림
  | 'PAYMENT_REMINDER'      // 수납 안내 알림
  | 'GENERAL'               // 일반 알림

/**
 * 알림톡 발송 파라미터
 */
export interface AlimtalkParams {
  type: AlimtalkType
  phone: string           // 수신자 전화번호 (하이픈 없이)
  variables: Record<string, string>  // 템플릿 변수
  orgId?: string          // 기관 ID (로깅용)
  studentId?: string      // 학생 ID (로깅용)
  studentName?: string    // 학생 이름 (로깅용)
}

/**
 * 알림톡 발송 결과
 */
export interface AlimtalkResult {
  success: boolean
  messageId?: string
  error?: string
  cost?: number  // 발송 비용 (원)
}

/**
 * 알림톡 설정 (제공업체별)
 */
export interface AlimtalkConfig {
  provider: 'solapi' | 'nhn' | 'bizm'
  apiKey: string
  secretKey?: string
  senderKey: string  // 카카오 발신 프로필 키
}

// ============================================================
// 템플릿 정의
// ============================================================

/**
 * 카카오 알림톡 템플릿
 *
 * ⚠️ 중요: 카카오 알림톡 vs 설정 페이지 템플릿
 *
 * 1. 카카오 알림톡 템플릿 (이 파일 - ALIMTALK_TEMPLATES):
 *    - 카카오 비즈메시지 검수 승인 필요
 *    - #{변수명} 형식 사용 (카카오 표준)
 *    - 템플릿 코드 필수 (예: GOLDPEN_LATE_001)
 *    - 변경 시 재검수 필요 (1~3일 소요)
 *
 * 2. 설정 페이지 템플릿 (organization.settings.messageTemplatesParent):
 *    - {{변수명}} 형식 사용 (GoldPen 표준)
 *    - 관리자가 자유롭게 수정 가능
 *    - UI 미리보기 및 일반 SMS/푸시 알림용
 *    - 카카오 알림톡으로 발송 시에는 아래 승인 템플릿 사용
 *
 * 💡 사용 패턴:
 * - 카카오 알림톡 발송: ALIMTALK_TEMPLATES 사용 (승인 필수)
 * - UI 미리보기: 설정 페이지 템플릿 사용
 * - SMS 발송: 설정 페이지 템플릿 사용
 *
 * 주의: 실제 사용 전 카카오 검수 승인 필요!
 * 아래는 예시 템플릿입니다.
 */
export const ALIMTALK_TEMPLATES: Record<AlimtalkType, {
  code: string        // 승인된 템플릿 코드 (제공업체에서 발급)
  title: string       // 템플릿 제목
  content: string     // 템플릿 내용 (변수는 #{변수명} 형식)
  buttons?: Array<{   // 버튼 (선택)
    type: 'WL' | 'AL' | 'BK' | 'MD'  // 웹링크/앱링크/봇키워드/메시지전달
    name: string
    linkMobile?: string
    linkPc?: string
  }>
}> = {
  ATTENDANCE_LATE: {
    code: 'GOLDPEN_LATE_001',  // 실제 승인 후 교체 필요
    title: '지각 알림',
    content: `[골드펜] 지각 알림

안녕하세요, #{parentName}님.

#{studentName} 학생이 아직 등원하지 않았습니다.

예정 시간: #{scheduledTime}
현재 시간: #{currentTime}

문의: #{institutionPhone}`,
  },

  ATTENDANCE_ABSENT: {
    code: 'GOLDPEN_ABSENT_001',
    title: '결석 알림',
    content: `[골드펜] 결석 알림

안녕하세요, #{parentName}님.

#{studentName} 학생이 오늘 결석 처리되었습니다.

예정 시간: #{scheduledTime}
사유 확인이 필요하시면 연락 부탁드립니다.

문의: #{institutionPhone}`,
  },

  ATTENDANCE_CHECKIN: {
    code: 'GOLDPEN_CHECKIN_001',
    title: '등원 알림',
    content: `[골드펜] 등원 알림

#{studentName} 학생이 등원했습니다.

등원 시간: #{checkInTime}

오늘도 열심히 공부하겠습니다!`,
  },

  ATTENDANCE_CHECKOUT: {
    code: 'GOLDPEN_CHECKOUT_001',
    title: '하원 알림',
    content: `[골드펜] 하원 알림

#{studentName} 학생이 하원했습니다.

하원 시간: #{checkOutTime}
총 학습 시간: #{duration}

오늘도 수고하셨습니다!`,
  },

  LESSON_REMINDER: {
    code: 'GOLDPEN_LESSON_001',
    title: '수업 시작 알림',
    content: `[골드펜] 수업 시작 알림

#{studentName} 학생의 #{className} 수업이 곧 시작됩니다.

시작 시간: #{startTime}
강사: #{teacherName}

준비물을 챙겨주세요!`,
  },

  HOMEWORK_REMINDER: {
    code: 'GOLDPEN_HOMEWORK_001',
    title: '숙제 알림',
    content: `[골드펜] 숙제 알림

#{studentName} 학생에게 새로운 숙제가 있습니다.

과목: #{subject}
마감일: #{dueDate}

잊지 말고 제출해주세요!`,
  },

  EXAM_RESULT: {
    code: 'GOLDPEN_EXAM_001',
    title: '시험 결과 알림',
    content: `[골드펜] 시험 결과 안내

#{studentName} 학생의 시험 결과입니다.

시험명: #{examName}
점수: #{score}점

자세한 내용은 학원에 문의해주세요.`,
  },

  PAYMENT_REMINDER: {
    code: 'GOLDPEN_PAYMENT_001',
    title: '수납 안내',
    content: `[골드펜] 수납 안내

안녕하세요, #{parentName}님.

#{studentName} 학생의 #{month}월 수강료 안내드립니다.

금액: #{amount}원
납부 기한: #{dueDate}

감사합니다.`,
  },

  GENERAL: {
    code: 'GOLDPEN_GENERAL_001',
    title: '일반 알림',
    content: `[골드펜] 알림

#{message}`,
  },
}

// ============================================================
// 헬퍼 함수
// ============================================================

/**
 * 전화번호 정규화 (하이픈 제거)
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

/**
 * 카카오 템플릿에 변수 치환 (#{변수명} 형식)
 */
export function fillTemplate(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`#\\{${key}\\}`, 'g'), value)
  }
  return result
}

/**
 * 설정 페이지 템플릿에 변수 치환 ({{변수명}} 형식)
 * SMS, 푸시 알림 등 비-카카오 채널에서 사용
 */
export function fillSettingsTemplate(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '')
  }
  return result
}

/**
 * AlimtalkType을 설정 페이지 템플릿 키로 매핑
 */
export function mapAlimtalkTypeToSettingsKey(type: AlimtalkType): string {
  const mapping: Record<AlimtalkType, string> = {
    'ATTENDANCE_LATE': 'academy_late',        // 또는 study_late (기관 타입에 따라)
    'ATTENDANCE_ABSENT': 'academy_absent',
    'ATTENDANCE_CHECKIN': 'academy_checkin',  // 또는 study_checkin
    'ATTENDANCE_CHECKOUT': 'academy_checkout', // 또는 study_checkout
    'LESSON_REMINDER': 'lesson_report',
    'HOMEWORK_REMINDER': 'assignment_remind',
    'EXAM_RESULT': 'exam_result',
    'PAYMENT_REMINDER': 'payment_remind',
    'GENERAL': 'general',
  }
  return mapping[type] || 'general'
}

// ============================================================
// 알림톡 발송 함수
// ============================================================

/**
 * 알림톡 발송 (메인 함수)
 *
 * @example
 * const result = await sendAlimtalk({
 *   type: 'ATTENDANCE_LATE',
 *   phone: '01012345678',
 *   variables: {
 *     parentName: '김학부모',
 *     studentName: '김학생',
 *     scheduledTime: '09:00',
 *     currentTime: '09:15',
 *     institutionPhone: '02-1234-5678',
 *   },
 * })
 */
export async function sendAlimtalk(
  params: AlimtalkParams,
  config?: AlimtalkConfig
): Promise<AlimtalkResult> {
  const { type, phone, variables } = params
  const template = ALIMTALK_TEMPLATES[type]

  if (!template) {
    return { success: false, error: `Unknown template type: ${type}` }
  }

  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone || normalizedPhone.length < 10) {
    return { success: false, error: 'Invalid phone number' }
  }

  const message = fillTemplate(template.content, variables)

  // 설정이 없으면 환경 변수에서 읽기
  const finalConfig = config || getConfigFromEnv()

  if (!finalConfig) {
    console.warn('[Alimtalk] No config provided, message logged only:', { type, phone: normalizedPhone, message })
    return {
      success: true,
      messageId: `mock_${Date.now()}`,
      cost: 0,
    }
  }

  // 제공업체별 발송
  switch (finalConfig.provider) {
    case 'solapi':
      return sendViaSolapi(normalizedPhone, message, template.code, finalConfig)
    case 'nhn':
      return sendViaNhn(normalizedPhone, message, template.code, finalConfig)
    case 'bizm':
      return sendViaBizm(normalizedPhone, message, template.code, finalConfig)
    default:
      return { success: false, error: 'Unknown provider' }
  }
}

/**
 * 환경 변수에서 설정 읽기
 */
function getConfigFromEnv(): AlimtalkConfig | null {
  const provider = (process.env.KAKAO_ALIMTALK_PROVIDER || 'solapi') as AlimtalkConfig['provider']
  const apiKey = process.env.KAKAO_ALIMTALK_API_KEY
  const secretKey = process.env.KAKAO_ALIMTALK_SECRET_KEY
  const senderKey = process.env.KAKAO_ALIMTALK_SENDER_KEY

  if (!apiKey || !senderKey) {
    return null
  }

  return { provider, apiKey, secretKey, senderKey }
}

// ============================================================
// 제공업체별 발송 구현
// ============================================================

/**
 * Solapi (솔라피) 발송
 * https://docs.solapi.com/api-reference/kakao/alimtalk
 */
async function sendViaSolapi(
  phone: string,
  message: string,
  templateCode: string,
  config: AlimtalkConfig
): Promise<AlimtalkResult> {
  try {
    // Solapi API 인증
    const timestamp = Date.now().toString()
    const signature = await generateSolapiSignature(config.apiKey, config.secretKey || '', timestamp)

    const response = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `HMAC-SHA256 apiKey=${config.apiKey}, date=${timestamp}, salt=${timestamp}, signature=${signature}`,
      },
      body: JSON.stringify({
        message: {
          to: phone,
          from: config.senderKey,  // 발신번호 (알림톡은 발신 프로필로 대체됨)
          kakaoOptions: {
            pfId: config.senderKey,  // 발신 프로필 ID
            templateId: templateCode,
            // 버튼이 있으면 추가
            // buttons: [{ buttonType: 'WL', buttonName: '자세히 보기', linkMobile: 'https://...' }]
          },
          text: message,
        },
      }),
    })

    const result = await response.json() as { groupId?: string; errorMessage?: string }

    if (response.ok && result.groupId) {
      return {
        success: true,
        messageId: result.groupId,
        cost: 8,  // Solapi 알림톡 단가 (약 8원)
      }
    }

    return {
      success: false,
      error: result.errorMessage || 'Solapi API error',
    }
  } catch (error) {
    return {
      success: false,
      error: `Solapi error: ${error}`,
    }
  }
}

/**
 * Solapi HMAC-SHA256 서명 생성
 */
async function generateSolapiSignature(apiKey: string, secretKey: string, timestamp: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(timestamp + apiKey)
  const key = encoder.encode(secretKey)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data)
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

/**
 * NHN Cloud 발송
 * https://docs.nhncloud.com/ko/Notification/KakaoTalk%20Bizmessage/ko/alimtalk-api-guide/
 */
async function sendViaNhn(
  phone: string,
  message: string,
  templateCode: string,
  config: AlimtalkConfig
): Promise<AlimtalkResult> {
  try {
    // NHN Cloud API
    const appKey = config.apiKey
    const secretKey = config.secretKey || ''

    const response = await fetch(
      `https://api-alimtalk.cloud.toast.com/alimtalk/v2.3/appkeys/${appKey}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-Secret-Key': secretKey,
        },
        body: JSON.stringify({
          senderKey: config.senderKey,
          templateCode: templateCode,
          recipientList: [{
            recipientNo: phone,
            templateParameter: {}, // 템플릿 변수 (이미 message에 치환됨)
          }],
        }),
      }
    )

    const result = await response.json() as { header?: { isSuccessful?: boolean; resultMessage?: string }; message?: { requestId?: string } }

    if (response.ok && result.header?.isSuccessful) {
      return {
        success: true,
        messageId: result.message?.requestId,
        cost: 7.5,  // NHN 알림톡 단가 (약 7.5원)
      }
    }

    return {
      success: false,
      error: result.header?.resultMessage || 'NHN API error',
    }
  } catch (error) {
    return {
      success: false,
      error: `NHN error: ${error}`,
    }
  }
}

/**
 * Bizm (비즈엠) 발송
 * https://www.bizmsg.kr/api
 */
async function sendViaBizm(
  phone: string,
  message: string,
  templateCode: string,
  config: AlimtalkConfig
): Promise<AlimtalkResult> {
  try {
    const response = await fetch('https://alimtalk-api.bizmsg.kr/v2/sender/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'userid': config.apiKey,
      },
      body: JSON.stringify([{
        message_type: 'AT',  // 알림톡
        phn: phone,
        profile: config.senderKey,
        tmplId: templateCode,
        msg: message,
      }]),
    })

    const result = await response.json() as Array<{ code?: string; msgid?: string; message?: string }>

    if (response.ok && result[0]?.code === 'success') {
      return {
        success: true,
        messageId: result[0]?.msgid,
        cost: 7,  // Bizm 알림톡 단가 (약 7원)
      }
    }

    return {
      success: false,
      error: result[0]?.message || 'Bizm API error',
    }
  } catch (error) {
    return {
      success: false,
      error: `Bizm error: ${error}`,
    }
  }
}

// ============================================================
// 출결 알림 전용 래퍼 함수 (편의용)
// ============================================================

/**
 * 지각 알림 발송
 */
export async function sendLateNotification(params: {
  phone: string
  parentName: string
  studentName: string
  scheduledTime: string
  currentTime: string
  institutionPhone: string
  orgId?: string
  studentId?: string
}): Promise<AlimtalkResult> {
  return sendAlimtalk({
    type: 'ATTENDANCE_LATE',
    phone: params.phone,
    variables: {
      parentName: params.parentName,
      studentName: params.studentName,
      scheduledTime: params.scheduledTime,
      currentTime: params.currentTime,
      institutionPhone: params.institutionPhone,
    },
    orgId: params.orgId,
    studentId: params.studentId,
    studentName: params.studentName,
  })
}

/**
 * 결석 알림 발송
 */
export async function sendAbsentNotification(params: {
  phone: string
  parentName: string
  studentName: string
  scheduledTime: string
  institutionPhone: string
  orgId?: string
  studentId?: string
}): Promise<AlimtalkResult> {
  return sendAlimtalk({
    type: 'ATTENDANCE_ABSENT',
    phone: params.phone,
    variables: {
      parentName: params.parentName,
      studentName: params.studentName,
      scheduledTime: params.scheduledTime,
      institutionPhone: params.institutionPhone,
    },
    orgId: params.orgId,
    studentId: params.studentId,
    studentName: params.studentName,
  })
}

/**
 * 등원 알림 발송
 */
export async function sendCheckInNotification(params: {
  phone: string
  studentName: string
  checkInTime: string
  orgId?: string
  studentId?: string
}): Promise<AlimtalkResult> {
  return sendAlimtalk({
    type: 'ATTENDANCE_CHECKIN',
    phone: params.phone,
    variables: {
      studentName: params.studentName,
      checkInTime: params.checkInTime,
    },
    orgId: params.orgId,
    studentId: params.studentId,
    studentName: params.studentName,
  })
}

/**
 * 하원 알림 발송
 */
export async function sendCheckOutNotification(params: {
  phone: string
  studentName: string
  checkOutTime: string
  duration: string
  orgId?: string
  studentId?: string
}): Promise<AlimtalkResult> {
  return sendAlimtalk({
    type: 'ATTENDANCE_CHECKOUT',
    phone: params.phone,
    variables: {
      studentName: params.studentName,
      checkOutTime: params.checkOutTime,
      duration: params.duration,
    },
    orgId: params.orgId,
    studentId: params.studentId,
    studentName: params.studentName,
  })
}
