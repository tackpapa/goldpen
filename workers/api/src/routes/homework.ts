import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";
import { sendNotification, createAssignmentNewMessage } from "../lib/notifications";

const app = new Hono<{ Bindings: Env }>();
const DEMO_ORG = "dddd0000-0000-0000-0000-000000000000";

const mapHw = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  title: row.title,
  description: row.description,
  due_date: row.due_date,
  class_id: row.class_id,
  teacher_id: row.teacher_id,
  status: row.status,
  submission_url: row.submission_url,
  created_at: row.created_at,
});

// GET /api/homework
app.get("/", async (c) => {
  try {
    const items = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM homework WHERE org_id = $1 ORDER BY due_date DESC NULLS LAST, created_at DESC LIMIT 200`,
        [DEMO_ORG],
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
    const body = await c.req.json();
    const {
      title,
      description = null,
      due_date = null,
      class_id = null,
      teacher_id = null,
      status = "assigned",
      submission_url = null,
      send_notification = true, // 알림 발송 여부
    } = body || {};
    if (!title) return c.json({ error: "title is required" }, 400);

    const item = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO homework (org_id, title, description, due_date, class_id, teacher_id, status, submission_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          DEMO_ORG,
          title,
          description,
          due_date,
          class_id,
          teacher_id,
          status,
          submission_url,
        ],
      );

      const homeworkData = rows[0] ? mapHw(rows[0]) : null;

      // 과제 생성 알림 발송 (class_id가 있는 경우에만)
      if (homeworkData && send_notification && class_id) {
        try {
          // 해당 반의 학생들 조회
          const studentsRes = await client.query(
            `SELECT ce.student_id, ce.student_name, s.parent_phone, o.name as org_name, c.name as class_name
             FROM class_enrollments ce
             JOIN students s ON s.id = ce.student_id
             JOIN organizations o ON o.id = s.org_id
             JOIN classes c ON c.id = ce.class_id
             WHERE ce.class_id = $1 AND ce.status = 'active'`,
            [class_id]
          );

          for (const student of studentsRes.rows) {
            const message = createAssignmentNewMessage(
              student.org_name,
              student.class_name,
              title,
              due_date || "미정",
              description
            );

            await sendNotification(client, c.env, {
              orgId: DEMO_ORG,
              orgName: student.org_name,
              studentId: student.student_id,
              studentName: student.student_name,
              type: "assignment_new",
              classId: class_id,
              className: student.class_name,
              recipientPhone: student.parent_phone,
              message,
              metadata: { homework_id: homeworkData.id, title, due_date },
            });
          }
        } catch (notifError) {
          console.error("[homework] notification error:", notifError);
          // 알림 실패해도 과제 생성은 성공
        }
      }

      return homeworkData;
    });

    return c.json({ homework: item }, item ? 201 : 500);
  } catch (error: any) {
    console.error("[homework] POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
