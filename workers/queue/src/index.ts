/**
 * GoldPen Attendance Queue Consumer
 * Queue에서 출결 체크 작업을 받아서 처리
 *
 * 작업 타입:
 * - check_academy: 학원/공부방 출결 체크
 * - check_study: 독서실 출결 체크
 * - check_class: 강의 출결 체크
 * - daily_report: 일일 학습 리포트 발송
 * - process_commute_absent: 독서실 결석 처리
 */

import postgres from "postgres";

// 공유 알림 라이브러리 (잔액 차감 로직 포함)
import {
  sendTelegramWithSolapiFormat,
  sendSolapiAlimtalk,
  sendPpurioAlimtalk, // Legacy - 다른 곳에서 아직 사용 중
  checkAndDeductBalancePostgres,
  recordTransactionPostgres,
  recordMessageLogPostgres,
  sendNotificationWithBalancePostgres,
  SOLAPI_TEMPLATE_CONFIGS,
  type TelegramConfig,
  type SolapiConfig,
  type PpurioConfig, // Legacy - 다른 곳에서 아직 사용 중
  type NotificationType as SharedNotificationType,
} from "../../shared/src/notifications";

interface Env {
  HYPERDRIVE_DB: Hyperdrive;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  KAKAO_ALIMTALK_API_KEY?: string;
  KAKAO_ALIMTALK_SECRET_KEY?: string;
  KAKAO_ALIMTALK_SENDER_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  // PPURIO 알림톡 설정 (deprecated - Solapi로 대체)
  PPURIO_ACCOUNT?: string;
  PPURIO_PASSWORD?: string;
  PPURIO_SENDER_KEY?: string;
  // Solapi 알림톡 설정
  SOLAPI_API_KEY?: string;
  SOLAPI_API_SECRET?: string;
  SOLAPI_PF_ID?: string;
  SOLAPI_SENDER_PHONE?: string;
  TIMEZONE: string;
}

// Queue 메시지 타입
interface AttendanceMessage {
  type: 'check_academy' | 'check_study' | 'check_class' | 'check_commute' | 'daily_report' | 'process_commute_absent' | 'process_notification_queue';
  orgId: string;
  orgName: string;
  orgType: string;
  weekday: WeekdayName;
  todayDate: string;
  nowMinutes: number;
  timestamp: number;
}

// notification_queue 레코드 타입
interface NotificationQueueRecord {
  id: string;
  org_id: string;
  type: string;
  payload: { student_id: string; seat_number?: number };
  status: string;
  retry_count: number;
}

// 요일 변환
const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

type WeekdayName = (typeof WEEKDAYS)[number];

// 시간 문자열을 분으로 변환 (HH:MM:SS 또는 HH:MM)
function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(":");
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return hours * 60 + minutes;
}

// 기본 메시지 템플릿 (통합 - 모든 알림 타입)
const DEFAULT_TEMPLATES: Record<string, string> = {
  // 출결 알림
  'late': '[{{기관명}}] 학부모님 안녕하세요.\n\n{{학생명}} 학생이 등원 일정 시간({{예정시간}})이 지났는데 아직 도착하지 않았습니다. 확인 부탁드립니다.',
  'absent': '[{{기관명}}] 학부모님 안녕하세요.\n\n{{학생명}} 학생이 오늘 등원 일정에 출석하지 않아 결석 처리되었습니다. 사유 확인이 필요하시면 연락 부탁드립니다.',
  'checkin': '[{{기관명}}] 학부모님 안녕하세요.\n\n{{학생명}} 학생이 {{시간}}에 안전하게 도착했습니다. 오늘도 열심히 공부하겠습니다!',
  'checkout': '[{{기관명}}] 학부모님 안녕하세요.\n\n{{학생명}} 학생이 {{시간}}에 일과를 마치고 귀가했습니다. 안전하게 귀가하길 바랍니다.',
  // 독서실 전용
  'study_out': '[{{기관명}}] 학부모님 안녕하세요.\n\n{{학생명}} 학생이 {{시간}}에 잠시 외출합니다.',
  'study_return': '[{{기관명}}] 학부모님 안녕하세요.\n\n{{학생명}} 학생이 {{시간}}에 복귀했습니다.',
  // 학습 리포트
  'daily_report': '[{{기관명}}] 학부모님 안녕하세요.\n\n{{학생명}} 학생의 {{날짜}} 학습 현황을 전해드립니다.\n\n오늘 총 {{총학습시간}} 동안 열심히 공부했고, {{완료과목}} 과목을 완료했습니다. 꾸준히 노력하는 모습이 대견합니다!',
  // 수업 리포트 (PPURIO 변수: 기관명, 학생명, 오늘수업, 학습포인트, 선생님, 원장님, 숙제, 복습팁)
  'lesson_report': '[{{기관명}}] 학부모님 안녕하세요.\n\n{{학생명}} 학생의 수업 리포트입니다.\n\n📚 오늘 수업: {{오늘수업}}\n💡 학습 포인트: {{학습포인트}}\n👨‍🏫 선생님 코멘트: {{선생님}}\n👔 원장님 코멘트: {{원장님}}\n📝 숙제: {{숙제}}\n📖 복습 팁: {{복습팁}}\n\n오늘도 수고했어요!',
  // 시험/과제 알림
  'exam_result': '[{{기관명}}] 학부모님 안녕하세요.\n\n{{학생명}} 학생의 시험 결과를 안내드립니다.\n\n{{시험명}}: {{점수}}\n\n열심히 준비한 만큼 좋은 결과로 이어지길 바랍니다!',
  'assignment': '[{{기관명}}] 학부모님 안녕하세요.\n\n{{학생명}} 학생에게 새 과제가 등록되었습니다.\n\n📝 과제: {{과제명}}\n📅 마감일: {{마감일}}\n\n과제 제출 잊지 마세요!',
}

// 템플릿 변수 치환 함수
function fillTemplate(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return result
}

// 조직 설정에서 템플릿 가져오기
const templateCache: Record<string, { templates: Record<string, string>; timestamp: number }> = {}
const CACHE_TTL = 5 * 60 * 1000 // 5분 캐시

async function getOrgTemplates(
  sql: postgres.Sql,
  orgId: string
): Promise<Record<string, string>> {
  const cached = templateCache[orgId]
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.templates
  }

  try {
    const result = await sql`
      SELECT settings FROM organizations WHERE id = ${orgId}
    `
    if (result.length > 0 && result[0].settings) {
      const settings = result[0].settings as Record<string, unknown>
      const templates = (settings.messageTemplatesParent || {}) as Record<string, string>
      templateCache[orgId] = { templates, timestamp: Date.now() }
      return templates
    }
  } catch (error) {
    console.error(`[Templates] Failed to get templates for org ${orgId}:`, error)
  }
  return {}
}

async function getTemplate(
  sql: postgres.Sql,
  orgId: string,
  templateKey: string
): Promise<string> {
  const orgTemplates = await getOrgTemplates(sql, orgId)
  return orgTemplates[templateKey] || DEFAULT_TEMPLATES[templateKey] || ''
}

export default {
  // Queue Consumer handler
  async queue(
    batch: MessageBatch<AttendanceMessage>,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log(`[QueueConsumer] Processing ${batch.messages.length} messages`);

    const sql = postgres(env.HYPERDRIVE_DB.connectionString);

    try {
      for (const msg of batch.messages) {
        const { type, orgId, orgName, orgType, weekday, todayDate, nowMinutes } = msg.body;

        console.log(`[QueueConsumer] Processing ${type} for org ${orgName} (${orgId})`);

        try {
          switch (type) {
            case 'check_academy':
              await processAcademyAttendance(sql, orgId, orgName, weekday, todayDate, nowMinutes, env);
              break;
            case 'check_study':
              await processStudyRoomAttendance(sql, orgId, orgName, weekday, todayDate, nowMinutes, env);
              break;
            case 'check_class':
              await processClassAttendance(sql, orgId, orgName, weekday, todayDate, nowMinutes, env);
              break;
            case 'check_commute':
              await processCommuteAttendance(sql, orgId, orgName, weekday, todayDate, nowMinutes, env);
              break;
            case 'daily_report':
              await processDailyReport(sql, orgId, orgName, todayDate, env);
              break;
            case 'process_commute_absent':
              await processCommuteAbsence(sql, orgId, orgName, weekday, todayDate, env);
              break;
            case 'process_notification_queue':
              await processNotificationQueue(sql, env);
              break;
          }

          msg.ack();
          console.log(`[QueueConsumer] Completed ${type} for org ${orgName}`);
        } catch (error) {
          console.error(`[QueueConsumer] Error processing ${type} for org ${orgId}:`, error);
          msg.retry();
        }
      }
    } finally {
      await sql.end();
    }
  },

  // HTTP handler (for status check and test)
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 테스트 엔드포인트: /test?type=알림타입&student=학생명&org=기관명&time=시간&phone=전화번호
    // 지원 타입: late, absent, checkin, checkout, study_out, study_return, daily_report, lesson_report, exam_result, assignment
    if (url.pathname === '/test' && request.method === 'GET') {
      const type = url.searchParams.get('type') || 'late';
      const studentName = url.searchParams.get('student') || '테스트학생';
      const orgName = url.searchParams.get('org') || '골드펜';
      const currentTime = url.searchParams.get('time') || '14:30';
      const phone = url.searchParams.get('phone') || '01043934090'; // 테스트용 전화번호
      const todayDate = new Date().toISOString().split('T')[0];

      // 타입별 변수 설정 (Solapi 템플릿 변수명에 맞춤)
      const variablesByType: Record<string, Record<string, string>> = {
        'late': { '기관명': orgName, '학생명': studentName, '시간': currentTime },
        'absent': { '기관명': orgName, '학생명': studentName },
        'checkin': { '기관명': orgName, '학생명': studentName, '시간': currentTime },
        'checkout': { '기관명': orgName, '학생명': studentName, '시간': currentTime },
        'study_out': { '기관명': orgName, '학생명': studentName, '시간': currentTime },
        'study_return': { '기관명': orgName, '학생명': studentName, '시간': currentTime },
        'daily_report': { '기관명': orgName, '학생명': studentName, '날짜': todayDate, '총학습시간': '3시간 25분', '완료과목': '수학, 영어' },
        'lesson_report': { '기관명': orgName, '학생명': studentName, '오늘수업': '중등 수학 심화반', '학습포인트': '이차방정식 풀이 연습', '선생님코멘트': '오늘 집중력이 좋았어요!', '원장님코멘트': '수학 실력이 늘고 있어요!', '숙제': '교재 45~48페이지 문제풀이', '복습팁': '이차방정식 공식 암기하기' },
        'exam_result': { '기관명': orgName, '학생명': studentName, '시험명': '11월 모의고사', '점수': '92점' },
        'assignment': { '기관명': orgName, '학생명': studentName, '과제': '영어 단어 암기 (Unit 5)', '마감일': '12월 10일' },
      };

      // 템플릿 및 변수 가져오기
      const variables = variablesByType[type];
      const template = DEFAULT_TEMPLATES[type];

      let message = '';
      if (template && variables) {
        message = fillTemplate(template, variables);
      } else {
        message = `[테스트] 지원하지 않는 타입: ${type}`;
      }

      // 텔레그램 발송 (모니터링용)
      const telegramConfig: TelegramConfig = {
        botToken: env.TELEGRAM_BOT_TOKEN,
        chatId: env.TELEGRAM_CHAT_ID,
      };

      let telegramResult: { success: boolean; error?: string } = { success: false, error: 'not sent' };
      if (telegramConfig.botToken && telegramConfig.chatId) {
        telegramResult = await sendTelegramWithSolapiFormat(telegramConfig, type as SharedNotificationType, variables, phone);
        console.log(`[Test] 텔레그램 발송 결과: ${type}`, telegramResult);
      }

      // Solapi 알림톡 발송
      let solapiResult: { success: boolean; error?: string; messageId?: string } = { success: false, error: 'skipped' };
      const solapiConfig: SolapiConfig = {
        apiKey: env.SOLAPI_API_KEY,
        apiSecret: env.SOLAPI_API_SECRET,
        pfId: env.SOLAPI_PF_ID,
        senderPhone: env.SOLAPI_SENDER_PHONE,
      };

      if (solapiConfig.apiKey && solapiConfig.apiSecret && solapiConfig.pfId) {
        solapiResult = await sendSolapiAlimtalk(solapiConfig, {
          type: type as SharedNotificationType,
          phone: phone.replace(/[^0-9]/g, ''),
          recipientName: `${studentName} 학부모`,
          variables,
        });
        console.log(`[Test] Solapi 발송 결과: ${type} -> ${phone}`, solapiResult);
      }

      return new Response(
        JSON.stringify({
          success: telegramResult.success || solapiResult.success,
          type,
          message,
          telegram: telegramResult,
          solapi: solapiResult,
          params: { studentName, orgName, time: currentTime, phone },
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // 기본 상태 체크
    return new Response(
      JSON.stringify({
        name: "GoldPen Attendance Queue Consumer",
        status: "running",
        description: "Processes attendance check jobs from queue",
        jobTypes: [
          "check_academy",
          "check_study",
          "check_class",
          "daily_report",
          "process_commute_absent"
        ],
        testEndpoint: "/test?type=late|absent|checkin|checkout|study_out|study_return|daily_report|lesson_report|exam_result|assignment&student=이름&org=기관명&time=14:00"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  },
};

// ============================================================
// 개별 기관 처리 함수들
// ============================================================

/**
 * 학원/공부방 출결 처리 (단일 기관)
 */
async function processAcademyAttendance(
  sql: postgres.Sql,
  orgId: string,
  orgName: string,
  weekday: WeekdayName,
  todayDate: string,
  nowMinutes: number,
  env: Env
): Promise<void> {
  // org_settings에서 유예 시간 설정 읽기 (기본값: 10분)
  const orgSettingsResult = await sql`
    SELECT settings FROM org_settings WHERE org_id = ${orgId} LIMIT 1
  `;
  const orgSettings = orgSettingsResult[0]?.settings as { gracePeriods?: Record<string, number> } | undefined;
  const lateGracePeriod = orgSettings?.gracePeriods?.late ?? 10;

  const schedules = await sql`
    SELECT
      cs.id,
      cs.student_id,
      cs.check_in_time,
      cs.check_out_time,
      s.name as student_name,
      s.parent_phone,
      (
        SELECT COUNT(*) FROM attendance_logs al
        WHERE al.student_id = cs.student_id
          AND al.check_in_time::date = ${todayDate}::date
      ) as has_checkin
    FROM commute_schedules cs
    JOIN students s ON s.id = cs.student_id
    WHERE cs.org_id = ${orgId}
      AND cs.weekday = ${weekday}
      AND cs.check_in_time IS NOT NULL
  `;

  for (const schedule of schedules) {
    const checkInMinutes = timeToMinutes(schedule.check_in_time);
    const checkOutMinutes = schedule.check_out_time ? timeToMinutes(schedule.check_out_time) : null;
    const hasCheckin = Number(schedule.has_checkin) > 0;

    // 체크인 시간 + 유예 시간이 지나야 지각/결석 처리 (>=로 정확한 타이밍)
    if (!hasCheckin && nowMinutes >= checkInMinutes + lateGracePeriod) {
      const absentThreshold = checkOutMinutes || (checkInMinutes + 120);

      if (nowMinutes >= absentThreshold) {
        // 결석 처리 전에 지각 알림이 전송되었는지 확인
        const existingLateNotif = await sql`
          SELECT id FROM notification_logs
          WHERE org_id = ${orgId}
            AND student_id = ${schedule.student_id}
            AND target_date = ${todayDate}::date
            AND type IN ('academy_late', 'study_late')
          LIMIT 1
        `;

        // 지각 알림이 전송된 적 없으면 먼저 전송
        if (existingLateNotif.length === 0) {
          console.log(`[Academy] Sending late notification first for ${schedule.student_name} (before absent)`);
          const lateTemplate = await getTemplate(sql, orgId, 'late');
          const lateMessage = fillTemplate(lateTemplate, {
            '기관명': orgName,
            '학생명': schedule.student_name,
            '예정시간': schedule.check_in_time,
          });
          await sendNotification(sql, env, {
            orgId,
            orgName,
            studentId: schedule.student_id,
            studentName: schedule.student_name,
            type: "late",
            context: "academy",
            targetDate: todayDate,
            scheduledTime: schedule.check_in_time,
            recipientPhone: schedule.parent_phone,
            message: lateMessage,
          });
        }

        // 이제 결석 알림 전송
        const template = await getTemplate(sql, orgId, 'absent');
        const message = fillTemplate(template, {
          '기관명': orgName,
          '학생명': schedule.student_name,
          '예정시간': schedule.check_out_time || schedule.check_in_time,
        });
        await sendNotification(sql, env, {
          orgId,
          orgName,
          studentId: schedule.student_id,
          studentName: schedule.student_name,
          type: "absent",
          context: "academy",
          targetDate: todayDate,
          scheduledTime: schedule.check_out_time || schedule.check_in_time,
          recipientPhone: schedule.parent_phone,
          message,
        });
      } else if (nowMinutes >= checkInMinutes + lateGracePeriod) {
        // 🔴 중복 알림 방지: notification_logs에 이미 전송된 지각 알림이 있는지 체크
        const existingLateNotifAcademy = await sql`
          SELECT id FROM notification_logs
          WHERE org_id = ${orgId}
            AND student_id = ${schedule.student_id}
            AND target_date = ${todayDate}::date
            AND type IN ('academy_late', 'study_late')
          LIMIT 1
        `;

        // 이미 지각 알림이 전송된 적 있으면 건너뜀
        if (existingLateNotifAcademy.length > 0) {
          console.log(`[Academy] Late notification already sent for ${schedule.student_name}, skipping`);
          continue;
        }

        console.log(`[Academy] Sending late notification for ${schedule.student_name}`);
        const template = await getTemplate(sql, orgId, 'late');
        const message = fillTemplate(template, {
          '기관명': orgName,
          '학생명': schedule.student_name,
          '예정시간': schedule.check_in_time,
        });
        await sendNotification(sql, env, {
          orgId,
          orgName,
          studentId: schedule.student_id,
          studentName: schedule.student_name,
          type: "late",
          context: "academy",
          targetDate: todayDate,
          scheduledTime: schedule.check_in_time,
          recipientPhone: schedule.parent_phone,
          message,
        });
      }
    }
  }
}

/**
 * 독서실 출결 처리 (단일 기관)
 */
async function processStudyRoomAttendance(
  sql: postgres.Sql,
  orgId: string,
  orgName: string,
  weekday: WeekdayName,
  todayDate: string,
  nowMinutes: number,
  env: Env
): Promise<void> {
  // org_settings에서 유예 시간 설정 읽기 (기본값: 10분)
  const orgSettingsResult = await sql`
    SELECT settings FROM org_settings WHERE org_id = ${orgId} LIMIT 1
  `;
  const orgSettings = orgSettingsResult[0]?.settings as { gracePeriods?: Record<string, number> } | undefined;
  const lateGracePeriod = orgSettings?.gracePeriods?.late ?? 10;

  const schedules = await sql`
    SELECT
      cs.id,
      cs.student_id,
      cs.check_in_time,
      cs.check_out_time,
      s.name as student_name,
      s.parent_phone,
      (
        SELECT COUNT(*) FROM attendance_logs al
        WHERE al.student_id = cs.student_id
          AND al.check_in_time::date = ${todayDate}::date
      ) as has_checkin
    FROM commute_schedules cs
    JOIN students s ON s.id = cs.student_id
    WHERE cs.org_id = ${orgId}
      AND cs.weekday = ${weekday}
      AND cs.check_in_time IS NOT NULL
  `;

  for (const schedule of schedules) {
    const checkInMinutes = timeToMinutes(schedule.check_in_time);
    const checkOutMinutes = schedule.check_out_time ? timeToMinutes(schedule.check_out_time) : null;
    const hasCheckin = Number(schedule.has_checkin) > 0;

    // 체크인 시간 + 유예 시간이 지나야 지각/결석 처리 (>=로 정확한 타이밍)
    if (!hasCheckin && nowMinutes >= checkInMinutes + lateGracePeriod) {
      if (checkOutMinutes && nowMinutes >= checkOutMinutes) {
        // 결석 처리 전에 지각 알림이 전송되었는지 확인
        const existingLateNotif = await sql`
          SELECT id FROM notification_logs
          WHERE org_id = ${orgId}
            AND student_id = ${schedule.student_id}
            AND target_date = ${todayDate}::date
            AND type = 'study_late'
          LIMIT 1
        `;

        // 지각 알림이 전송된 적 없으면 먼저 전송
        if (existingLateNotif.length === 0) {
          console.log(`[StudyRoom] Sending late notification first for ${schedule.student_name} (before absent)`);
          const lateTemplate = await getTemplate(sql, orgId, 'late');
          const lateMessage = fillTemplate(lateTemplate, {
            '기관명': orgName,
            '학생명': schedule.student_name,
            '예정시간': schedule.check_in_time,
          });
          await sendNotification(sql, env, {
            orgId,
            orgName,
            studentId: schedule.student_id,
            studentName: schedule.student_name,
            type: "late",
            context: "study",
            targetDate: todayDate,
            scheduledTime: schedule.check_in_time,
            recipientPhone: schedule.parent_phone,
            message: lateMessage,
          });
        }

        // 결석 레코드 삽입
        try {
          await sql`
            INSERT INTO attendance_logs (org_id, student_id, check_in_time, check_out_time, duration_minutes, source)
            VALUES (
              ${orgId},
              ${schedule.student_id},
              ${todayDate}::date + TIME '00:00:00',
              ${todayDate}::date + TIME '00:00:00',
              0,
              'cron_absent'
            )
            ON CONFLICT DO NOTHING
          `;
        } catch (insertError) {
          console.error(`[StudyRoom] Failed to insert absence record:`, insertError);
        }

        // 이제 결석 알림 전송
        const template = await getTemplate(sql, orgId, 'absent');
        const message = fillTemplate(template, {
          '기관명': orgName,
          '학생명': schedule.student_name,
          '예정시간': schedule.check_out_time,
        });
        await sendNotification(sql, env, {
          orgId,
          orgName,
          studentId: schedule.student_id,
          studentName: schedule.student_name,
          type: "absent",
          context: "study",
          targetDate: todayDate,
          scheduledTime: schedule.check_out_time,
          recipientPhone: schedule.parent_phone,
          message,
        });
      } else {
        // 🔴 중복 알림 방지: notification_logs에 이미 전송된 지각 알림이 있는지 체크
        const existingLateNotifStudy = await sql`
          SELECT id FROM notification_logs
          WHERE org_id = ${orgId}
            AND student_id = ${schedule.student_id}
            AND target_date = ${todayDate}::date
            AND type IN ('study_late', 'academy_late')
          LIMIT 1
        `;

        // 이미 지각 알림이 전송된 적 있으면 건너뜀
        if (existingLateNotifStudy.length > 0) {
          console.log(`[StudyRoom] Late notification already sent for ${schedule.student_name}, skipping`);
          continue;
        }

        console.log(`[StudyRoom] Sending late notification for ${schedule.student_name}`);
        const template = await getTemplate(sql, orgId, 'late');
        const message = fillTemplate(template, {
          '기관명': orgName,
          '학생명': schedule.student_name,
          '예정시간': schedule.check_in_time,
        });
        await sendNotification(sql, env, {
          orgId,
          orgName,
          studentId: schedule.student_id,
          studentName: schedule.student_name,
          type: "late",
          context: "study",
          targetDate: todayDate,
          scheduledTime: schedule.check_in_time,
          recipientPhone: schedule.parent_phone,
          message,
        });
      }
    }
  }
}

/**
 * 강의 출결 처리 (단일 기관)
 */
async function processClassAttendance(
  sql: postgres.Sql,
  orgId: string,
  orgName: string,
  weekday: WeekdayName,
  todayDate: string,
  nowMinutes: number,
  env: Env
): Promise<void> {
  // org_settings에서 유예 시간 설정 읽기 (기본값: 10분)
  const orgSettingsResult = await sql`
    SELECT settings FROM org_settings WHERE org_id = ${orgId} LIMIT 1
  `;
  const orgSettings = orgSettingsResult[0]?.settings as { gracePeriods?: Record<string, number> } | undefined;
  const lateGracePeriod = orgSettings?.gracePeriods?.late ?? 10;

  const classes = await sql`
    SELECT
      c.id as class_id,
      c.name as class_name,
      c.schedule
    FROM classes c
    WHERE c.org_id = ${orgId}
      AND c.status = 'active'
      AND c.schedule IS NOT NULL
      AND jsonb_array_length(c.schedule) > 0
  `;

  for (const cls of classes) {
    const scheduleArr = cls.schedule as Array<{
      day: string;
      start_time: string;
      end_time: string;
    }>;

    const todaySchedule = scheduleArr.find(
      (s) => s.day.toLowerCase() === weekday
    );

    if (!todaySchedule) continue;

    const startMinutes = timeToMinutes(todaySchedule.start_time);
    const endMinutes = timeToMinutes(todaySchedule.end_time);

    if (nowMinutes <= startMinutes) continue;

    const enrollments = await sql`
      SELECT
        ce.student_id,
        ce.student_name,
        s.parent_phone,
        a.id as attendance_id,
        a.status as attendance_status
      FROM class_enrollments ce
      LEFT JOIN students s ON s.id = ce.student_id
      LEFT JOIN attendance a ON a.class_id = ce.class_id
        AND a.student_id = ce.student_id
        AND a.date = ${todayDate}::date
      WHERE ce.class_id = ${cls.class_id}
        AND ce.status = 'active'
    `;

    for (const enrollment of enrollments) {
      const currentStatus = enrollment.attendance_status;

      // 이미 출석(present)이면 건너뜀
      if (currentStatus === 'present') continue;

      // 수업 종료 시간이 지났으면 → 결석 처리 (>=로 정확한 타이밍)
      if (nowMinutes >= endMinutes) {
        // 이미 결석이면 건너뜀
        if (currentStatus === 'absent') continue;

        // 🔴 중요: 지각 알림이 아직 전송되지 않았으면 먼저 지각 알림 보내기
        // (cron이 수업 종료 후에 처음 실행된 경우)
        if (currentStatus !== 'late') {
          // 지각 알림 먼저 전송 여부 확인
          const existingLateNotif = await sql`
            SELECT id FROM notification_logs
            WHERE org_id = ${orgId}
              AND student_id = ${enrollment.student_id}
              AND class_id = ${cls.class_id}
              AND target_date = ${todayDate}::date
              AND type = 'class_late'
            LIMIT 1
          `;

          // 지각 알림이 전송된 적 없으면 먼저 전송
          if (existingLateNotif.length === 0) {
            console.log(`[Class] Sending late notification first for ${enrollment.student_name} (before absent)`);

            // attendance 레코드 생성 (late)
            try {
              if (!enrollment.attendance_id) {
                await sql`
                  INSERT INTO attendance (org_id, class_id, student_id, date, status)
                  VALUES (${orgId}, ${cls.class_id}, ${enrollment.student_id}, ${todayDate}::date, 'late')
                `;
              }
            } catch (err) {
              console.error(`[Class] Failed to insert late record:`, err);
            }

            const lateTemplate = await getTemplate(sql, orgId, 'late');
            const lateMessage = fillTemplate(lateTemplate, {
              '기관명': orgName,
              '학생명': enrollment.student_name,
              '수업명': cls.class_name,
              '예정시간': todaySchedule.start_time,
            });
            await sendNotification(sql, env, {
              orgId,
              orgName,
              studentId: enrollment.student_id,
              studentName: enrollment.student_name,
              type: "late",
              context: "class",
              classId: cls.class_id,
              targetDate: todayDate,
              scheduledTime: todaySchedule.start_time,
              recipientPhone: enrollment.parent_phone,
              message: lateMessage,
            });
          }
        }

        // 이제 결석 처리
        try {
          if (enrollment.attendance_id) {
            // 기존 레코드(late)가 있으면 absent로 UPDATE
            await sql`
              UPDATE attendance SET status = 'absent', updated_at = NOW()
              WHERE id = ${enrollment.attendance_id}
            `;
            console.log(`[Class] Updated late→absent for ${enrollment.student_name} in ${cls.class_name}`);
          } else {
            // 방금 late를 insert했으므로 다시 조회해서 update
            const latestAttendance = await sql`
              SELECT id FROM attendance
              WHERE org_id = ${orgId}
                AND class_id = ${cls.class_id}
                AND student_id = ${enrollment.student_id}
                AND date = ${todayDate}::date
              LIMIT 1
            `;
            if (latestAttendance.length > 0) {
              await sql`
                UPDATE attendance SET status = 'absent', updated_at = NOW()
                WHERE id = ${latestAttendance[0].id}
              `;
            } else {
              // 레코드가 없으면 INSERT
              await sql`
                INSERT INTO attendance (org_id, class_id, student_id, date, status)
                VALUES (${orgId}, ${cls.class_id}, ${enrollment.student_id}, ${todayDate}::date, 'absent')
              `;
            }
          }
        } catch (err) {
          console.error(`[Class] Failed to process absence:`, err);
        }

        const template = await getTemplate(sql, orgId, 'absent');
        const message = fillTemplate(template, {
          '기관명': orgName,
          '학생명': enrollment.student_name,
          '수업명': cls.class_name,
          '예정시간': todaySchedule.end_time,
        });
        await sendNotification(sql, env, {
          orgId,
          orgName,
          studentId: enrollment.student_id,
          studentName: enrollment.student_name,
          type: "absent",
          context: "class",
          classId: cls.class_id,
          targetDate: todayDate,
          scheduledTime: todaySchedule.end_time,
          recipientPhone: enrollment.parent_phone,
          message,
        });
      }
      // 시작시간+유예시간 지났으면 → 지각 처리 (>=로 정확한 타이밍)
      else if (nowMinutes >= startMinutes + lateGracePeriod) {
        // 이미 지각이면 건너뜀
        if (currentStatus === 'late') continue;

        // 🔴 중복 알림 방지: notification_logs에 이미 전송된 지각 알림이 있는지 체크
        const existingLateNotif = await sql`
          SELECT id FROM notification_logs
          WHERE org_id = ${orgId}
            AND student_id = ${enrollment.student_id}
            AND class_id = ${cls.class_id}
            AND target_date = ${todayDate}::date
            AND type = 'class_late'
          LIMIT 1
        `;

        // 이미 지각 알림이 전송된 적 있으면 건너뜀
        if (existingLateNotif.length > 0) {
          console.log(`[Class] Late notification already sent for ${enrollment.student_name}, skipping`);
          continue;
        }

        try {
          if (!enrollment.attendance_id) {
            await sql`
              INSERT INTO attendance (org_id, class_id, student_id, date, status)
              VALUES (${orgId}, ${cls.class_id}, ${enrollment.student_id}, ${todayDate}::date, 'late')
            `;
          }
        } catch (err) {
          console.error(`[Class] Failed to insert late record:`, err);
        }

        console.log(`[Class] Sending late notification for ${enrollment.student_name} in ${cls.class_name}`);
        const template = await getTemplate(sql, orgId, 'late');
        const message = fillTemplate(template, {
          '기관명': orgName,
          '학생명': enrollment.student_name,
          '수업명': cls.class_name,
          '예정시간': todaySchedule.start_time,
        });
        await sendNotification(sql, env, {
          orgId,
          orgName,
          studentId: enrollment.student_id,
          studentName: enrollment.student_name,
          type: "late",
          context: "class",
          classId: cls.class_id,
          targetDate: todayDate,
          scheduledTime: todaySchedule.start_time,
          recipientPhone: enrollment.parent_phone,
          message,
        });
      }
    }
  }
}

/**
 * 통학 스케줄 출결 처리 (단일 기관)
 * commute_schedules 테이블 기반 지각/결석 알림
 */
async function processCommuteAttendance(
  sql: postgres.Sql,
  orgId: string,
  orgName: string,
  weekday: WeekdayName,
  todayDate: string,
  nowMinutes: number,
  env: Env
): Promise<void> {
  // org_settings에서 유예 시간 설정 읽기 (기본값: 10분)
  const orgSettingsResult = await sql`
    SELECT settings FROM org_settings WHERE org_id = ${orgId} LIMIT 1
  `;
  const orgSettings = orgSettingsResult[0]?.settings as { gracePeriods?: Record<string, number> } | undefined;
  const lateGracePeriod = orgSettings?.gracePeriods?.late ?? 10;

  console.log(`[Commute] Checking org ${orgName}, weekday: ${weekday}, nowMinutes: ${nowMinutes}, gracePeriod: ${lateGracePeriod}`);

  // 오늘 요일에 해당하는 통학 스케줄 조회
  const schedules = await sql`
    SELECT
      cs.id,
      cs.student_id,
      cs.check_in_time,
      cs.check_out_time,
      s.name as student_name,
      s.parent_phone,
      (
        SELECT COUNT(*) FROM attendance_logs al
        WHERE al.student_id = cs.student_id
          AND al.check_in_time::date = ${todayDate}::date
      ) as has_checkin
    FROM commute_schedules cs
    JOIN students s ON s.id = cs.student_id
    WHERE cs.org_id = ${orgId}
      AND cs.weekday = ${weekday}
      AND cs.check_in_time IS NOT NULL
  `;

  console.log(`[Commute] Found ${schedules.length} schedules for ${orgName}`);

  for (const schedule of schedules) {
    const checkInMinutes = timeToMinutes(schedule.check_in_time);
    const checkOutMinutes = schedule.check_out_time ? timeToMinutes(schedule.check_out_time) : null;
    const hasCheckin = Number(schedule.has_checkin) > 0;
    const lateThreshold = checkInMinutes + lateGracePeriod;
    // 결석 기준: check_out_time이 있으면 그 시간, 없으면 check_in + 2시간
    const absentThreshold = checkOutMinutes || (checkInMinutes + 120);

    console.log(`[Commute] Student: ${schedule.student_name}, checkInMinutes: ${checkInMinutes}, hasCheckin: ${hasCheckin}, lateThreshold: ${lateThreshold}, absentThreshold: ${absentThreshold}, nowMinutes: ${nowMinutes}`);

    // 체크인이 없는 경우에만 처리
    if (!hasCheckin) {
      // 결석 시간이 지났으면 결석 처리
      if (nowMinutes >= absentThreshold) {
        // 지각 알림이 먼저 전송되었는지 확인
        const existingLateNotif = await sql`
          SELECT id FROM notification_logs
          WHERE org_id = ${orgId}
            AND student_id = ${schedule.student_id}
            AND target_date = ${todayDate}::date
            AND type = 'commute_late'
          LIMIT 1
        `;

        // 지각 알림이 전송된 적 없으면 먼저 전송
        if (existingLateNotif.length === 0) {
          console.log(`[Commute] Sending late notification first for ${schedule.student_name} (before absent)`);
          const lateTemplate = await getTemplate(sql, orgId, 'late');
          const lateMessage = fillTemplate(lateTemplate, {
            '기관명': orgName,
            '학생명': schedule.student_name,
            '예정시간': schedule.check_in_time,
          });
          await sendNotification(sql, env, {
            orgId,
            orgName,
            studentId: schedule.student_id,
            studentName: schedule.student_name,
            type: "commute_late",
            targetDate: todayDate,
            scheduledTime: schedule.check_in_time,
            recipientPhone: schedule.parent_phone,
            message: lateMessage,
          });
        }

        // 결석 알림 중복 체크
        const existingAbsentNotif = await sql`
          SELECT id FROM notification_logs
          WHERE org_id = ${orgId}
            AND student_id = ${schedule.student_id}
            AND target_date = ${todayDate}::date
            AND type = 'commute_absent'
          LIMIT 1
        `;

        if (existingAbsentNotif.length > 0) {
          console.log(`[Commute] Absent notification already sent for ${schedule.student_name}, skipping`);
          continue;
        }

        console.log(`[Commute] Sending absent notification for ${schedule.student_name}`);
        const absentTemplate = await getTemplate(sql, orgId, 'absent');
        const absentMessage = fillTemplate(absentTemplate, {
          '기관명': orgName,
          '학생명': schedule.student_name,
          '예정시간': schedule.check_out_time || schedule.check_in_time,
        });

        await sendNotification(sql, env, {
          orgId,
          orgName,
          studentId: schedule.student_id,
          studentName: schedule.student_name,
          type: "commute_absent",
          targetDate: todayDate,
          scheduledTime: schedule.check_out_time || schedule.check_in_time,
          recipientPhone: schedule.parent_phone,
          message: absentMessage,
        });
      }
      // 유예 시간만 지났으면 지각 처리
      else if (nowMinutes >= lateThreshold) {
        // 중복 알림 방지: 이미 오늘 지각 알림이 전송되었는지 확인
        const existingNotif = await sql`
          SELECT id FROM notification_logs
          WHERE org_id = ${orgId}
            AND student_id = ${schedule.student_id}
            AND target_date = ${todayDate}::date
            AND type = 'commute_late'
          LIMIT 1
        `;

        if (existingNotif.length > 0) {
          console.log(`[Commute] Late notification already sent for ${schedule.student_name}, skipping`);
          continue;
        }

        console.log(`[Commute] Sending late notification for ${schedule.student_name} (scheduled: ${schedule.check_in_time})`);

        const template = await getTemplate(sql, orgId, 'late');
        const message = fillTemplate(template, {
          '기관명': orgName,
          '학생명': schedule.student_name,
          '예정시간': schedule.check_in_time,
        });

        await sendNotification(sql, env, {
          orgId,
          orgName,
          studentId: schedule.student_id,
          studentName: schedule.student_name,
          type: "commute_late",
          targetDate: todayDate,
          scheduledTime: schedule.check_in_time,
          recipientPhone: schedule.parent_phone,
          message,
        });
      }
    }
  }
}

/**
 * 일일 학습 리포트 발송 (독서실 전용)
 * - 오늘 독서실에 출석한 학생만 대상
 * - 완료과목은 daily_planners.study_plans에서 가져옴
 */
async function processDailyReport(
  sql: postgres.Sql,
  orgId: string,
  orgName: string,
  todayDate: string,
  env: Env
): Promise<void> {
  // 1. 오늘 독서실에 출석한 학생 조회 (daily_planners에서 완료과목 가져옴)
  const attendanceRecords = await sql`
    SELECT
      al.student_id,
      s.name as student_name,
      s.parent_phone,
      COALESCE(EXTRACT(EPOCH FROM (al.check_out_time - al.check_in_time)) / 60, 0)::int as study_minutes,
      dp.study_plans
    FROM attendance_logs al
    JOIN students s ON s.id = al.student_id
    LEFT JOIN daily_planners dp ON dp.student_id = al.student_id
      AND dp.date = ${todayDate}::date
      AND dp.org_id = ${orgId}
    WHERE al.org_id = ${orgId}
      AND al.check_in_time::date = ${todayDate}::date
      AND s.parent_phone IS NOT NULL
  `;

  // 오늘 출석한 학생에게만 알림 발송
  for (const record of attendanceRecords) {
    // 과목(완료), 과목(미완료) 형태로 생성 (50자 제한)
    const plans = record.study_plans as Array<{ subject: string; completed: boolean }> || [];
    let completedSubjectsStr = '공부'; // 과목이 없으면 "공부"

    if (plans.length > 0) {
      const subjectList: string[] = [];
      let totalLength = 0;
      const MAX_LENGTH = 50;

      for (const plan of plans) {
        const status = plan.completed ? '완료' : '미완료';
        const item = `${plan.subject}(${status})`;

        // 다음 항목 추가 시 길이 체크 (쉼표+공백 포함)
        const newLength = totalLength + (subjectList.length > 0 ? 2 : 0) + item.length;

        if (newLength > MAX_LENGTH) {
          // 남은 과목 수 표시
          const remaining = plans.length - subjectList.length;
          if (remaining > 0) {
            subjectList.push(`외 ${remaining}개`);
          }
          break;
        }

        subjectList.push(item);
        totalLength = newLength;
      }

      completedSubjectsStr = subjectList.join(', ');
    }

    // 학습 시간 계산
    const studyHours = Math.floor(Number(record.study_minutes) / 60);
    const studyMins = Number(record.study_minutes) % 60;
    const studyTimeStr = studyHours > 0
      ? `${studyHours}시간 ${studyMins}분`
      : `${studyMins}분`;

    const template = await getTemplate(sql, orgId, 'daily_report');
    const message = fillTemplate(template, {
      '기관명': orgName,
      '학생명': record.student_name,
      '날짜': todayDate,
      '총학습시간': studyTimeStr,
      '완료과목': completedSubjectsStr,
    });

    await sendNotification(sql, env, {
      orgId,
      orgName,
      studentId: record.student_id,
      studentName: record.student_name,
      type: "daily_report",
      context: "study",
      targetDate: todayDate,
      recipientPhone: record.parent_phone,
      message,
    });
  }
}

/**
 * 독서실 결석 처리 (단일 기관)
 */
async function processCommuteAbsence(
  sql: postgres.Sql,
  orgId: string,
  orgName: string,
  weekday: WeekdayName,
  todayDate: string,
  env: Env
): Promise<void> {
  const students = await sql`
    SELECT
      cs.id as schedule_id,
      cs.student_id,
      cs.check_in_time,
      s.name as student_name,
      s.parent_phone,
      (
        SELECT COUNT(*) FROM attendance a
        WHERE a.org_id = ${orgId}
          AND a.student_id = cs.student_id
          AND a.date = ${todayDate}::date
          AND a.class_id IS NULL
      ) as has_attendance,
      (
        SELECT COUNT(*) FROM attendance_logs al
        WHERE al.student_id = cs.student_id
          AND al.check_in_time::date = ${todayDate}::date
      ) as has_checkin
    FROM commute_schedules cs
    JOIN students s ON s.id = cs.student_id
    WHERE cs.org_id = ${orgId}
      AND cs.weekday = ${weekday}
  `;

  for (const student of students) {
    const hasAttendance = Number(student.has_attendance) > 0;
    const hasCheckin = Number(student.has_checkin) > 0;

    if (hasAttendance || hasCheckin) continue;

    try {
      await sql`
        INSERT INTO attendance (org_id, student_id, date, status, class_id)
        VALUES (${orgId}, ${student.student_id}, ${todayDate}::date, 'absent', NULL)
        ON CONFLICT (org_id, class_id, student_id, date) DO NOTHING
      `;

      const template = await getTemplate(sql, orgId, 'absent');
      const message = fillTemplate(template, {
        '기관명': orgName,
        '학생명': student.student_name,
        '예정시간': student.check_in_time || '오늘',
      });

      await sendNotification(sql, env, {
        orgId,
        orgName,
        studentId: student.student_id,
        studentName: student.student_name,
        type: "commute_absent",
        targetDate: todayDate,
        scheduledTime: student.check_in_time,
        recipientPhone: student.parent_phone,
        message,
      });
    } catch (insertError) {
      console.error(`[CommuteAbsent] Failed to insert absence record:`, insertError);
    }
  }
}

// ============================================================
// 알림 발송
// ============================================================

type NotificationType =
  | "late" | "absent"
  | "checkin" | "checkout"
  | "daily_report"
  | "commute_late" | "commute_absent";

// DB에 저장되는 실제 type (notification_logs_type_check constraint)
type DbNotificationType =
  | "study_late" | "study_absent"
  | "class_late" | "class_absent"
  | "commute_late" | "commute_absent"
  | "academy_checkin" | "academy_checkout"
  | "study_checkin" | "study_checkout"
  | "study_out" | "study_return"
  | "daily_report" | "lesson_report" | "exam_result" | "assignment_new";

// context에 따라 DB type 변환
function toDbNotificationType(type: NotificationType, context?: 'class' | 'study' | 'academy' | 'commute'): DbNotificationType {
  // commute_late/commute_absent는 직접 DB type으로 사용
  if (type === 'commute_late') {
    return 'commute_late';
  }
  if (type === 'commute_absent') {
    return 'commute_absent';
  }
  if (type === 'late') {
    return context === 'class' ? 'class_late' : 'study_late';
  }
  if (type === 'absent') {
    return context === 'class' ? 'class_absent' : 'study_absent';
  }
  if (type === 'checkin') {
    return context === 'academy' ? 'academy_checkin' : 'study_checkin';
  }
  if (type === 'checkout') {
    return context === 'academy' ? 'academy_checkout' : 'study_checkout';
  }
  if (type === 'daily_report') {
    return 'daily_report';  // daily_report는 그대로 유지 (lesson_report와 구분)
  }
  return 'study_late'; // fallback
}

interface NotificationParams {
  orgId: string;
  orgName: string; // 🔴 잔액 차감 로직용 추가
  studentId: string;
  studentName: string;
  type: NotificationType;
  context?: 'class' | 'study' | 'academy' | 'commute';
  classId?: string;
  targetDate: string;
  scheduledTime?: string;
  recipientPhone?: string;
  message: string;
}

async function sendNotification(
  sql: postgres.Sql,
  env: Env,
  params: NotificationParams
): Promise<void> {
  const {
    orgId,
    orgName,
    studentId,
    studentName,
    type,
    context,
    classId,
    targetDate,
    scheduledTime,
    recipientPhone,
    message,
  } = params;

  // DB에 저장할 때는 context에 맞는 type으로 변환
  const dbType = toDbNotificationType(type, context);

  try {
    const existing = await sql`
      SELECT id FROM notification_logs
      WHERE org_id = ${orgId}
        AND student_id = ${studentId}
        AND type = ${dbType}
        AND target_date = ${targetDate}::date
        ${classId ? sql`AND class_id = ${classId}` : sql`AND class_id IS NULL`}
      LIMIT 1
    `;

    if (existing.length > 0) {
      console.log(`[Notification] Skipping duplicate: ${dbType} for ${studentName}`);
      return;
    }

    // 🔴 잔액 확인 및 차감 (shared 라이브러리 사용)
    const balanceResult = await checkAndDeductBalancePostgres(sql, orgId, orgName);

    if (!balanceResult.success) {
      console.log(`[Notification] 잔액 부족으로 건너뜀: ${orgName} - ${studentName} (${dbType})`);
      // 잔액 부족 시 실패 기록
      await recordMessageLogPostgres(
        sql, orgId, dbType as SharedNotificationType, studentName,
        balanceResult.price, balanceResult.cost,
        'failed', ' (잔액부족)'
      );
      return;
    }

    // 트랜잭션 기록
    await recordTransactionPostgres(
      sql, orgId,
      balanceResult.price,
      balanceResult.newBalance!,
      dbType as SharedNotificationType, studentName
    );

    // 메시지 로그 기록 (성공)
    await recordMessageLogPostgres(
      sql, orgId, dbType as SharedNotificationType, studentName,
      balanceResult.price, balanceResult.cost,
      'sent', ''
    );

    await sql`
      INSERT INTO notification_logs (
        org_id, student_id, type, class_id, target_date,
        scheduled_time, recipient_phone, message, status
      ) VALUES (
        ${orgId}, ${studentId}, ${dbType}, ${classId || null}, ${targetDate}::date,
        ${scheduledTime ? sql`${scheduledTime}::time` : sql`NULL`}, ${recipientPhone || null}, ${message}, 'sent'
      )
    `;

    console.log(`[Notification] Recorded: ${dbType} for ${studentName} (-${balanceResult.price}원)`);

    // Solapi 변수 준비 (type에 따라 다른 변수 필요)
    const solapiVariables: Record<string, string> = {
      "기관명": orgName,
      "학생명": studentName,
    };
    // 시간 변수 추가 (late, checkin, checkout, study_out, study_return)
    if (scheduledTime) {
      solapiVariables["시간"] = scheduledTime;
    }

    // 텔레그램으로 Solapi API 형식 전송 (테스트/모니터링용)
    // TODO: Solapi 템플릿 승인 후 이 블록 제거
    const telegramConfig: TelegramConfig = {
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId: env.TELEGRAM_CHAT_ID,
    };
    await sendTelegramWithSolapiFormat(telegramConfig, dbType as SharedNotificationType, solapiVariables, recipientPhone);

    // Solapi 알림톡 발송
    // TODO: Solapi 템플릿 승인 후 DRY_RUN 해제 (shared/notifications.ts)
    if (recipientPhone) {
      const solapiConfig: SolapiConfig = {
        apiKey: env.SOLAPI_API_KEY,
        apiSecret: env.SOLAPI_API_SECRET,
        pfId: env.SOLAPI_PF_ID,
        senderPhone: env.SOLAPI_SENDER_PHONE,
      };
      await sendSolapiAlimtalk(solapiConfig, {
        type: dbType as SharedNotificationType,
        phone: recipientPhone,
        recipientName: `${studentName} 학부모`,
        variables: solapiVariables,
      });
    }
  } catch (error) {
    console.error(`[Notification] Error for ${studentName}:`, error);

    try {
      await sql`
        INSERT INTO notification_logs (
          org_id, student_id, type, class_id, target_date,
          scheduled_time, recipient_phone, message, status, error_message
        ) VALUES (
          ${orgId}, ${studentId}, ${dbType}, ${classId || null}, ${targetDate}::date,
          ${scheduledTime ? sql`${scheduledTime}::time` : sql`NULL`}, ${recipientPhone || null}, ${message}, 'failed',
          ${String(error)}
        )
        ON CONFLICT (org_id, student_id, type, class_id, target_date) DO UPDATE
        SET status = 'failed', error_message = ${String(error)}
      `;
    } catch {
      // 무시
    }
  }
}

async function sendKakaoAlimtalk(
  env: Env,
  phone: string,
  message: string,
  templateCode: string = 'GOLDPEN_LATE_001'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = env.KAKAO_ALIMTALK_API_KEY;
  const secretKey = env.KAKAO_ALIMTALK_SECRET_KEY;
  const senderKey = env.KAKAO_ALIMTALK_SENDER_KEY;

  if (!apiKey || !senderKey) {
    console.log(`[Kakao] Dev mode - Would send to ${phone}: ${message}`);
    return { success: true, messageId: `mock_${Date.now()}` };
  }

  try {
    const timestamp = Date.now().toString();
    const signature = await generateHmacSignature(apiKey, secretKey || '', timestamp);

    const response = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `HMAC-SHA256 apiKey=${apiKey}, date=${timestamp}, salt=${timestamp}, signature=${signature}`,
      },
      body: JSON.stringify({
        message: {
          to: phone.replace(/[^0-9]/g, ''),
          from: senderKey,
          kakaoOptions: {
            pfId: senderKey,
            templateId: templateCode,
          },
          text: message,
        },
      }),
    });

    const result = await response.json() as { groupId?: string; errorMessage?: string };

    if (response.ok && result.groupId) {
      console.log(`[Kakao] Sent successfully: ${result.groupId}`);
      return { success: true, messageId: result.groupId };
    }

    console.error(`[Kakao] API error:`, result);
    return { success: false, error: result.errorMessage || 'Solapi API error' };
  } catch (error) {
    console.error(`[Kakao] Error:`, error);
    return { success: false, error: String(error) };
  }
}

async function generateHmacSignature(apiKey: string, secretKey: string, timestamp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(timestamp + apiKey);
  const key = encoder.encode(secretKey);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// ============================================================
// 텔레그램 테스트 알림
// ============================================================

async function sendTelegram(
  env: Env,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('[Telegram] No token/chatId configured. Message:', message);
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
// notification_queue 처리 (등원/하원 알림 등)
// ============================================================

const API_WORKER_URL = 'https://goldpen-api.hello-51f.workers.dev';

/**
 * notification_queue 테이블에서 pending 알림을 처리
 * 100% 전달 보장을 위한 DB 기반 큐
 *
 * 🔴 성능 개선: API Worker 호출 대신 직접 DB 기록 + 알림 전송
 */
async function processNotificationQueue(
  sql: postgres.Sql,
  env: Env
): Promise<void> {
  console.log('[NotificationQueue] Processing pending notifications...');

  // pending 상태의 알림을 최대 50개까지 가져오기
  const pendingNotifications = await sql<NotificationQueueRecord[]>`
    SELECT id, org_id, type, payload, status, retry_count
    FROM notification_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT 50
  `;

  console.log(`[NotificationQueue] Found ${pendingNotifications.length} pending notifications`);

  for (const notification of pendingNotifications) {
    try {
      const studentId = notification.payload.student_id;

      // 학생 정보 조회
      const studentResult = await sql`
        SELECT s.*, o.name as org_name, o.type as org_type
        FROM students s
        JOIN organizations o ON o.id = s.org_id
        WHERE s.id = ${studentId}
      `;

      if (studentResult.length === 0) {
        console.log(`[NotificationQueue] Student not found: ${studentId}`);
        await sql`
          UPDATE notification_queue
          SET status = 'failed', error_message = 'Student not found'
          WHERE id = ${notification.id}
        `;
        continue;
      }

      const student = studentResult[0];
      const now = new Date();
      const timeStr = now.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Seoul"
      });

      // ============================================================
      // 타입별 직접 처리 (API 호출 제거)
      // ============================================================

      if (notification.type === 'checkin') {
        // 체크인 처리
        await sql`
          UPDATE notification_queue SET status = 'processing' WHERE id = ${notification.id}
        `;

        // attendance_logs에 체크인 기록
        const logResult = await sql`
          INSERT INTO attendance_logs (org_id, student_id, check_in_time)
          VALUES (${student.org_id}, ${studentId}, NOW())
          RETURNING *
        `;

        // 알림 메시지 생성
        const checkinMessage = `${student.org_name}입니다, 학부모님.\n\n${student.name} 학생이 ${timeStr}에 안전하게 도착했습니다. 오늘도 열심히 공부하겠습니다!`;

        // 🔴 잔액 확인 및 차감 (shared 라이브러리 사용)
        const telegramConfig: TelegramConfig = {
          botToken: env.TELEGRAM_BOT_TOKEN,
          chatId: env.TELEGRAM_CHAT_ID,
        };
        const solapiConfig: SolapiConfig = {
          apiKey: env.SOLAPI_API_KEY,
          apiSecret: env.SOLAPI_API_SECRET,
          pfId: env.SOLAPI_PF_ID,
          senderPhone: env.SOLAPI_SENDER_PHONE,
        };

        const notificationResult = await sendNotificationWithBalancePostgres({
          sql,
          telegramConfig,
          solapiConfig,
          orgId: student.org_id,
          orgName: student.org_name,
          studentId,
          studentName: student.name,
          type: 'checkin',
          recipientPhone: student.parent_phone,
          message: checkinMessage,
          templateVariables: { 시간: timeStr },
        });

        if (!notificationResult.success) {
          console.log(`[NotificationQueue] Checkin notification failed (${notificationResult.error}): ${student.name}`);
        }

        await sql`
          UPDATE notification_queue
          SET status = 'completed', processed_at = NOW()
          WHERE id = ${notification.id}
        `;
        console.log(`[NotificationQueue] Checkin completed: ${student.name}`);
      }

      else if (notification.type === 'checkout') {
        // 체크아웃 처리 - 체크인 기록 확인
        const checkinRecord = await sql`
          SELECT * FROM attendance_logs
          WHERE student_id = ${studentId}
            AND check_out_time IS NULL
            AND check_in_time::date = CURRENT_DATE
          ORDER BY check_in_time DESC
          LIMIT 1
        `;

        if (checkinRecord.length === 0) {
          // 체크인 기록이 없으면 대기
          if (notification.retry_count >= 5) {
            await sql`
              UPDATE notification_queue
              SET status = 'failed', error_message = 'No checkin found after 5 retries'
              WHERE id = ${notification.id}
            `;
            console.log(`[NotificationQueue] Checkout failed: no checkin for ${student.name}`);
          } else {
            await sql`
              UPDATE notification_queue
              SET retry_count = retry_count + 1
              WHERE id = ${notification.id}
            `;
            console.log(`[NotificationQueue] Checkout waiting for checkin: ${student.name} (retry: ${notification.retry_count + 1})`);
          }
          continue;
        }

        await sql`
          UPDATE notification_queue SET status = 'processing' WHERE id = ${notification.id}
        `;

        // 학습 시간 계산
        const checkInTime = new Date(checkinRecord[0].check_in_time);
        const studyMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / 60000);
        const studyHours = Math.floor(studyMinutes / 60);
        const studyMins = studyMinutes % 60;
        const studyTimeStr = studyHours > 0 ? `${studyHours}시간 ${studyMins}분` : `${studyMins}분`;

        // 체크아웃 업데이트
        await sql`
          UPDATE attendance_logs
          SET check_out_time = NOW(), duration_minutes = ${studyMinutes}, updated_at = NOW()
          WHERE id = ${checkinRecord[0].id}
        `;

        // 알림 메시지 생성
        const checkoutMessage = `${student.org_name}입니다, 학부모님.\n\n${student.name} 학생이 ${timeStr}에 일과를 마치고 귀가했습니다. 안전하게 귀가하길 바랍니다. (총 학습시간: ${studyTimeStr})`;

        // 🔴 잔액 확인 및 차감 (shared 라이브러리 사용)
        const telegramConfig: TelegramConfig = {
          botToken: env.TELEGRAM_BOT_TOKEN,
          chatId: env.TELEGRAM_CHAT_ID,
        };
        const solapiConfig: SolapiConfig = {
          apiKey: env.SOLAPI_API_KEY,
          apiSecret: env.SOLAPI_API_SECRET,
          pfId: env.SOLAPI_PF_ID,
          senderPhone: env.SOLAPI_SENDER_PHONE,
        };

        const notificationResult = await sendNotificationWithBalancePostgres({
          sql,
          telegramConfig,
          solapiConfig,
          orgId: student.org_id,
          orgName: student.org_name,
          studentId,
          studentName: student.name,
          type: 'checkout',
          recipientPhone: student.parent_phone,
          message: checkoutMessage,
          templateVariables: { 시간: timeStr },
        });

        if (!notificationResult.success) {
          console.log(`[NotificationQueue] Checkout notification failed (${notificationResult.error}): ${student.name}`);
        }

        await sql`
          UPDATE notification_queue
          SET status = 'completed', processed_at = NOW()
          WHERE id = ${notification.id}
        `;
        console.log(`[NotificationQueue] Checkout completed: ${student.name} (${studyTimeStr})`);
      }

      else if (notification.type === 'out') {
        // 외출 처리
        await sql`
          UPDATE notification_queue SET status = 'processing' WHERE id = ${notification.id}
        `;

        const today = now.toISOString().split('T')[0];
        const seatNumber = notification.payload.seat_number || 0;

        await sql`
          INSERT INTO outing_records (org_id, student_id, seat_number, date, outing_time)
          VALUES (${student.org_id}, ${studentId}, ${seatNumber}, ${today}, NOW())
        `;

        const outMessage = `${student.org_name}입니다, 학부모님.\n\n${student.name} 학생이 ${timeStr}에 잠시 외출했습니다.`;

        // 🔴 잔액 확인 및 차감 (shared 라이브러리 사용)
        const telegramConfig: TelegramConfig = {
          botToken: env.TELEGRAM_BOT_TOKEN,
          chatId: env.TELEGRAM_CHAT_ID,
        };
        const solapiConfig: SolapiConfig = {
          apiKey: env.SOLAPI_API_KEY,
          apiSecret: env.SOLAPI_API_SECRET,
          pfId: env.SOLAPI_PF_ID,
          senderPhone: env.SOLAPI_SENDER_PHONE,
        };

        const notificationResult = await sendNotificationWithBalancePostgres({
          sql,
          telegramConfig,
          solapiConfig,
          orgId: student.org_id,
          orgName: student.org_name,
          studentId,
          studentName: student.name,
          type: 'study_out',
          recipientPhone: student.parent_phone,
          message: outMessage,
          templateVariables: { 시간: timeStr },
        });

        if (!notificationResult.success) {
          console.log(`[NotificationQueue] Out notification failed (${notificationResult.error}): ${student.name}`);
        }

        await sql`
          UPDATE notification_queue
          SET status = 'completed', processed_at = NOW()
          WHERE id = ${notification.id}
        `;
        console.log(`[NotificationQueue] Out completed: ${student.name}`);
      }

      else if (notification.type === 'return') {
        // 복귀 처리 - 외출 기록 확인
        const outingRecord = await sql`
          SELECT * FROM outing_records
          WHERE student_id = ${studentId}
            AND return_time IS NULL
            AND date = CURRENT_DATE
          ORDER BY outing_time DESC
          LIMIT 1
        `;

        if (outingRecord.length === 0) {
          if (notification.retry_count >= 5) {
            await sql`
              UPDATE notification_queue
              SET status = 'failed', error_message = 'No outing found after 5 retries'
              WHERE id = ${notification.id}
            `;
          } else {
            await sql`
              UPDATE notification_queue
              SET retry_count = retry_count + 1
              WHERE id = ${notification.id}
            `;
          }
          continue;
        }

        await sql`
          UPDATE notification_queue SET status = 'processing' WHERE id = ${notification.id}
        `;

        await sql`
          UPDATE outing_records SET return_time = NOW(), status = 'returned' WHERE id = ${outingRecord[0].id}
        `;

        const returnMessage = `${student.org_name}입니다, 학부모님.\n\n${student.name} 학생이 ${timeStr}에 외출에서 복귀했습니다.`;

        // 🔴 잔액 확인 및 차감 (shared 라이브러리 사용)
        const telegramConfig: TelegramConfig = {
          botToken: env.TELEGRAM_BOT_TOKEN,
          chatId: env.TELEGRAM_CHAT_ID,
        };
        const solapiConfig: SolapiConfig = {
          apiKey: env.SOLAPI_API_KEY,
          apiSecret: env.SOLAPI_API_SECRET,
          pfId: env.SOLAPI_PF_ID,
          senderPhone: env.SOLAPI_SENDER_PHONE,
        };

        const notificationResult = await sendNotificationWithBalancePostgres({
          sql,
          telegramConfig,
          solapiConfig,
          orgId: student.org_id,
          orgName: student.org_name,
          studentId,
          studentName: student.name,
          type: 'study_return',
          recipientPhone: student.parent_phone,
          message: returnMessage,
          templateVariables: { 시간: timeStr },
        });

        if (!notificationResult.success) {
          console.log(`[NotificationQueue] Return notification failed (${notificationResult.error}): ${student.name}`);
        }

        await sql`
          UPDATE notification_queue
          SET status = 'completed', processed_at = NOW()
          WHERE id = ${notification.id}
        `;
        console.log(`[NotificationQueue] Return completed: ${student.name}`);
      }

      // ============================================================
      // 과제 생성 알림 (assignment_new)
      // ============================================================
      else if (notification.type === 'assignment_new') {
        await sql`
          UPDATE notification_queue SET status = 'processing' WHERE id = ${notification.id}
        `;

        const payload = notification.payload as {
          student_id: string;
          class_id?: string;
          class_name?: string;
          title: string;
          due_date: string;
          description?: string;
        };

        const assignmentMessage = `${student.org_name}입니다, 학부모님.\n\n새 과제가 등록되었습니다.\n\n📚 수업: ${payload.class_name || '-'}\n📝 과제: ${payload.title}\n📅 마감일: ${payload.due_date}\n\n과제 제출 잊지 마세요!`;

        const telegramConfig: TelegramConfig = {
          botToken: env.TELEGRAM_BOT_TOKEN,
          chatId: env.TELEGRAM_CHAT_ID,
        };
        const solapiConfig: SolapiConfig = {
          apiKey: env.SOLAPI_API_KEY,
          apiSecret: env.SOLAPI_API_SECRET,
          pfId: env.SOLAPI_PF_ID,
          senderPhone: env.SOLAPI_SENDER_PHONE,
        };

        const notificationResult = await sendNotificationWithBalancePostgres({
          sql,
          telegramConfig,
          solapiConfig,
          orgId: student.org_id,
          orgName: student.org_name,
          studentId,
          studentName: student.name,
          type: 'assignment_new',
          recipientPhone: student.parent_phone,
          message: assignmentMessage,
          templateVariables: {
            기관명: student.org_name,
            학생명: student.name,
            과제: payload.title,
            마감일: payload.due_date,
          },
        });

        if (!notificationResult.success) {
          console.log(`[NotificationQueue] Assignment notification failed (${notificationResult.error}): ${student.name}`);
        }

        await sql`
          UPDATE notification_queue
          SET status = 'completed', processed_at = NOW()
          WHERE id = ${notification.id}
        `;
        console.log(`[NotificationQueue] Assignment_new completed: ${student.name} - ${payload.title}`);
      }

      // ============================================================
      // 시험 결과 알림 (exam_result)
      // ============================================================
      else if (notification.type === 'exam_result') {
        await sql`
          UPDATE notification_queue SET status = 'processing' WHERE id = ${notification.id}
        `;

        const payload = notification.payload as {
          student_id: string;
          exam_id?: string;
          exam_title: string;
          score: number;
          total_score: number;
        };

        const scoreStr = `${payload.score}/${payload.total_score}점`;
        const examMessage = `${student.org_name}입니다, 학부모님.\n\n${student.name} 학생의 시험 결과를 안내드립니다.\n\n${payload.exam_title}: ${scoreStr}\n\n열심히 준비한 만큼 좋은 결과로 이어지길 바랍니다. 궁금하신 점은 편하게 연락 주세요!`;

        const telegramConfig: TelegramConfig = {
          botToken: env.TELEGRAM_BOT_TOKEN,
          chatId: env.TELEGRAM_CHAT_ID,
        };
        const solapiConfig: SolapiConfig = {
          apiKey: env.SOLAPI_API_KEY,
          apiSecret: env.SOLAPI_API_SECRET,
          pfId: env.SOLAPI_PF_ID,
          senderPhone: env.SOLAPI_SENDER_PHONE,
        };

        const notificationResult = await sendNotificationWithBalancePostgres({
          sql,
          telegramConfig,
          solapiConfig,
          orgId: student.org_id,
          orgName: student.org_name,
          studentId,
          studentName: student.name,
          type: 'exam_result',
          recipientPhone: student.parent_phone,
          message: examMessage,
          templateVariables: {
            기관명: student.org_name,
            학생명: student.name,
            시험명: payload.exam_title,
            점수: scoreStr,
          },
        });

        if (!notificationResult.success) {
          console.log(`[NotificationQueue] Exam result notification failed (${notificationResult.error}): ${student.name}`);
        }

        await sql`
          UPDATE notification_queue
          SET status = 'completed', processed_at = NOW()
          WHERE id = ${notification.id}
        `;
        console.log(`[NotificationQueue] Exam_result completed: ${student.name} - ${payload.exam_title}`);
      }

      // ============================================================
      // 수업일지 알림 (lesson_report)
      // ============================================================
      else if (notification.type === 'lesson_report') {
        await sql`
          UPDATE notification_queue SET status = 'processing' WHERE id = ${notification.id}
        `;

        const payload = notification.payload as {
          student_id: string;
          lesson_id?: string;
          class_name?: string;
          오늘수업?: string;
          학습포인트?: string;
          선생님코멘트?: string;
          원장님코멘트?: string;
          숙제?: string;
          복습팁?: string;
        };

        const lessonMessage = `${student.org_name}입니다, 학부모님.\n\n${student.name} 학생의 수업 리포트입니다.\n\n📚 오늘 수업: ${payload.오늘수업 || '-'}\n💡 학습 포인트: ${payload.학습포인트 || '-'}\n👨‍🏫 선생님 코멘트: ${payload.선생님코멘트 || '-'}\n👔 원장님 코멘트: ${payload.원장님코멘트 || '-'}\n📝 숙제: ${payload.숙제 || '-'}\n📖 복습 팁: ${payload.복습팁 || '-'}\n\n오늘도 수고했어요!`;

        const telegramConfig: TelegramConfig = {
          botToken: env.TELEGRAM_BOT_TOKEN,
          chatId: env.TELEGRAM_CHAT_ID,
        };
        const solapiConfig: SolapiConfig = {
          apiKey: env.SOLAPI_API_KEY,
          apiSecret: env.SOLAPI_API_SECRET,
          pfId: env.SOLAPI_PF_ID,
          senderPhone: env.SOLAPI_SENDER_PHONE,
        };

        const notificationResult = await sendNotificationWithBalancePostgres({
          sql,
          telegramConfig,
          solapiConfig,
          orgId: student.org_id,
          orgName: student.org_name,
          studentId,
          studentName: student.name,
          type: 'lesson_report',
          recipientPhone: student.parent_phone,
          message: lessonMessage,
          templateVariables: {
            기관명: student.org_name,
            학생명: student.name,
            오늘수업: payload.오늘수업 || '-',
            학습포인트: payload.학습포인트 || '-',
            선생님코멘트: payload.선생님코멘트 || '-',
            원장님코멘트: payload.원장님코멘트 || '-',
            숙제: payload.숙제 || '-',
            복습팁: payload.복습팁 || '-',
          },
        });

        if (!notificationResult.success) {
          console.log(`[NotificationQueue] Lesson report notification failed (${notificationResult.error}): ${student.name}`);
        }

        await sql`
          UPDATE notification_queue
          SET status = 'completed', processed_at = NOW()
          WHERE id = ${notification.id}
        `;
        console.log(`[NotificationQueue] Lesson_report completed: ${student.name}`);
      }

      // ============================================================
      // 알 수 없는 타입
      // ============================================================
      else {
        console.log(`[NotificationQueue] Unknown type: ${notification.type}`);
        await sql`
          UPDATE notification_queue
          SET status = 'failed', error_message = 'Unknown notification type'
          WHERE id = ${notification.id}
        `;
      }

    } catch (error) {
      console.error(`[NotificationQueue] Error processing ${notification.id}:`, error);

      const newRetryCount = notification.retry_count + 1;
      const newStatus = newRetryCount >= 5 ? 'failed' : 'pending';

      await sql`
        UPDATE notification_queue
        SET
          status = ${newStatus},
          retry_count = ${newRetryCount},
          error_message = ${String(error)}
        WHERE id = ${notification.id}
      `;
    }
  }

  console.log('[NotificationQueue] Processing complete');
}
