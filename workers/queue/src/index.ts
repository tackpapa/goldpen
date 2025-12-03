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
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
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
  'late': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 등원 일정 시간({{예정시간}})이 지났는데 아직 도착하지 않았습니다. 확인 부탁드립니다.',
  'absent': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 오늘 등원 일정에 출석하지 않아 결석 처리되었습니다. 사유 확인이 필요하시면 연락 부탁드립니다.',
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

  // HTTP handler (for status check and test)
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 테스트 엔드포인트: /test?type=late|absent|daily_report|assignment_remind
    if (url.pathname === '/test' && request.method === 'GET') {
      const type = url.searchParams.get('type') || 'late';
      const studentName = url.searchParams.get('student') || '테스트학생';
      const orgName = url.searchParams.get('org') || '골드펜학원';
      const scheduledTime = url.searchParams.get('time') || '14:00';

      // 템플릿으로 메시지 생성
      let message = '';
      switch (type) {
        case 'late':
          message = fillTemplate(DEFAULT_TEMPLATES['late'], {
            '기관명': orgName,
            '학생명': studentName,
            '예정시간': scheduledTime,
          });
          break;
        case 'absent':
          message = fillTemplate(DEFAULT_TEMPLATES['absent'], {
            '기관명': orgName,
            '학생명': studentName,
            '예정시간': scheduledTime,
          });
          break;
        case 'daily_report':
          message = fillTemplate(DEFAULT_TEMPLATES['daily_report'], {
            '기관명': orgName,
            '학생명': studentName,
            '날짜': new Date().toISOString().split('T')[0],
            '총학습시간': '3시간 25분',
          });
          break;
        case 'assignment_remind':
          message = fillTemplate(DEFAULT_TEMPLATES['assignment_remind'], {
            '기관명': orgName,
            '학생명': studentName,
            '과제명': '수학 문제집 1-20번',
            '마감일': '2025-12-03 (내일)',
          });
          break;
        default:
          message = `[테스트] 알 수 없는 타입: ${type}`;
      }

      // 텔레그램으로 전송
      const telegramResult = await sendTelegram(env, `📱 알림톡 테스트 (${type})\n\n${message}`);

      return new Response(
        JSON.stringify({
          success: true,
          type,
          message,
          telegram: telegramResult,
          params: { studentName, orgName, scheduledTime },
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
          "assignment_remind",
          "process_commute_absent"
        ],
        testEndpoint: "/test?type=late|absent|daily_report|assignment_remind&student=이름&org=기관명&time=14:00"
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
          studentId: schedule.student_id,
          studentName: schedule.student_name,
          type: "absent",
          context: "academy",
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
      context: "study",
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
      context: "class",
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
        context: "commute",
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

// DB에 저장되는 실제 type (notification_logs_type_check constraint)
type DbNotificationType =
  | "study_late" | "study_absent"
  | "class_late" | "class_absent"
  | "academy_checkin" | "academy_checkout"
  | "study_checkin" | "study_checkout"
  | "study_out" | "study_return"
  | "lesson_report" | "exam_result" | "assignment_new";

// context에 따라 DB type 변환
function toDbNotificationType(type: NotificationType, context: 'class' | 'study' | 'academy' | 'commute'): DbNotificationType {
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
    return 'lesson_report';
  }
  if (type === 'assignment_remind') {
    return 'assignment_new';
  }
  return 'study_late'; // fallback
}

interface NotificationParams {
  orgId: string;
  studentId: string;
  studentName: string;
  type: NotificationType;
  context: 'class' | 'study' | 'academy' | 'commute';
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

    await sql`
      INSERT INTO notification_logs (
        org_id, student_id, type, class_id, target_date,
        scheduled_time, recipient_phone, message, status
      ) VALUES (
        ${orgId}, ${studentId}, ${dbType}, ${classId || null}, ${targetDate}::date,
        ${scheduledTime ? sql`${scheduledTime}::time` : sql`NULL`}, ${recipientPhone || null}, ${message}, 'sent'
      )
    `;

    console.log(`[Notification] Recorded: ${dbType} for ${studentName}`);

    // 텔레그램으로 모니터링 알림 전송 (부모님께 가는 메시지 그대로 전송)
    await sendTelegram(env, message);

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
