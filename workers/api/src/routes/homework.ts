import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";
import { getOrgIdFromRequest } from "../lib/supabase";
import { insertNotificationQueueBatch, type NotificationQueuePayload } from "../lib/notifications";

const app = new Hono<{ Bindings: Env }>();

const mapHw = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  title: row.title,
  description: row.description,
  due_date: row.due_date,
  class_id: row.class_id,
  class_name: row.class_name,
  teacher_id: row.teacher_id,
  status: row.status,
  submission_url: row.submission_url,
  total_students: row.total_students ?? 0,
  submitted_count: row.submitted_count ?? 0,
  created_at: row.created_at,
});

// GET /api/homework
app.get("/", async (c) => {
  try {
    const orgId = await getOrgIdFromRequest(c.req.raw, c.env);
    if (!orgId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const items = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM homework WHERE org_id = $1 ORDER BY due_date DESC NULLS LAST, created_at DESC LIMIT 200`,
        [orgId],
      );
      return rows.map(mapHw);
    });
    return c.json({ homework: items });
  } catch (error: any) {
    console.error("[homework] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/homework
app.post("/", async (c) => {
  try {
    const orgId = await getOrgIdFromRequest(c.req.raw, c.env);
    if (!orgId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const {
      title,
      description = null,
      due_date = null,
      class_id = null,
      teacher_id = null,
      status = "active",
      submission_url = null,
      send_notification = true, // 알림 발송 여부
    } = body || {};
    if (!title) return c.json({ error: "title is required" }, 400);
    if (!class_id) return c.json({ error: "class_id is required" }, 400);

    const item = await withClient(c.env, async (client) => {
      // 반 정보 조회
      const classRes = await client.query(
        `SELECT id, name FROM classes WHERE id = $1 AND org_id = $2`,
        [class_id, orgId]
      );

      if (!classRes.rows[0]) {
        throw new Error("반 정보를 찾을 수 없습니다");
      }

      const classRow = classRes.rows[0];

      // 해당 반의 활성 학생 수 조회
      const studentCountRes = await client.query(
        `SELECT COUNT(*)::int as cnt FROM class_enrollments
         WHERE class_id = $1 AND (status = 'active' OR status IS NULL)`,
        [class_id]
      );
      const totalStudents = studentCountRes.rows[0]?.cnt || 0;

      // 마감일 기본값: 7일 후
      const finalDueDate = due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { rows } = await client.query(
        `INSERT INTO homework (org_id, title, description, due_date, class_id, class_name, teacher_id, status, submission_url, total_students, submitted_count)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [
          orgId,
          title,
          description,
          finalDueDate,
          class_id,
          classRow.name,
          teacher_id,
          status,
          submission_url,
          totalStudents,
          0, // 새로 생성된 과제는 제출 수 0
        ],
      );

      const homeworkData = rows[0] ? mapHw(rows[0]) : null;

      // 과제 생성 알림 발송 (class_id가 있는 경우에만)
      // notification_queue에 추가하면 Queue Worker가 1분 내에 처리
      if (homeworkData && send_notification && class_id) {
        try {
          // 해당 반의 학생들 조회
          const studentsRes = await client.query(
            `SELECT ce.student_id, c.name as class_name
             FROM class_enrollments ce
             JOIN classes c ON c.id = ce.class_id
             WHERE ce.class_id = $1 AND (ce.status = 'active' OR ce.status IS NULL)`,
            [class_id]
          );

          // 마감일 포맷팅 (YYYY-MM-DD 또는 미정)
          const formattedDueDate = finalDueDate
            ? new Date(finalDueDate).toISOString().split('T')[0]
            : '미정';

          // 배치로 notification_queue에 추가
          const queueItems: NotificationQueuePayload[] = studentsRes.rows.map((student: any) => ({
            student_id: student.student_id,
            class_id: class_id,
            class_name: student.class_name,
            title: title,
            due_date: formattedDueDate,
            description: description || undefined,
          }));

          if (queueItems.length > 0) {
            const result = await insertNotificationQueueBatch(
              client,
              orgId,
              'assignment_new',
              queueItems
            );
            console.log(`[homework] Queued ${result.insertedCount}/${queueItems.length} notifications for ${title}`);
          }
        } catch (notifError) {
          console.error("[homework] notification queue error:", notifError);
          // 알림 실패해도 과제 생성은 성공
        }
      }

      return homeworkData;
    });

    return c.json({ homework: item, message: '과제가 생성되었습니다' }, item ? 201 : 500);
  } catch (error: any) {
    console.error("[homework] POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
