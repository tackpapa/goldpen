/**
 * GoldPen Attendance Queue Consumer
 * Queue에서 출결 체크 작업을 받아서 처리
 *
 * 작업 타입:
 * - check_academy: 학원/공부방 출결 체크
 * - check_study: 독서실 출결 체크
 * - check_class: 강의 출결 체크
 * - daily_report: 일일 학습 리포트 발송
 * - assignment_remind: 과제 마감 알림
 * - process_commute_absent: 독서실 결석 처리
 */

import postgres from "postgres";

interface Env {
  HYPERDRIVE_DB: Hyperdrive;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  KAKAO_ALIMTALK_API_KEY?: string;
  KAKAO_ALIMTALK_SECRET_KEY?: string;
  KAKAO_ALIMTALK_SENDER_KEY?: string;
  TIMEZONE: string;
}

// Queue 메시지 타입
interface AttendanceMessage {
  type: 'check_academy' | 'check_study' | 'check_class' | 'daily_report' | 'assignment_remind' | 'process_commute_absent';
  orgId: string;
  orgName: string;
  orgType: string;
  weekday: WeekdayName;
  todayDate: string;
  nowMinutes: number;
  timestamp: number;
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

// 기본 메시지 템플릿 (통합)
const DEFAULT_TEMPLATES: Record<string, string> = {
  // 통합 출결 알림
  'late': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 예정 시간({{예정시간}})이 지났는데 아직 도착하지 않았습니다. 확인 부탁드립니다.',
  'absent': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 오늘 예정된 일정에 출석하지 않아 결석 처리되었습니다. 사유 확인이 필요하시면 연락 부탁드립니다.',
  // 기타 알림
  'daily_report': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생의 {{날짜}} 학습 현황을 전해드립니다.\n\n오늘 총 {{총학습시간}} 동안 열심히 공부했습니다. 꾸준히 노력하는 모습이 대견합니다!',
  'assignment_remind': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생의 과제 마감일이 다가왔습니다.\n\n과제: {{과제명}}\n마감일: {{마감일}}\n\n제출 전 한 번 더 검토해 보도록 안내해 주시면 감사하겠습니다.',
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
            case 'daily_report':
              await processDailyReport(sql, orgId, orgName, todayDate, env);
              break;
            case 'assignment_remind':
              await processAssignmentReminder(sql, orgId, orgName, todayDate, env);
              break;
            case 'process_commute_absent':
              await processCommuteAbsence(sql, orgId, orgName, weekday, todayDate, env);
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

  // HTTP handler (for status check)
  async fetch(request: Request, env: Env): Promise<Response> {
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
          "assignment_remind",
          "process_commute_absent"
        ]
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

    if (!hasCheckin && nowMinutes > checkInMinutes) {
      const absentThreshold = checkOutMinutes || (checkInMinutes + 120);

      if (nowMinutes > absentThreshold) {
        const template = await getTemplate(sql, orgId, 'absent');
        const message = fillTemplate(template, {
          '기관명': orgName,
          '학생명': schedule.student_name,
          '예정시간': schedule.check_out_time || schedule.check_in_time,
        });
        await sendNotification(sql, env, {
          orgId,
          studentId: schedule.student_id,
          studentName: schedule.student_name,
          type: "absent",
          targetDate: todayDate,
          scheduledTime: schedule.check_out_time || schedule.check_in_time,
          recipientPhone: schedule.parent_phone,
          message,
        });
      } else if (nowMinutes > checkInMinutes + 10) {
        const template = await getTemplate(sql, orgId, 'late');
        const message = fillTemplate(template, {
          '기관명': orgName,
          '학생명': schedule.student_name,
          '예정시간': schedule.check_in_time,
        });
        await sendNotification(sql, env, {
          orgId,
          studentId: schedule.student_id,
          studentName: schedule.student_name,
          type: "late",
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

    if (!hasCheckin && nowMinutes > checkInMinutes) {
      if (checkOutMinutes && nowMinutes > checkOutMinutes) {
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

        const template = await getTemplate(sql, orgId, 'absent');
        const message = fillTemplate(template, {
          '기관명': orgName,
          '학생명': schedule.student_name,
          '예정시간': schedule.check_out_time,
        });
        await sendNotification(sql, env, {
          orgId,
          studentId: schedule.student_id,
          studentName: schedule.student_name,
          type: "absent",
          targetDate: todayDate,
          scheduledTime: schedule.check_out_time,
          recipientPhone: schedule.parent_phone,
          message,
        });
      } else {
        const template = await getTemplate(sql, orgId, 'late');
        const message = fillTemplate(template, {
          '기관명': orgName,
          '학생명': schedule.student_name,
          '예정시간': schedule.check_in_time,
        });
        await sendNotification(sql, env, {
          orgId,
          studentId: schedule.student_id,
          studentName: schedule.student_name,
          type: "late",
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

      // 수업 종료 시간이 지났으면 → 결석 처리
      if (nowMinutes > endMinutes) {
        // 이미 결석이면 건너뜀
        if (currentStatus === 'absent') continue;

        try {
          if (enrollment.attendance_id) {
            // 기존 레코드(late)가 있으면 absent로 UPDATE
            await sql`
              UPDATE attendance SET status = 'absent', updated_at = NOW()
              WHERE id = ${enrollment.attendance_id}
            `;
            console.log(`[Class] Updated late→absent for ${enrollment.student_name} in ${cls.class_name}`);
          } else {
            // 레코드가 없으면 INSERT
            await sql`
              INSERT INTO attendance (org_id, class_id, student_id, date, status)
              VALUES (${orgId}, ${cls.class_id}, ${enrollment.student_id}, ${todayDate}::date, 'absent')
            `;
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
          studentId: enrollment.student_id,
          studentName: enrollment.student_name,
          type: "absent",
          classId: cls.class_id,
          targetDate: todayDate,
          scheduledTime: todaySchedule.end_time,
          recipientPhone: enrollment.parent_phone,
          message,
        });
      }
      // 시작시간+10분 지났으면 → 지각 처리
      else if (nowMinutes > startMinutes + 10) {
        // 이미 지각이면 건너뜀
        if (currentStatus === 'late') continue;

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

        const template = await getTemplate(sql, orgId, 'late');
        const message = fillTemplate(template, {
          '기관명': orgName,
          '학생명': enrollment.student_name,
          '수업명': cls.class_name,
          '예정시간': todaySchedule.start_time,
        });
        await sendNotification(sql, env, {
          orgId,
          studentId: enrollment.student_id,
          studentName: enrollment.student_name,
          type: "late",
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
 * 일일 학습 리포트 발송 (단일 기관)
 */
async function processDailyReport(
  sql: postgres.Sql,
  orgId: string,
  orgName: string,
  todayDate: string,
  env: Env
): Promise<void> {
  const attendanceRecords = await sql`
    SELECT DISTINCT
      al.student_id,
      s.name as student_name,
      s.parent_phone,
      al.check_in_time,
      al.check_out_time,
      COALESCE(
        EXTRACT(EPOCH FROM (al.check_out_time - al.check_in_time)) / 60,
        0
      )::int as study_minutes
    FROM attendance_logs al
    JOIN students s ON s.id = al.student_id
    WHERE al.org_id = ${orgId}
      AND al.check_in_time::date = ${todayDate}::date
      AND s.parent_phone IS NOT NULL
  `;

  for (const record of attendanceRecords) {
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
    });

    await sendNotification(sql, env, {
      orgId,
      studentId: record.student_id,
      studentName: record.student_name,
      type: "daily_report",
      targetDate: todayDate,
      recipientPhone: record.parent_phone,
      message,
    });
  }
}

/**
 * 과제 마감 알림 (단일 기관)
 */
async function processAssignmentReminder(
  sql: postgres.Sql,
  orgId: string,
  orgName: string,
  todayDate: string,
  env: Env
): Promise<void> {
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  const assignments = await sql`
    SELECT
      h.id as homework_id,
      h.title,
      h.due_date,
      h.class_id,
      c.name as class_name,
      ce.student_id,
      ce.student_name,
      s.parent_phone,
      (
        SELECT COUNT(*) FROM homework_submissions hs
        WHERE hs.homework_id = h.id
          AND hs.student_id = ce.student_id
      ) as has_submitted
    FROM homework h
    JOIN classes c ON c.id = h.class_id
    JOIN class_enrollments ce ON ce.class_id = h.class_id AND ce.status = 'active'
    JOIN students s ON s.id = ce.student_id
    WHERE c.org_id = ${orgId}
      AND h.due_date::date = ${tomorrowStr}::date
      AND h.status = 'active'
  `;

  for (const assignment of assignments) {
    if (Number(assignment.has_submitted) > 0) continue;

    const template = await getTemplate(sql, orgId, 'assignment_remind');
    const message = fillTemplate(template, {
      '기관명': orgName,
      '학생명': assignment.student_name,
      '과제명': assignment.title,
      '마감일': `${assignment.due_date} (내일)`,
    });

    await sendNotification(sql, env, {
      orgId,
      studentId: assignment.student_id,
      studentName: assignment.student_name,
      type: "assignment_remind",
      classId: assignment.class_id,
      targetDate: todayDate,
      recipientPhone: assignment.parent_phone,
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
        studentId: student.student_id,
        studentName: student.student_name,
        type: "absent",
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
  | "assignment_remind";

interface NotificationParams {
  orgId: string;
  studentId: string;
  studentName: string;
  type: NotificationType;
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
    studentId,
    studentName,
    type,
    classId,
    targetDate,
    scheduledTime,
    recipientPhone,
    message,
  } = params;

  try {
    const existing = await sql`
      SELECT id FROM notification_logs
      WHERE org_id = ${orgId}
        AND student_id = ${studentId}
        AND type = ${type}
        AND target_date = ${targetDate}::date
        ${classId ? sql`AND class_id = ${classId}` : sql`AND class_id IS NULL`}
      LIMIT 1
    `;

    if (existing.length > 0) {
      console.log(`[Notification] Skipping duplicate: ${type} for ${studentName}`);
      return;
    }

    await sql`
      INSERT INTO notification_logs (
        org_id, student_id, type, class_id, target_date,
        scheduled_time, recipient_phone, message, status
      ) VALUES (
        ${orgId}, ${studentId}, ${type}, ${classId || null}, ${targetDate}::date,
        ${scheduledTime ? sql`${scheduledTime}::time` : sql`NULL`}, ${recipientPhone || null}, ${message}, 'sent'
      )
    `;

    console.log(`[Notification] Recorded: ${type} for ${studentName}`);

    if (recipientPhone) {
      const templateCode = type.includes('late') ? 'GOLDPEN_LATE_001' : 'GOLDPEN_ABSENT_001';
      await sendKakaoAlimtalk(env, recipientPhone, message, templateCode);
    }
  } catch (error) {
    console.error(`[Notification] Error for ${studentName}:`, error);

    try {
      await sql`
        INSERT INTO notification_logs (
          org_id, student_id, type, class_id, target_date,
          scheduled_time, recipient_phone, message, status, error_message
        ) VALUES (
          ${orgId}, ${studentId}, ${type}, ${classId || null}, ${targetDate}::date,
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
