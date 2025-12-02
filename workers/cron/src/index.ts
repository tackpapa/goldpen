/**
 * GoldPen Notification Cron Worker
 * 매 1분마다 실행되어 다양한 알림 발송
 *
 * 출결 알림 (매 분 체크):
 * - 독서실: 지각/결석 알림 (study_late, study_absent)
 * - 학원: 지각/결석 알림 (academy_late, academy_absent)
 * - 강의: 지각/결석 알림 (class_late, class_absent)
 *
 * 학습 리포트 (매일 21:00 발송):
 * - 당일 학습 현황 리포트 (daily_report)
 *
 * 과제 알림 (매일 09:00 발송):
 * - 마감 D-1일 과제 알림 (assignment_remind)
 */

import postgres from "postgres";

interface Env {
  HYPERDRIVE_DB: Hyperdrive;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  // 카카오 알림톡 설정 (wrangler secret put으로 설정)
  KAKAO_ALIMTALK_API_KEY?: string;     // Solapi/NHN/Bizm API 키
  KAKAO_ALIMTALK_SECRET_KEY?: string;  // 시크릿 키
  KAKAO_ALIMTALK_SENDER_KEY?: string;  // 발신 프로필 키
  TIMEZONE: string;
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

// 한국 시간 기준 현재 시각 가져오기
function getKoreanTime(): Date {
  const now = new Date();
  // UTC를 KST로 변환 (+9시간)
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

// 시간 문자열을 분으로 변환 (HH:MM:SS 또는 HH:MM)
function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(":");
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return hours * 60 + minutes;
}

// 현재 시각을 분으로
function currentMinutes(koreanTime: Date): number {
  return koreanTime.getUTCHours() * 60 + koreanTime.getUTCMinutes();
}

// ============================================================
// 기본 메시지 템플릿 (설정에서 가져오지 못할 경우 fallback)
// ============================================================
const DEFAULT_TEMPLATES: Record<string, string> = {
  // 학원/공부방 전용
  'academy_late': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 예정 시간({{예정시간}})이 지났는데 아직 등원하지 않았습니다. 확인 부탁드립니다.',
  'academy_absent': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 오늘 등원하지 않아 결석 처리되었습니다. 사유 확인이 필요하시면 연락 부탁드립니다.',
  'academy_checkin': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 등원했습니다. 오늘도 열심히 공부하겠습니다!',
  'academy_checkout': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 하원했습니다. 오늘도 수고했어요! 안전하게 귀가하길 바랍니다.',
  // 독서실 전용
  'study_late': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 예정 시간({{예정시간}})이 지났는데 아직 입실하지 않았습니다. 확인 부탁드립니다.',
  'study_absent': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 오늘 독서실에 등원하지 않아 결석 처리되었습니다.',
  'study_checkin': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 입실했습니다. 오늘도 열심히 공부하겠습니다!',
  'study_checkout': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 퇴실했습니다. 오늘도 열심히 공부하고 갑니다.',
  // 수업 전용
  'class_late': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 아직 {{수업명}} 수업에 출석하지 않았습니다. (수업 시작: {{예정시간}})',
  'class_absent': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 오늘 {{수업명}} 수업에 출석하지 않아 결석 처리되었습니다.',
  // 일일 리포트
  'daily_report': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생의 {{날짜}} 학습 현황을 전해드립니다.\n\n오늘 총 {{총학습시간}} 동안 열심히 공부했습니다. 꾸준히 노력하는 모습이 대견합니다!',
  // 과제 관련
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

// 조직 설정에서 템플릿 가져오기 (캐시 사용)
const templateCache: Record<string, { templates: Record<string, string>; timestamp: number }> = {}
const CACHE_TTL = 5 * 60 * 1000 // 5분 캐시

async function getOrgTemplates(
  sql: postgres.Sql,
  orgId: string
): Promise<Record<string, string>> {
  // 캐시 확인
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
      // 캐시 저장
      templateCache[orgId] = { templates, timestamp: Date.now() }
      return templates
    }
  } catch (error) {
    console.error(`[Templates] Failed to get templates for org ${orgId}:`, error)
  }
  return {}
}

// 템플릿 가져오기 (설정 우선, fallback은 기본 템플릿)
async function getTemplate(
  sql: postgres.Sql,
  orgId: string,
  templateKey: string
): Promise<string> {
  const orgTemplates = await getOrgTemplates(sql, orgId)
  return orgTemplates[templateKey] || DEFAULT_TEMPLATES[templateKey] || ''
}

export default {
  // Scheduled handler - 크론 트리거
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log(`[Cron] Attendance check started at ${new Date().toISOString()}`);

    const sql = postgres(env.HYPERDRIVE_DB.connectionString);

    try {
      const koreanTime = getKoreanTime();
      const todayWeekday = WEEKDAYS[koreanTime.getUTCDay()];
      const todayDate = koreanTime.toISOString().split("T")[0]; // YYYY-MM-DD
      const nowMinutes = currentMinutes(koreanTime);

      const nowHour = koreanTime.getUTCHours();
      const nowMinute = koreanTime.getUTCMinutes();

      console.log(
        `[Cron] Korean time: ${koreanTime.toISOString()}, weekday: ${todayWeekday}, hour: ${nowHour}, minute: ${nowMinute}, nowMinutes: ${nowMinutes}`
      );

      // 1. 학원/공부방 지각/결석 체크 (매 분)
      await checkAcademyAttendance(sql, todayWeekday, todayDate, nowMinutes, env);

      // 2. 독서실 지각/결석 체크 (매 분)
      await checkStudyRoomAttendance(sql, todayWeekday, todayDate, nowMinutes, env);

      // 3. 강의 지각/결석 체크 (매 분)
      await checkClassAttendance(sql, todayWeekday, todayDate, nowMinutes, env);

      // 4. 일일 학습 리포트 발송 (매일 21:00 KST)
      if (nowHour === 21 && nowMinute === 0) {
        console.log(`[Cron] Sending daily reports...`);
        await sendDailyReports(sql, todayDate, env);
      }

      // 5. 과제 마감 알림 발송 (매일 09:00 KST)
      if (nowHour === 9 && nowMinute === 0) {
        console.log(`[Cron] Sending assignment reminders...`);
        await sendAssignmentReminders(sql, todayDate, env);
      }

      // 6. 독서실 결석 처리 (매일 23:50 KST - 밤 12시 전에 결석 처리)
      if (nowHour === 23 && nowMinute === 50) {
        console.log(`[Cron] Processing commute absences...`);
        await processCommuteAbsences(sql, todayWeekday, todayDate, env);
      }

      console.log(`[Cron] All checks completed`);
    } catch (error) {
      console.error(`[Cron] Error:`, error);
    } finally {
      await sql.end();
    }
  },

  // HTTP handler (for testing)
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "POST" && new URL(request.url).pathname === "/test") {
      // 수동 테스트용
      const sql = postgres(env.HYPERDRIVE_DB.connectionString);

      try {
        const koreanTime = getKoreanTime();
        const todayWeekday = WEEKDAYS[koreanTime.getUTCDay()];
        const todayDate = koreanTime.toISOString().split("T")[0];
        const nowMinutes = currentMinutes(koreanTime);

        const url = new URL(request.url);
        const testType = url.searchParams.get("type");

        // 특정 타입만 테스트
        if (testType === "academy") {
          await checkAcademyAttendance(sql, todayWeekday, todayDate, nowMinutes, env);
        } else if (testType === "study") {
          await checkStudyRoomAttendance(sql, todayWeekday, todayDate, nowMinutes, env);
        } else if (testType === "class") {
          await checkClassAttendance(sql, todayWeekday, todayDate, nowMinutes, env);
        } else if (testType === "daily_report") {
          await sendDailyReports(sql, todayDate, env);
        } else if (testType === "assignment_remind") {
          await sendAssignmentReminders(sql, todayDate, env);
        } else if (testType === "commute_absent") {
          await processCommuteAbsences(sql, todayWeekday, todayDate, env);
        } else {
          // 전체 테스트
          await checkAcademyAttendance(sql, todayWeekday, todayDate, nowMinutes, env);
          await checkStudyRoomAttendance(sql, todayWeekday, todayDate, nowMinutes, env);
          await checkClassAttendance(sql, todayWeekday, todayDate, nowMinutes, env);
        }

        return new Response(JSON.stringify({
          success: true,
          time: koreanTime.toISOString(),
          testType: testType || "all"
        }), {
          headers: { "Content-Type": "application/json" },
        });
      } finally {
        await sql.end();
      }
    }

    return new Response(
      JSON.stringify({
        name: "GoldPen Notification Cron",
        status: "running",
        nextRun: "every minute",
        jobs: [
          "academy_late/absent (매 분)",
          "study_late/absent (매 분)",
          "class_late/absent (매 분)",
          "daily_report (매일 21:00 KST)",
          "assignment_remind (매일 09:00 KST)",
          "commute_absent (매일 23:50 KST - 독서실 결석 처리)"
        ]
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  },
};

/**
 * 학원/공부방 출결 체크
 * - 기관 타입: academy, learning_center
 * - commute_schedules 기반 체크
 */
async function checkAcademyAttendance(
  sql: postgres.Sql,
  weekday: WeekdayName,
  todayDate: string,
  nowMinutes: number,
  env: Env
): Promise<void> {
  console.log(`[Academy] Checking for weekday=${weekday}, nowMinutes=${nowMinutes}`);

  // 학원/공부방 타입 기관의 commute_schedules 조회
  const schedules = await sql`
    SELECT
      cs.id,
      cs.org_id,
      cs.student_id,
      cs.check_in_time,
      cs.check_out_time,
      s.name as student_name,
      s.parent_phone,
      o.name as org_name,
      o.type as org_type,
      (
        SELECT COUNT(*) FROM attendance_logs al
        WHERE al.student_id = cs.student_id
          AND al.check_in_time::date = ${todayDate}::date
      ) as has_checkin
    FROM commute_schedules cs
    JOIN students s ON s.id = cs.student_id
    JOIN organizations o ON o.id = cs.org_id
    WHERE cs.weekday = ${weekday}
      AND cs.check_in_time IS NOT NULL
      AND o.type IN ('academy', 'learning_center')
  `;

  console.log(`[Academy] Found ${schedules.length} schedules for today`);

  for (const schedule of schedules) {
    const checkInMinutes = timeToMinutes(schedule.check_in_time);
    const checkOutMinutes = schedule.check_out_time
      ? timeToMinutes(schedule.check_out_time)
      : null;
    const hasCheckin = Number(schedule.has_checkin) > 0;

    // 지각 체크: 등원 시간 경과 + 체크인 없음
    if (!hasCheckin && nowMinutes > checkInMinutes) {
      // 결석 체크: 하원 시간도 경과 (또는 등원 예정 시간 + 2시간 경과)
      const absentThreshold = checkOutMinutes || (checkInMinutes + 120);

      if (nowMinutes > absentThreshold) {
        // 설정에서 템플릿 가져오기
        const template = await getTemplate(sql, schedule.org_id, 'academy_absent');
        const message = fillTemplate(template, {
          '기관명': schedule.org_name,
          '학생명': schedule.student_name,
          '예정시간': schedule.check_out_time || schedule.check_in_time,
        });
        await sendNotification(sql, env, {
          orgId: schedule.org_id,
          studentId: schedule.student_id,
          studentName: schedule.student_name,
          type: "academy_absent",
          targetDate: todayDate,
          scheduledTime: schedule.check_out_time || schedule.check_in_time,
          recipientPhone: schedule.parent_phone,
          message,
        });
      } else {
        // 지각 알림 (등원 시간 + 10분 경과 후)
        if (nowMinutes > checkInMinutes + 10) {
          // 설정에서 템플릿 가져오기
          const template = await getTemplate(sql, schedule.org_id, 'academy_late');
          const message = fillTemplate(template, {
            '기관명': schedule.org_name,
            '학생명': schedule.student_name,
            '예정시간': schedule.check_in_time,
          });
          await sendNotification(sql, env, {
            orgId: schedule.org_id,
            studentId: schedule.student_id,
            studentName: schedule.student_name,
            type: "academy_late",
            targetDate: todayDate,
            scheduledTime: schedule.check_in_time,
            recipientPhone: schedule.parent_phone,
            message,
          });
        }
      }
    }
  }
}

/**
 * 독서실 출결 체크
 */
async function checkStudyRoomAttendance(
  sql: postgres.Sql,
  weekday: WeekdayName,
  todayDate: string,
  nowMinutes: number,
  env: Env
): Promise<void> {
  console.log(`[StudyRoom] Checking for weekday=${weekday}, nowMinutes=${nowMinutes}`);

  // commute_schedules에서 오늘 요일에 해당하는 학생 일정 조회
  // attendance_logs에서 오늘 체크인 기록이 있는지 확인
  const schedules = await sql`
    SELECT
      cs.id,
      cs.org_id,
      cs.student_id,
      cs.check_in_time,
      cs.check_out_time,
      s.name as student_name,
      s.parent_phone,
      o.name as org_name,
      (
        SELECT COUNT(*) FROM attendance_logs al
        WHERE al.student_id = cs.student_id
          AND al.check_in_time::date = ${todayDate}::date
      ) as has_checkin
    FROM commute_schedules cs
    JOIN students s ON s.id = cs.student_id
    JOIN organizations o ON o.id = cs.org_id
    WHERE cs.weekday = ${weekday}
      AND cs.check_in_time IS NOT NULL
      AND o.type = 'study_cafe'
  `;

  console.log(`[StudyRoom] Found ${schedules.length} schedules for today`);

  for (const schedule of schedules) {
    const checkInMinutes = timeToMinutes(schedule.check_in_time);
    const checkOutMinutes = schedule.check_out_time
      ? timeToMinutes(schedule.check_out_time)
      : null;
    const hasCheckin = Number(schedule.has_checkin) > 0;

    // 지각 체크: 등원 시간 경과 + 체크인 없음
    if (!hasCheckin && nowMinutes > checkInMinutes) {
      // 결석 체크: 하원 시간도 경과
      if (checkOutMinutes && nowMinutes > checkOutMinutes) {
        // 1. attendance_logs 테이블에 결석 레코드 삽입 (source: 'cron_absent')
        // 독서실의 경우 attendance_logs에 기록
        try {
          await sql`
            INSERT INTO attendance_logs (org_id, student_id, check_in_time, check_out_time, duration_minutes, source)
            VALUES (
              ${schedule.org_id},
              ${schedule.student_id},
              ${todayDate}::date + TIME '00:00:00',
              ${todayDate}::date + TIME '00:00:00',
              0,
              'cron_absent'
            )
            ON CONFLICT DO NOTHING
          `;
          console.log(`[StudyRoom] Marked absent: ${schedule.student_name}`);
        } catch (insertError) {
          console.error(`[StudyRoom] Failed to insert absence record:`, insertError);
        }

        // 2. 설정에서 템플릿 가져오기
        const template = await getTemplate(sql, schedule.org_id, 'study_absent');
        const message = fillTemplate(template, {
          '기관명': schedule.org_name,
          '학생명': schedule.student_name,
          '예정시간': schedule.check_out_time,
        });
        await sendNotification(sql, env, {
          orgId: schedule.org_id,
          studentId: schedule.student_id,
          studentName: schedule.student_name,
          type: "study_absent",
          targetDate: todayDate,
          scheduledTime: schedule.check_out_time,
          recipientPhone: schedule.parent_phone,
          message,
        });
      } else {
        // 지각 알림
        const template = await getTemplate(sql, schedule.org_id, 'study_late');
        const message = fillTemplate(template, {
          '기관명': schedule.org_name,
          '학생명': schedule.student_name,
          '예정시간': schedule.check_in_time,
        });
        await sendNotification(sql, env, {
          orgId: schedule.org_id,
          studentId: schedule.student_id,
          studentName: schedule.student_name,
          type: "study_late",
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
 * 강의 출결 체크
 */
async function checkClassAttendance(
  sql: postgres.Sql,
  weekday: WeekdayName,
  todayDate: string,
  nowMinutes: number,
  env: Env
): Promise<void> {
  console.log(`[Class] Checking for weekday=${weekday}, nowMinutes=${nowMinutes}`);

  // 오늘 요일에 수업이 있는 반 조회
  // classes.schedule은 JSONB: [{day: "monday", start_time: "14:00", end_time: "16:00"}]
  const classes = await sql`
    SELECT
      c.id as class_id,
      c.org_id,
      c.name as class_name,
      c.schedule,
      o.name as org_name
    FROM classes c
    JOIN organizations o ON o.id = c.org_id
    WHERE c.status = 'active'
      AND c.schedule IS NOT NULL
      AND jsonb_array_length(c.schedule) > 0
  `;

  console.log(`[Class] Found ${classes.length} active classes`);

  for (const cls of classes) {
    // schedule에서 오늘 요일에 해당하는 시간 찾기
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

    // 아직 수업 시작 전이면 스킵
    if (nowMinutes <= startMinutes) continue;

    // 이 반에 등록된 학생들 조회
    const enrollments = await sql`
      SELECT
        ce.student_id,
        ce.student_name,
        s.parent_phone,
        (
          SELECT COUNT(*) FROM attendance a
          WHERE a.class_id = ${cls.class_id}
            AND a.student_id = ce.student_id
            AND a.date = ${todayDate}::date
            AND a.status IN ('present', 'late')
        ) as has_attendance
      FROM class_enrollments ce
      LEFT JOIN students s ON s.id = ce.student_id
      WHERE ce.class_id = ${cls.class_id}
        AND ce.status = 'active'
    `;

    for (const enrollment of enrollments) {
      const hasAttendance = Number(enrollment.has_attendance) > 0;

      if (!hasAttendance) {
        // 결석 체크: 수업 종료 시간 경과
        if (nowMinutes > endMinutes) {
          // 1. attendance 테이블에 결석 레코드 삽입 (중복 체크 후)
          try {
            // 먼저 이미 존재하는지 확인
            const existing = await sql`
              SELECT id FROM attendance
              WHERE org_id = ${cls.org_id}
                AND class_id = ${cls.class_id}
                AND student_id = ${enrollment.student_id}
                AND date = ${todayDate}::date
              LIMIT 1
            `;

            if (existing.length === 0) {
              await sql`
                INSERT INTO attendance (org_id, class_id, student_id, date, status)
                VALUES (
                  ${cls.org_id},
                  ${cls.class_id},
                  ${enrollment.student_id},
                  ${todayDate}::date,
                  'absent'
                )
              `;
              console.log(`[Class] Marked absent: ${enrollment.student_name} for ${cls.class_name}`);
            } else {
              console.log(`[Class] Already has attendance: ${enrollment.student_name} for ${cls.class_name}`);
            }
          } catch (insertError) {
            console.error(`[Class] Failed to insert absence record:`, insertError);
          }

          // 2. 알림 발송 (기존 로직)
          const template = await getTemplate(sql, cls.org_id, 'class_absent');
          const message = fillTemplate(template, {
            '기관명': cls.org_name,
            '학생명': enrollment.student_name,
            '수업명': cls.class_name,
            '예정시간': todaySchedule.end_time,
          });
          await sendNotification(sql, env, {
            orgId: cls.org_id,
            studentId: enrollment.student_id,
            studentName: enrollment.student_name,
            type: "class_absent",
            classId: cls.class_id,
            targetDate: todayDate,
            scheduledTime: todaySchedule.end_time,
            recipientPhone: enrollment.parent_phone,
            message,
          });
        } else {
          // 수업 중: 지각 처리 (수업 시작 후 10분 경과 시 지각 기록)
          if (nowMinutes > startMinutes + 10) {
            // attendance 테이블에 지각 레코드 삽입
            try {
              const existing = await sql`
                SELECT id FROM attendance
                WHERE org_id = ${cls.org_id}
                  AND class_id = ${cls.class_id}
                  AND student_id = ${enrollment.student_id}
                  AND date = ${todayDate}::date
                LIMIT 1
              `;

              if (existing.length === 0) {
                await sql`
                  INSERT INTO attendance (org_id, class_id, student_id, date, status)
                  VALUES (
                    ${cls.org_id},
                    ${cls.class_id},
                    ${enrollment.student_id},
                    ${todayDate}::date,
                    'late'
                  )
                `;
                console.log(`[Class] Marked late: ${enrollment.student_name} for ${cls.class_name}`);
              }
            } catch (insertError) {
              console.error(`[Class] Failed to insert late record:`, insertError);
            }

            // 지각 알림 발송
            const template = await getTemplate(sql, cls.org_id, 'class_late');
            const message = fillTemplate(template, {
              '기관명': cls.org_name,
              '학생명': enrollment.student_name,
              '수업명': cls.class_name,
              '예정시간': todaySchedule.start_time,
            });
            await sendNotification(sql, env, {
              orgId: cls.org_id,
              studentId: enrollment.student_id,
              studentName: enrollment.student_name,
              type: "class_late",
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
  }
}

// 알림 타입 정의
type NotificationType =
  | "academy_late" | "academy_absent"
  | "study_late" | "study_absent"
  | "class_late" | "class_absent"
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

/**
 * 알림 발송 (중복 체크 포함)
 */
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
    // 중복 체크 - 이미 같은 타입의 알림을 보냈는지
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
      console.log(
        `[Notification] Skipping duplicate: ${type} for ${studentName} on ${targetDate}`
      );
      return;
    }

    // 알림 기록 저장
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

    // 카카오 알림톡 발송
    if (recipientPhone) {
      const templateCode = type.includes('late') ? 'GOLDPEN_LATE_001' : 'GOLDPEN_ABSENT_001';
      await sendKakaoAlimtalk(env, recipientPhone, message, templateCode);
    } else {
      console.log(`[Notification] Skipping Kakao (no phone): ${message}`);
    }
  } catch (error) {
    console.error(`[Notification] Error for ${studentName}:`, error);

    // 에러 기록
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

// ============================================================
// 카카오 알림톡 발송
// ============================================================
//
// 메인 유틸리티: lib/messaging/kakao-alimtalk.ts
// 이 파일은 Cloudflare Worker 환경을 위한 경량 버전입니다.
//
// 환경 변수 설정 (wrangler secret):
// - KAKAO_ALIMTALK_API_KEY: 제공업체 API 키
// - KAKAO_ALIMTALK_SECRET_KEY: 시크릿 키
// - KAKAO_ALIMTALK_SENDER_KEY: 발신 프로필 키
//
// 제공업체 선택 (택 1):
// - Solapi (솔라피): https://solapi.com - 약 8원/건
// - NHN Cloud: https://nhncloud.com - 약 7.5원/건
// - Bizm (비즈엠): https://bizmsg.kr - 약 7원/건
//
// 템플릿 승인 필요:
// 1. 카카오 비즈니스 채널 개설
// 2. 알림톡 발신 프로필 등록
// 3. 템플릿 작성 및 승인 요청 (검수 1~3일)
// ============================================================

/**
 * 카카오 알림톡 발송 (Solapi 기준)
 */
async function sendKakaoAlimtalk(
  env: Env,
  phone: string,
  message: string,
  templateCode: string = 'GOLDPEN_LATE_001'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = env.KAKAO_ALIMTALK_API_KEY;
  const secretKey = env.KAKAO_ALIMTALK_SECRET_KEY;
  const senderKey = env.KAKAO_ALIMTALK_SENDER_KEY;

  // 설정이 없으면 로그만 출력 (개발 모드)
  if (!apiKey || !senderKey) {
    console.log(`[Kakao] Dev mode - Would send to ${phone}: ${message}`);
    return { success: true, messageId: `mock_${Date.now()}` };
  }

  try {
    // Solapi API 사용 (다른 제공업체로 변경 가능)
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
          to: phone.replace(/[^0-9]/g, ''),  // 하이픈 제거
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

/**
 * HMAC-SHA256 서명 생성 (Solapi 인증용)
 */
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

/**
 * 일일 학습 리포트 발송 (매일 21:00 KST)
 * - 오늘 출석한 학생들의 학습 현황 요약
 * - 학부모에게 발송
 */
async function sendDailyReports(
  sql: postgres.Sql,
  todayDate: string,
  env: Env
): Promise<void> {
  console.log(`[DailyReport] Generating reports for ${todayDate}`);

  // 오늘 출석 기록이 있는 학생들 조회
  const attendanceRecords = await sql`
    SELECT DISTINCT
      al.student_id,
      al.org_id,
      s.name as student_name,
      s.parent_phone,
      o.name as org_name,
      al.check_in_time,
      al.check_out_time,
      -- 오늘 총 학습 시간 (분)
      COALESCE(
        EXTRACT(EPOCH FROM (al.check_out_time - al.check_in_time)) / 60,
        0
      )::int as study_minutes,
      -- 오늘 수업 출석 수
      (
        SELECT COUNT(*) FROM attendance a
        WHERE a.student_id = al.student_id
          AND a.date = ${todayDate}::date
          AND a.status IN ('present', 'late')
      ) as class_attendance_count
    FROM attendance_logs al
    JOIN students s ON s.id = al.student_id
    JOIN organizations o ON o.id = al.org_id
    WHERE al.check_in_time::date = ${todayDate}::date
      AND s.parent_phone IS NOT NULL
  `;

  console.log(`[DailyReport] Found ${attendanceRecords.length} students with attendance`);

  for (const record of attendanceRecords) {
    const studyHours = Math.floor(Number(record.study_minutes) / 60);
    const studyMins = Number(record.study_minutes) % 60;
    const studyTimeStr = studyHours > 0
      ? `${studyHours}시간 ${studyMins}분`
      : `${studyMins}분`;

    // 설정에서 템플릿 가져오기
    const template = await getTemplate(sql, record.org_id, 'daily_report');
    const message = fillTemplate(template, {
      '기관명': record.org_name,
      '학생명': record.student_name,
      '날짜': todayDate,
      '총학습시간': studyTimeStr,
    });

    await sendNotification(sql, env, {
      orgId: record.org_id,
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
 * 과제 마감 알림 발송 (매일 09:00 KST)
 * - D-1일 마감 과제 알림
 * - 학생과 학부모 모두에게 발송
 */
async function sendAssignmentReminders(
  sql: postgres.Sql,
  todayDate: string,
  env: Env
): Promise<void> {
  console.log(`[AssignmentRemind] Checking deadlines for ${todayDate}`);

  // 내일 마감인 과제 조회 (D-1)
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  const assignments = await sql`
    SELECT
      h.id as homework_id,
      h.title,
      h.description,
      h.due_date,
      h.class_id,
      c.name as class_name,
      c.org_id,
      o.name as org_name,
      -- 해당 반의 학생들
      ce.student_id,
      ce.student_name,
      s.parent_phone,
      s.phone as student_phone,
      -- 이미 제출했는지 확인
      (
        SELECT COUNT(*) FROM homework_submissions hs
        WHERE hs.homework_id = h.id
          AND hs.student_id = ce.student_id
      ) as has_submitted
    FROM homework h
    JOIN classes c ON c.id = h.class_id
    JOIN organizations o ON o.id = c.org_id
    JOIN class_enrollments ce ON ce.class_id = h.class_id AND ce.status = 'active'
    JOIN students s ON s.id = ce.student_id
    WHERE h.due_date::date = ${tomorrowStr}::date
      AND h.status = 'active'
  `;

  console.log(`[AssignmentRemind] Found ${assignments.length} assignments due tomorrow`);

  for (const assignment of assignments) {
    const hasSubmitted = Number(assignment.has_submitted) > 0;

    // 이미 제출한 학생은 스킵
    if (hasSubmitted) {
      console.log(`[AssignmentRemind] Skipping ${assignment.student_name} - already submitted`);
      continue;
    }

    // 설정에서 템플릿 가져오기
    const template = await getTemplate(sql, assignment.org_id, 'assignment_remind');
    const message = fillTemplate(template, {
      '기관명': assignment.org_name,
      '학생명': assignment.student_name,
      '과제명': assignment.title,
      '마감일': `${assignment.due_date} (내일)`,
    });

    await sendNotification(sql, env, {
      orgId: assignment.org_id,
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
 * 독서실 결석 처리 (매일 23:50 KST 실행)
 * - commute_schedules에 오늘 일정이 있는데 등원하지 않은 학생 → 결석 처리
 * - attendance 테이블에 class_id = NULL로 결석 기록
 */
async function processCommuteAbsences(
  sql: postgres.Sql,
  weekday: WeekdayName,
  todayDate: string,
  env: Env
): Promise<void> {
  console.log(`[CommuteAbsent] Processing for weekday=${weekday}, date=${todayDate}`);

  // 오늘 commute 일정이 있는 학생들 중 아직 attendance 기록이 없는 학생 조회
  const students = await sql`
    SELECT
      cs.id as schedule_id,
      cs.org_id,
      cs.student_id,
      cs.check_in_time,
      s.name as student_name,
      s.parent_phone,
      o.name as org_name,
      -- 오늘 독서실 출결 기록이 있는지 확인 (class_id IS NULL)
      (
        SELECT COUNT(*) FROM attendance a
        WHERE a.org_id = cs.org_id
          AND a.student_id = cs.student_id
          AND a.date = ${todayDate}::date
          AND a.class_id IS NULL
      ) as has_attendance,
      -- 오늘 등원 기록이 있는지 확인
      (
        SELECT COUNT(*) FROM attendance_logs al
        WHERE al.student_id = cs.student_id
          AND al.check_in_time::date = ${todayDate}::date
      ) as has_checkin
    FROM commute_schedules cs
    JOIN students s ON s.id = cs.student_id
    JOIN organizations o ON o.id = cs.org_id
    WHERE cs.weekday = ${weekday}
  `;

  console.log(`[CommuteAbsent] Found ${students.length} students with commute schedules`);

  let absentCount = 0;

  for (const student of students) {
    const hasAttendance = Number(student.has_attendance) > 0;
    const hasCheckin = Number(student.has_checkin) > 0;

    // 이미 출결 기록이 있거나 등원 기록이 있으면 스킵
    if (hasAttendance || hasCheckin) {
      continue;
    }

    // 결석 처리: attendance 테이블에 class_id = NULL로 삽입
    // Note: attendance 테이블에는 student_name, class_name 컬럼이 없음
    try {
      await sql`
        INSERT INTO attendance (org_id, student_id, date, status, class_id)
        VALUES (
          ${student.org_id},
          ${student.student_id},
          ${todayDate}::date,
          'absent',
          NULL
        )
        ON CONFLICT (org_id, class_id, student_id, date) DO NOTHING
      `;
      console.log(`[CommuteAbsent] Marked absent: ${student.student_name}`);
      absentCount++;

      // 결석 알림 발송
      const template = await getTemplate(sql, student.org_id, 'study_absent');
      const message = fillTemplate(template, {
        '기관명': student.org_name,
        '학생명': student.student_name,
        '예정시간': student.check_in_time || '오늘',
      });

      await sendNotification(sql, env, {
        orgId: student.org_id,
        studentId: student.student_id,
        studentName: student.student_name,
        type: "study_absent",
        targetDate: todayDate,
        scheduledTime: student.check_in_time,
        recipientPhone: student.parent_phone,
        message,
      });
    } catch (insertError) {
      console.error(`[CommuteAbsent] Failed to insert absence record for ${student.student_name}:`, insertError);
    }
  }

  console.log(`[CommuteAbsent] Processed ${absentCount} absences`);
}
