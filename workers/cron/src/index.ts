/**
 * GoldPen Attendance Cron Worker
 * 매 1분마다 실행되어 지각/결석 체크 및 알림 발송
 *
 * 독서실 출결:
 * - 등원 시간 경과 + 체크인 없음 → 지각 알림
 * - 하원 시간 경과 + 체크인 없음 → 결석 알림
 *
 * 강의 출결:
 * - 수업 시작 경과 + 출석 없음 → 지각 알림
 * - 수업 종료 경과 + 출석 없음 → 결석 알림
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

      console.log(
        `[Cron] Korean time: ${koreanTime.toISOString()}, weekday: ${todayWeekday}, nowMinutes: ${nowMinutes}`
      );

      // 1. 독서실 지각/결석 체크
      await checkStudyRoomAttendance(sql, todayWeekday, todayDate, nowMinutes, env);

      // 2. 강의 지각/결석 체크
      await checkClassAttendance(sql, todayWeekday, todayDate, nowMinutes, env);

      console.log(`[Cron] Attendance check completed`);
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

        await checkStudyRoomAttendance(sql, todayWeekday, todayDate, nowMinutes, env);
        await checkClassAttendance(sql, todayWeekday, todayDate, nowMinutes, env);

        return new Response(JSON.stringify({ success: true, time: koreanTime.toISOString() }), {
          headers: { "Content-Type": "application/json" },
        });
      } finally {
        await sql.end();
      }
    }

    return new Response(
      JSON.stringify({
        name: "GoldPen Attendance Cron",
        status: "running",
        nextRun: "every minute",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  },
};

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
      (
        SELECT COUNT(*) FROM attendance_logs al
        WHERE al.student_id = cs.student_id
          AND al.check_in_time::date = ${todayDate}::date
      ) as has_checkin
    FROM commute_schedules cs
    JOIN students s ON s.id = cs.student_id
    WHERE cs.weekday = ${weekday}
      AND cs.check_in_time IS NOT NULL
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
        await sendNotification(sql, env, {
          orgId: schedule.org_id,
          studentId: schedule.student_id,
          studentName: schedule.student_name,
          type: "study_absent",
          targetDate: todayDate,
          scheduledTime: schedule.check_out_time,
          recipientPhone: schedule.parent_phone,
          message: `[골드펜] ${schedule.student_name} 학생이 오늘 독서실에 등원하지 않았습니다. (예정 하원: ${schedule.check_out_time})`,
        });
      } else {
        // 지각 알림
        await sendNotification(sql, env, {
          orgId: schedule.org_id,
          studentId: schedule.student_id,
          studentName: schedule.student_name,
          type: "study_late",
          targetDate: todayDate,
          scheduledTime: schedule.check_in_time,
          recipientPhone: schedule.parent_phone,
          message: `[골드펜] ${schedule.student_name} 학생이 아직 독서실에 등원하지 않았습니다. (예정 등원: ${schedule.check_in_time})`,
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
      c.schedule
    FROM classes c
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
          await sendNotification(sql, env, {
            orgId: cls.org_id,
            studentId: enrollment.student_id,
            studentName: enrollment.student_name,
            type: "class_absent",
            classId: cls.class_id,
            targetDate: todayDate,
            scheduledTime: todaySchedule.end_time,
            recipientPhone: enrollment.parent_phone,
            message: `[골드펜] ${enrollment.student_name} 학생이 오늘 ${cls.class_name} 수업에 출석하지 않았습니다. (결석 처리)`,
          });
        } else {
          // 지각 알림
          await sendNotification(sql, env, {
            orgId: cls.org_id,
            studentId: enrollment.student_id,
            studentName: enrollment.student_name,
            type: "class_late",
            classId: cls.class_id,
            targetDate: todayDate,
            scheduledTime: todaySchedule.start_time,
            recipientPhone: enrollment.parent_phone,
            message: `[골드펜] ${enrollment.student_name} 학생이 아직 ${cls.class_name} 수업에 출석하지 않았습니다. (수업 시작: ${todaySchedule.start_time})`,
          });
        }
      }
    }
  }
}

interface NotificationParams {
  orgId: string;
  studentId: string;
  studentName: string;
  type: "study_late" | "study_absent" | "class_late" | "class_absent";
  classId?: string;
  targetDate: string;
  scheduledTime: string;
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
        ${scheduledTime}::time, ${recipientPhone || null}, ${message}, 'sent'
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
          ${scheduledTime}::time, ${recipientPhone || null}, ${message}, 'failed',
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
