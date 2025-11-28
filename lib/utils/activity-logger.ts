import { createClient } from '@/lib/supabase/server'

type ActionType = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'view' | 'export'

interface LogActivityParams {
  orgId: string
  userId?: string | null
  userName: string
  userRole?: string | null
  actionType: ActionType
  entityType: string
  entityId?: string | null
  entityName?: string | null
  description: string
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * 활동 로그를 기록하는 헬퍼 함수
 * 테이블이 없어도 에러 없이 graceful하게 처리됨
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('activity_logs').insert({
      org_id: params.orgId,
      user_id: params.userId,
      user_name: params.userName,
      user_role: params.userRole,
      action_type: params.actionType,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_name: params.entityName,
      description: params.description,
      metadata: params.metadata || {},
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
    })

    if (error) {
      // 테이블이 없으면 경고만 출력
      if (error.code === '42P01') {
        console.warn('[ActivityLogger] activity_logs table not found, skipping')
        return
      }
      console.error('[ActivityLogger] Failed to log activity:', error)
    }
  } catch (err) {
    // 로깅 실패는 주요 기능에 영향을 주지 않도록 함
    console.error('[ActivityLogger] Error:', err)
  }
}

/**
 * 학생 관련 활동 로그
 */
export const StudentActivityLogger = {
  created: (params: { orgId: string; userName: string; userRole?: string; studentId: string; studentName: string }) =>
    logActivity({
      orgId: params.orgId,
      userName: params.userName,
      userRole: params.userRole,
      actionType: 'create',
      entityType: 'student',
      entityId: params.studentId,
      entityName: params.studentName,
      description: `${params.userName}님이 학생 '${params.studentName}'을(를) 등록했습니다`,
    }),

  updated: (params: { orgId: string; userName: string; userRole?: string; studentId: string; studentName: string; changes?: Record<string, unknown> }) =>
    logActivity({
      orgId: params.orgId,
      userName: params.userName,
      userRole: params.userRole,
      actionType: 'update',
      entityType: 'student',
      entityId: params.studentId,
      entityName: params.studentName,
      description: `${params.userName}님이 학생 '${params.studentName}' 정보를 수정했습니다`,
      metadata: params.changes,
    }),

  deleted: (params: { orgId: string; userName: string; userRole?: string; studentId: string; studentName: string }) =>
    logActivity({
      orgId: params.orgId,
      userName: params.userName,
      userRole: params.userRole,
      actionType: 'delete',
      entityType: 'student',
      entityId: params.studentId,
      entityName: params.studentName,
      description: `${params.userName}님이 학생 '${params.studentName}'을(를) 삭제했습니다`,
    }),
}

/**
 * 상담 관련 활동 로그
 */
export const ConsultationActivityLogger = {
  created: (params: { orgId: string; userName: string; userRole?: string; consultationId: string; studentName: string }) =>
    logActivity({
      orgId: params.orgId,
      userName: params.userName,
      userRole: params.userRole,
      actionType: 'create',
      entityType: 'consultation',
      entityId: params.consultationId,
      entityName: params.studentName,
      description: `${params.userName}님이 '${params.studentName}' 상담을 등록했습니다`,
    }),

  updated: (params: { orgId: string; userName: string; userRole?: string; consultationId: string; studentName: string; newStatus?: string }) =>
    logActivity({
      orgId: params.orgId,
      userName: params.userName,
      userRole: params.userRole,
      actionType: 'update',
      entityType: 'consultation',
      entityId: params.consultationId,
      entityName: params.studentName,
      description: params.newStatus
        ? `${params.userName}님이 '${params.studentName}' 상담 상태를 '${params.newStatus}'(으)로 변경했습니다`
        : `${params.userName}님이 '${params.studentName}' 상담 정보를 수정했습니다`,
    }),
}

/**
 * 수업/반 관련 활동 로그
 */
export const ClassActivityLogger = {
  created: (params: { orgId: string; userName: string; userRole?: string; classId: string; className: string }) =>
    logActivity({
      orgId: params.orgId,
      userName: params.userName,
      userRole: params.userRole,
      actionType: 'create',
      entityType: 'class',
      entityId: params.classId,
      entityName: params.className,
      description: `${params.userName}님이 반 '${params.className}'을(를) 개설했습니다`,
    }),

  studentEnrolled: (params: { orgId: string; userName: string; userRole?: string; classId: string; className: string; studentName: string }) =>
    logActivity({
      orgId: params.orgId,
      userName: params.userName,
      userRole: params.userRole,
      actionType: 'update',
      entityType: 'class',
      entityId: params.classId,
      entityName: params.className,
      description: `${params.userName}님이 '${params.studentName}' 학생을 '${params.className}' 반에 등록했습니다`,
    }),
}

/**
 * 출결 관련 활동 로그
 */
export const AttendanceActivityLogger = {
  marked: (params: { orgId: string; userName: string; userRole?: string; studentName: string; className: string; status: string }) =>
    logActivity({
      orgId: params.orgId,
      userName: params.userName,
      userRole: params.userRole,
      actionType: 'update',
      entityType: 'attendance',
      entityName: params.studentName,
      description: `${params.userName}님이 '${params.studentName}' 학생의 '${params.className}' 출결을 '${params.status}'(으)로 처리했습니다`,
    }),
}

/**
 * 시험/성적 관련 활동 로그
 */
export const ExamActivityLogger = {
  created: (params: { orgId: string; userName: string; userRole?: string; examId: string; examName: string }) =>
    logActivity({
      orgId: params.orgId,
      userName: params.userName,
      userRole: params.userRole,
      actionType: 'create',
      entityType: 'exam',
      entityId: params.examId,
      entityName: params.examName,
      description: `${params.userName}님이 시험 '${params.examName}'을(를) 등록했습니다`,
    }),

  scoreEntered: (params: { orgId: string; userName: string; userRole?: string; examId: string; examName: string; studentCount: number }) =>
    logActivity({
      orgId: params.orgId,
      userName: params.userName,
      userRole: params.userRole,
      actionType: 'update',
      entityType: 'exam',
      entityId: params.examId,
      entityName: params.examName,
      description: `${params.userName}님이 '${params.examName}' 시험 성적 ${params.studentCount}명분을 입력했습니다`,
    }),
}

/**
 * 일반 활동 로그
 */
export const GeneralActivityLogger = {
  custom: logActivity,
}
