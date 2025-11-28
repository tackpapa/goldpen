import { createClient } from '@supabase/supabase-js'

// 활동 로그 타입
export type ActionType = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'view' | 'export'

export type EntityType =
  | 'student'
  | 'consultation'
  | 'class'
  | 'teacher'
  | 'exam'
  | 'attendance'
  | 'billing'
  | 'expense'
  | 'homework'
  | 'lesson'
  | 'seat'
  | 'room'
  | 'schedule'

interface LogActivityParams {
  orgId: string
  userId?: string | null
  userName: string
  userRole?: string | null
  actionType: ActionType
  entityType: EntityType
  entityId?: string | null
  entityName?: string | null
  description: string
  metadata?: Record<string, unknown>
  request?: Request
}

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// UUID 형식 검증 헬퍼
const isValidUUID = (str: string | null | undefined): boolean => {
  if (!str) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * 활동 로그를 기록하는 헬퍼 함수
 * - 실패해도 에러를 throw하지 않음 (graceful degradation)
 * - 비동기적으로 실행되어 API 응답 지연을 최소화
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const service = getServiceClient()
    if (!service) {
      console.warn('[ActivityLog] Service client not available, skipping log')
      return
    }

    let {
      orgId,
      userId,
      userName,
      userRole,
      actionType,
      entityType,
      entityId,
      entityName,
      description,
      metadata = {},
      request,
    } = params

    // 사용자 이름이 '시스템' 또는 서비스 계정인 경우 원장 이름으로 대체
    if (!userName || userName === '시스템' || userName === 'service-role' || userName === 'e2e-user') {
      const { data: ownerUser } = await service
        .from('users')
        .select('name, role')
        .eq('org_id', orgId)
        .eq('role', 'owner')
        .maybeSingle()
      userName = ownerUser?.name || '시스템'
      // userRole도 설정
      if (!userRole && ownerUser?.role) {
        userRole = ownerUser.role
      }
    }

    // IP 및 User-Agent 추출
    let ipAddress: string | null = null
    let userAgent: string | null = null

    if (request) {
      ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                  request.headers.get('x-real-ip') ||
                  null
      userAgent = request.headers.get('user-agent') || null
    }

    // UUID 검증 - 유효하지 않으면 null 처리
    const validUserId = isValidUUID(userId) ? userId : null
    const validEntityId = isValidUUID(entityId) ? entityId : null

    const { error } = await service
      .from('activity_logs')
      .insert({
        org_id: orgId,
        user_id: validUserId,
        user_name: userName,
        user_role: userRole,
        action_type: actionType,
        entity_type: entityType,
        entity_id: validEntityId,
        entity_name: entityName,
        description,
        metadata,
        ip_address: ipAddress,
        user_agent: userAgent,
      })

    if (error) {
      // 테이블이 없는 경우 무시 (graceful degradation)
      if (error.code === '42P01') {
        console.warn('[ActivityLog] Table not found, skipping')
        return
      }
      console.error('[ActivityLog] Error:', error.message)
    }
  } catch (error) {
    // 로그 실패가 API 응답에 영향을 주지 않도록 에러 무시
    console.error('[ActivityLog] Unexpected error:', error)
  }
}

/**
 * 사용자 정보와 함께 활동 로그 기록 (간편 버전)
 */
export async function logActivityWithContext(
  context: {
    orgId: string
    user: { id: string; email?: string } | null
    role: string | null
    userName?: string
  },
  action: {
    type: ActionType
    entityType: EntityType
    entityId?: string | null
    entityName?: string | null
    description: string
    metadata?: Record<string, unknown>
  },
  request?: Request
): Promise<void> {
  let userName = context.userName || context.user?.email?.split('@')[0] || ''

  // 사용자 이름이 없거나 시스템/서비스 계정인 경우 원장 이름 가져오기
  if (!userName || userName === '시스템' || userName === 'service-role' || userName === 'e2e-user') {
    const service = getServiceClient()
    if (service) {
      const { data: ownerUser } = await service
        .from('users')
        .select('name')
        .eq('org_id', context.orgId)
        .eq('role', 'owner')
        .maybeSingle()
      userName = ownerUser?.name || '시스템'
    } else {
      userName = '시스템'
    }
  }

  await logActivity({
    orgId: context.orgId,
    userId: context.user?.id,
    userName,
    userRole: context.role,
    actionType: action.type,
    entityType: action.entityType,
    entityId: action.entityId,
    entityName: action.entityName,
    description: action.description,
    metadata: action.metadata,
    request,
  })
}

// 한국어 액션 설명 생성 헬퍼
export const actionDescriptions = {
  student: {
    create: (name: string) => `학생 '${name}'을(를) 등록했습니다`,
    update: (name: string) => `학생 '${name}' 정보를 수정했습니다`,
    delete: (name: string) => `학생 '${name}'을(를) 삭제했습니다`,
  },
  consultation: {
    create: (name: string) => `상담 '${name}'을(를) 등록했습니다`,
    update: (name: string) => `상담 '${name}' 정보를 수정했습니다`,
    delete: (name: string) => `상담 '${name}'을(를) 삭제했습니다`,
  },
  class: {
    create: (name: string) => `반 '${name}'을(를) 생성했습니다`,
    update: (name: string) => `반 '${name}' 정보를 수정했습니다`,
    delete: (name: string) => `반 '${name}'을(를) 삭제했습니다`,
  },
  teacher: {
    create: (name: string) => `강사 '${name}'을(를) 등록했습니다`,
    update: (name: string) => `강사 '${name}' 정보를 수정했습니다`,
    delete: (name: string) => `강사 '${name}'을(를) 삭제했습니다`,
  },
  exam: {
    create: (name: string) => `시험 '${name}'을(를) 등록했습니다`,
    update: (name: string) => `시험 '${name}' 정보를 수정했습니다`,
    delete: (name: string) => `시험 '${name}'을(를) 삭제했습니다`,
  },
  attendance: {
    create: (name: string) => `출결 '${name}'을(를) 기록했습니다`,
    update: (name: string) => `출결 '${name}' 상태를 수정했습니다`,
    delete: (name: string) => `출결 '${name}'을(를) 삭제했습니다`,
  },
  billing: {
    create: (name: string) => `매출 '${name}'을(를) 등록했습니다`,
    update: (name: string) => `매출 '${name}' 정보를 수정했습니다`,
    delete: (name: string) => `매출 '${name}'을(를) 삭제했습니다`,
  },
  expense: {
    create: (name: string) => `지출 '${name}'을(를) 등록했습니다`,
    update: (name: string) => `지출 '${name}' 정보를 수정했습니다`,
    delete: (name: string) => `지출 '${name}'을(를) 삭제했습니다`,
  },
  homework: {
    create: (name: string) => `과제 '${name}'을(를) 등록했습니다`,
    update: (name: string) => `과제 '${name}' 정보를 수정했습니다`,
    delete: (name: string) => `과제 '${name}'을(를) 삭제했습니다`,
  },
  lesson: {
    create: (name: string) => `수업일지 '${name}'을(를) 작성했습니다`,
    update: (name: string) => `수업일지 '${name}'을(를) 수정했습니다`,
    delete: (name: string) => `수업일지 '${name}'을(를) 삭제했습니다`,
  },
  seat: {
    create: (name: string) => `좌석 '${name}'을(를) 등록했습니다`,
    update: (name: string) => `좌석 '${name}' 정보를 수정했습니다`,
    delete: (name: string) => `좌석 '${name}'을(를) 삭제했습니다`,
  },
  room: {
    create: (name: string) => `교실 '${name}'을(를) 등록했습니다`,
    update: (name: string) => `교실 '${name}' 정보를 수정했습니다`,
    delete: (name: string) => `교실 '${name}'을(를) 삭제했습니다`,
  },
  schedule: {
    create: (name: string) => `스케줄 '${name}'을(를) 등록했습니다`,
    update: (name: string) => `스케줄 '${name}' 정보를 수정했습니다`,
    delete: (name: string) => `스케줄 '${name}'을(를) 삭제했습니다`,
  },
}
