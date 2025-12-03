/**
 * 출결 로그 API (체크인/체크아웃/외출/복귀)
 * - 학원/공부방: academy_checkin, academy_checkout
 * - 독서실: study_checkin, study_checkout, study_out, study_return
 */
import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";
import {
  sendNotification,
  createCheckinMessage,
  createCheckoutMessage,
  createStudyOutMessage,
  createStudyReturnMessage,
  NotificationType,
} from "../lib/notifications";

const app = new Hono<{ Bindings: Env }>();
const DEMO_ORG = "dddd0000-0000-0000-0000-000000000000";

const mapLog = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  student_id: row.student_id,
  check_in_time: row.check_in_time,
  check_out_time: row.check_out_time,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

/**
 * GET /api/attendance-logs
 * 오늘 출결 로그 조회
 */
app.get("/", async (c) => {
  try {
    const url = new URL(c.req.url);
    const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

    const logs = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT al.*, s.name as student_name, s.parent_phone, o.name as org_name, o.type as org_type
         FROM attendance_logs al
         JOIN students s ON s.id = al.student_id
         JOIN organizations o ON o.id = al.org_id
         WHERE al.org_id = $1 AND al.check_in_time::date = $2::date
         ORDER BY al.check_in_time DESC`,
        [DEMO_ORG, date]
      );
      return rows;
    });

    return c.json({ logs });
  } catch (error: any) {
    console.error("[attendance-logs] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/attendance-logs/checkin
 * 체크인 (등원)
 * body: { student_id, seat_id? }
 */
app.post("/checkin", async (c) => {
  try {
    const body = await c.req.json();
    const { student_id, seat_id } = body || {};

    if (!student_id) {
      return c.json({ error: "student_id is required" }, 400);
    }

    const result = await withClient(c.env, async (client) => {
      // 학생 정보 조회
      const studentRes = await client.query(
        `SELECT s.*, o.name as org_name, o.type as org_type
         FROM students s
         JOIN organizations o ON o.id = s.org_id
         WHERE s.id = $1`,
        [student_id]
      );

      if (!studentRes.rows[0]) {
        throw new Error("Student not found");
      }

      const student = studentRes.rows[0];
      const now = new Date();
      const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" });

      // attendance_logs에 체크인 기록
      const { rows } = await client.query(
        `INSERT INTO attendance_logs (org_id, student_id, check_in_time)
         VALUES ($1, $2, NOW())
         RETURNING *`,
        [student.org_id, student_id]
      );

      const log = rows[0];

      // 좌석 업데이트 (독서실인 경우) - status: checked_in
      if (seat_id) {
        await client.query(
          `UPDATE seats SET status = 'checked_in', student_id = $1, check_in_time = NOW(), session_start_time = NOW()
           WHERE id = $2`,
          [student_id, seat_id]
        );
      }

      // 알림 발송 (통합된 키 사용)
      const notificationType: NotificationType = "checkin";
      const message = createCheckinMessage(student.org_name, student.name, timeStr);

      await sendNotification(client, c.env, {
        orgId: student.org_id,
        orgName: student.org_name,
        studentId: student_id,
        studentName: student.name,
        type: notificationType,
        recipientPhone: student.parent_phone,
        message,
        metadata: { seat_id, check_in_time: log.check_in_time },
      });

      return { log: mapLog(log), student_name: student.name };
    });

    return c.json(result, 201);
  } catch (error: any) {
    console.error("[attendance-logs] checkin error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/attendance-logs/checkout
 * 체크아웃 (하원)
 * body: { student_id, log_id? }
 */
app.post("/checkout", async (c) => {
  try {
    const body = await c.req.json();
    const { student_id, log_id } = body || {};

    if (!student_id) {
      return c.json({ error: "student_id is required" }, 400);
    }

    const result = await withClient(c.env, async (client) => {
      // 학생 정보 조회
      const studentRes = await client.query(
        `SELECT s.*, o.name as org_name, o.type as org_type
         FROM students s
         JOIN organizations o ON o.id = s.org_id
         WHERE s.id = $1`,
        [student_id]
      );

      if (!studentRes.rows[0]) {
        throw new Error("Student not found");
      }

      const student = studentRes.rows[0];
      const now = new Date();
      const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" });

      // 오늘의 체크인 로그 찾기 (체크아웃 안 된 것)
      const logQuery = log_id
        ? `SELECT * FROM attendance_logs WHERE id = $1`
        : `SELECT * FROM attendance_logs
           WHERE student_id = $1 AND check_out_time IS NULL
           AND check_in_time::date = CURRENT_DATE
           ORDER BY check_in_time DESC LIMIT 1`;

      const logRes = await client.query(logQuery, log_id ? [log_id] : [student_id]);

      if (!logRes.rows[0]) {
        throw new Error("No active check-in found");
      }

      const existingLog = logRes.rows[0];

      // 학습 시간 계산 (분)
      const checkInTime = new Date(existingLog.check_in_time);
      const studyMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / 60000);

      // 체크아웃 업데이트 (duration_minutes도 저장)
      const { rows } = await client.query(
        `UPDATE attendance_logs SET check_out_time = NOW(), duration_minutes = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [studyMinutes, existingLog.id]
      );

      const log = rows[0];

      // 좌석 해제 (독서실인 경우) - 실패해도 계속 진행
      try {
        await client.query(
          `UPDATE seats SET status = 'vacant', student_id = NULL, check_in_time = NULL, session_start_time = NULL
           WHERE student_id = $1`,
          [student_id]
        );
      } catch (seatError) {
        console.log(`[checkout] Seat update skipped: ${seatError}`);
      }

      // 알림 발송 - 실패해도 계속 진행 (통합된 키 사용)
      try {
        const notificationType: NotificationType = "checkout";
        const message = createCheckoutMessage(student.org_name, student.name, timeStr, studyMinutes);

        await sendNotification(client, c.env, {
          orgId: student.org_id,
          orgName: student.org_name,
          studentId: student_id,
          studentName: student.name,
          type: notificationType,
          recipientPhone: student.parent_phone,
          message,
          metadata: { check_out_time: log.check_out_time, study_minutes: studyMinutes },
        });
      } catch (notifError) {
        console.log(`[checkout] Notification skipped: ${notifError}`);
      }

      return { log: mapLog(log), student_name: student.name, study_minutes: studyMinutes };
    });

    return c.json(result);
  } catch (error: any) {
    console.error("[attendance-logs] checkout error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/attendance-logs/out
 * 외출 (독서실 전용)
 * body: { student_id, seat_number? }
 */
app.post("/out", async (c) => {
  try {
    const body = await c.req.json();
    const { student_id, seat_number } = body || {};

    if (!student_id) {
      return c.json({ error: "student_id is required" }, 400);
    }

    const result = await withClient(c.env, async (client) => {
      // 학생 정보 조회
      const studentRes = await client.query(
        `SELECT s.*, o.name as org_name, o.type as org_type
         FROM students s
         JOIN organizations o ON o.id = s.org_id
         WHERE s.id = $1`,
        [student_id]
      );

      if (!studentRes.rows[0]) {
        throw new Error("Student not found");
      }

      const student = studentRes.rows[0];
      const now = new Date();
      const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" });
      const today = now.toISOString().split("T")[0];

      // 좌석 번호 조회 (없으면 현재 좌석에서 가져오기) - 실패해도 0 사용
      let seatNum = seat_number || 0;
      if (!seatNum) {
        try {
          // seats 테이블에서 number 컬럼 조회
          const seatRes = await client.query(
            `SELECT number as num FROM seats WHERE student_id = $1 LIMIT 1`,
            [student_id]
          );
          seatNum = seatRes.rows[0]?.num || 0;
        } catch (e) {
          console.log(`[out] Seat lookup failed, using 0: ${e}`);
          seatNum = 0;
        }
      }

      // outing_records에 기록 (outing_time 사용, org_id 필수)
      const { rows } = await client.query(
        `INSERT INTO outing_records (org_id, student_id, seat_number, date, outing_time)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [student.org_id, student_id, seatNum, today]
      );

      // 좌석 상태를 외출로 변경 - 실패해도 계속 진행
      try {
        await client.query(
          `UPDATE seats SET status = 'out' WHERE student_id = $1`,
          [student_id]
        );
      } catch (seatError) {
        console.log(`[out] Seat update skipped: ${seatError}`);
      }

      // 알림 발송 - 실패해도 계속 진행
      try {
        const message = createStudyOutMessage(student.org_name, student.name, timeStr);

        await sendNotification(client, c.env, {
          orgId: student.org_id,
          orgName: student.org_name,
          studentId: student_id,
          studentName: student.name,
          type: "study_out",
          recipientPhone: student.parent_phone,
          message,
          metadata: { outing_time: rows[0]?.outing_time },
        });
      } catch (notifError) {
        console.log(`[out] Notification skipped: ${notifError}`);
      }

      return { outing: rows[0], student_name: student.name };
    });

    return c.json(result, 201);
  } catch (error: any) {
    console.error("[attendance-logs] out error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/attendance-logs/return
 * 복귀 (독서실 전용)
 * body: { student_id, outing_id? }
 */
app.post("/return", async (c) => {
  try {
    const body = await c.req.json();
    const { student_id, outing_id } = body || {};

    if (!student_id) {
      return c.json({ error: "student_id is required" }, 400);
    }

    const result = await withClient(c.env, async (client) => {
      // 학생 정보 조회
      const studentRes = await client.query(
        `SELECT s.*, o.name as org_name, o.type as org_type
         FROM students s
         JOIN organizations o ON o.id = s.org_id
         WHERE s.id = $1`,
        [student_id]
      );

      if (!studentRes.rows[0]) {
        throw new Error("Student not found");
      }

      const student = studentRes.rows[0];
      const now = new Date();
      const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" });

      // 외출 기록 찾기 (outing_time 사용)
      const outingQuery = outing_id
        ? `SELECT * FROM outing_records WHERE id = $1`
        : `SELECT * FROM outing_records
           WHERE student_id = $1 AND return_time IS NULL AND date = CURRENT_DATE
           ORDER BY outing_time DESC LIMIT 1`;

      const outingRes = await client.query(outingQuery, outing_id ? [outing_id] : [student_id]);

      if (!outingRes.rows[0]) {
        throw new Error("No active outing found");
      }

      // 복귀 시간 업데이트 + status 변경
      const { rows } = await client.query(
        `UPDATE outing_records SET return_time = NOW(), status = 'returned'
         WHERE id = $1
         RETURNING *`,
        [outingRes.rows[0].id]
      );

      // 좌석 상태를 사용중으로 변경 - 실패해도 계속 진행
      try {
        await client.query(
          `UPDATE seats SET status = 'checked_in' WHERE student_id = $1`,
          [student_id]
        );
      } catch (seatError) {
        console.log(`[return] Seat update skipped: ${seatError}`);
      }

      // 알림 발송 - 실패해도 계속 진행
      try {
        const message = createStudyReturnMessage(student.org_name, student.name, timeStr);

        await sendNotification(client, c.env, {
          orgId: student.org_id,
          orgName: student.org_name,
          studentId: student_id,
          studentName: student.name,
          type: "study_return",
          recipientPhone: student.parent_phone,
          message,
          metadata: { return_time: rows[0]?.return_time },
        });
      } catch (notifError) {
        console.log(`[return] Notification skipped: ${notifError}`);
      }

      return { outing: rows[0], student_name: student.name };
    });

    return c.json(result);
  } catch (error: any) {
    console.error("[attendance-logs] return error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
