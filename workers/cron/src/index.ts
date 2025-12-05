/**
 * GoldPen Notification Cron Worker (Queue Producer)
 * 매 1분마다 실행되어 각 기관별 작업을 Queue에 추가
 *
 * 아키텍처:
 * - Cron (Producer): 기관 목록 조회 후 개별 작업을 Queue에 추가
 * - Queue (Consumer): 개별 기관 작업 처리
 *
 * 장점:
 * - 병렬 처리로 tenant 200개 이상 지원
 * - 개별 실패 시 재시도 가능
 * - Dead Letter Queue로 실패 추적
 */

import postgres from "postgres";

interface Env {
  HYPERDRIVE_DB: Hyperdrive;
  ATTENDANCE_QUEUE: Queue<AttendanceMessage>;
  TIMEZONE: string;
  API_WORKER_URL?: string; // API warm-up용 URL
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
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

// 현재 시각을 분으로
function currentMinutes(koreanTime: Date): number {
  return koreanTime.getUTCHours() * 60 + koreanTime.getUTCMinutes();
}

export default {
  // Scheduled handler - 크론 트리거 (Queue Producer)
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log(`[Cron] Queue producer started at ${new Date().toISOString()}`);

    // API Worker warm-up ping (콜드 스타트 방지)
    const apiUrl = env.API_WORKER_URL || 'https://goldpen-api.hello-51f.workers.dev';
    try {
      const warmupResponse = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        headers: { 'User-Agent': 'GoldPen-Cron-Warmup' }
      });
      console.log(`[Cron] API warm-up: ${warmupResponse.status}`);
    } catch (warmupError) {
      console.warn(`[Cron] API warm-up failed:`, warmupError);
    }

    const sql = postgres(env.HYPERDRIVE_DB.connectionString);

    try {
      const koreanTime = getKoreanTime();
      const todayWeekday = WEEKDAYS[koreanTime.getUTCDay()];
      const todayDate = koreanTime.toISOString().split("T")[0];
      const nowMinutes = currentMinutes(koreanTime);
      const nowHour = koreanTime.getUTCHours();
      const nowMinute = koreanTime.getUTCMinutes();

      console.log(
        `[Cron] Korean time: ${koreanTime.toISOString()}, weekday: ${todayWeekday}, hour: ${nowHour}, minute: ${nowMinute}`
      );

      // 모든 활성 기관 조회 (settings 포함)
      const organizations = await sql`
        SELECT id, name, type, settings FROM organizations WHERE status = 'active'
      `;

      console.log(`[Cron] Found ${organizations.length} active organizations`);

      const messages: MessageSendRequest<AttendanceMessage>[] = [];

      // 1. 매 분 실행: 출결 체크 작업들
      for (const org of organizations) {
        const baseMessage = {
          orgId: org.id,
          orgName: org.name,
          orgType: org.type,
          weekday: todayWeekday,
          todayDate,
          nowMinutes,
          timestamp: Date.now(),
        };

        // 학원/공부방 출결 체크
        if (org.type === 'academy' || org.type === 'learning_center') {
          messages.push({
            body: { ...baseMessage, type: 'check_academy' }
          });
        }

        // 독서실 출결 체크
        if (org.type === 'study_cafe') {
          messages.push({
            body: { ...baseMessage, type: 'check_study' }
          });
        }

        // 강의 출결 체크 (모든 기관)
        messages.push({
          body: { ...baseMessage, type: 'check_class' }
        });

        // 통학 출결 체크 (모든 기관 - commute_schedules 기반)
        messages.push({
          body: { ...baseMessage, type: 'check_commute' }
        });
      }

      // 2. 일일 학습 리포트 발송 (오늘 좌석 체크인 기록이 있는 학생 대상)
      // 매 분마다 체크하여 "HH:MM" 형식으로 설정 가능 (예: "22:00", "21:30" 등)
      const nowTimeStr = `${nowHour.toString().padStart(2, '0')}:${nowMinute.toString().padStart(2, '0')}`;

      for (const org of organizations) {
        // 조직별 설정에서 dailyReportTime 가져오기 (기본값: 22:00)
        const settings = (org.settings as Record<string, unknown>) || {};
        const orgReportTime = (settings.dailyReportTime as string) || '22:00';

        // 현재 시간이 조직의 설정 시간과 일치하면 큐에 추가
        if (nowTimeStr === orgReportTime) {
          console.log(`[Cron] Queuing daily report for ${org.name} (time: ${orgReportTime})`);
          messages.push({
            body: {
              type: 'daily_report',
              orgId: org.id,
              orgName: org.name,
              orgType: org.type,
              weekday: todayWeekday,
              todayDate,
              nowMinutes,
              timestamp: Date.now(),
            }
          });
        }
      }

      // 3. 독서실 결석 처리 (매일 23:50 KST)
      if (nowHour === 23 && nowMinute === 50) {
        console.log(`[Cron] Queuing commute absence processing...`);
        for (const org of organizations) {
          if (org.type === 'study_cafe') {
            messages.push({
              body: {
                type: 'process_commute_absent',
                orgId: org.id,
                orgName: org.name,
                orgType: org.type,
                weekday: todayWeekday,
                todayDate,
                nowMinutes,
                timestamp: Date.now(),
              }
            });
          }
        }
      }

      // 5. notification_queue 처리 (매 분마다)
      // 등원/하원 알림 등 실시간 알림 처리
      messages.push({
        body: {
          type: 'process_notification_queue',
          orgId: 'system',
          orgName: 'System',
          orgType: 'system',
          weekday: todayWeekday,
          todayDate,
          nowMinutes,
          timestamp: Date.now(),
        }
      });

      // Queue에 메시지 일괄 전송 (100개씩 배치)
      if (messages.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < messages.length; i += batchSize) {
          const batch = messages.slice(i, i + batchSize);
          await env.ATTENDANCE_QUEUE.sendBatch(batch);
          console.log(`[Cron] Queued batch ${Math.floor(i / batchSize) + 1}: ${batch.length} messages`);
        }
        console.log(`[Cron] Total ${messages.length} messages queued`);
      } else {
        console.log(`[Cron] No messages to queue`);
      }

    } catch (error) {
      console.error(`[Cron] Error:`, error);
    } finally {
      await sql.end();
    }
  },

  // HTTP handler (for testing)
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "POST" && new URL(request.url).pathname === "/test") {
      const sql = postgres(env.HYPERDRIVE_DB.connectionString);

      try {
        const koreanTime = getKoreanTime();
        const todayWeekday = WEEKDAYS[koreanTime.getUTCDay()];
        const todayDate = koreanTime.toISOString().split("T")[0];
        const nowMinutes = currentMinutes(koreanTime);

        const url = new URL(request.url);
        const testType = url.searchParams.get("type");
        const orgId = url.searchParams.get("org_id");

        // 특정 기관 테스트
        if (orgId) {
          const orgs = await sql`SELECT id, name, type FROM organizations WHERE id = ${orgId}`;
          if (orgs.length === 0) {
            return new Response(JSON.stringify({ error: "Organization not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" }
            });
          }

          const org = orgs[0];
          const message: AttendanceMessage = {
            type: (testType || 'check_class') as AttendanceMessage['type'],
            orgId: org.id,
            orgName: org.name,
            orgType: org.type,
            weekday: todayWeekday,
            todayDate,
            nowMinutes,
            timestamp: Date.now(),
          };

          await env.ATTENDANCE_QUEUE.send(message);

          return new Response(JSON.stringify({
            success: true,
            message: `Queued ${testType || 'check_class'} for ${org.name}`,
            time: koreanTime.toISOString()
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }

        // 전체 테스트 (모든 기관)
        const organizations = await sql`SELECT id, name, type FROM organizations WHERE status = 'active'`;
        const messages: MessageSendRequest<AttendanceMessage>[] = [];

        for (const org of organizations) {
          messages.push({
            body: {
              type: (testType || 'check_class') as AttendanceMessage['type'],
              orgId: org.id,
              orgName: org.name,
              orgType: org.type,
              weekday: todayWeekday,
              todayDate,
              nowMinutes,
              timestamp: Date.now(),
            }
          });
        }

        if (messages.length > 0) {
          await env.ATTENDANCE_QUEUE.sendBatch(messages);
        }

        return new Response(JSON.stringify({
          success: true,
          message: `Queued ${messages.length} ${testType || 'check_class'} jobs`,
          time: koreanTime.toISOString()
        }), {
          headers: { "Content-Type": "application/json" }
        });

      } finally {
        await sql.end();
      }
    }

    return new Response(
      JSON.stringify({
        name: "GoldPen Notification Cron (Queue Producer)",
        status: "running",
        nextRun: "every minute",
        architecture: "Cron → Queue → Consumer",
        jobs: [
          "check_academy (매 분, academy/learning_center)",
          "check_study (매 분, study_cafe)",
          "check_class (매 분, all)",
          "check_commute (매 분, all - 통학 출결)",
          "daily_report (조직별 설정 시간, 기본 22:00 KST)",
          "process_commute_absent (매일 23:50 KST, study_cafe)"
        ],
        testEndpoint: "POST /test?type=check_class&org_id=xxx"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  },
};
