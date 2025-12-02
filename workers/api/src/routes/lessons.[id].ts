import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";
import { sendNotification, createLessonReportMessage } from "../lib/notifications";

const app = new Hono<{ Bindings: Env }>();
const DEMO_ORG = "dddd0000-0000-0000-0000-000000000000";

const mapLesson = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  class_id: row.class_id,
  teacher_id: row.teacher_id,
  student_id: row.student_id,
  lesson_date: row.lesson_date,
  lesson_time: row.lesson_time,
  duration_minutes: row.duration_minutes,
  subject: row.subject,
  content: row.content,
  student_attitudes: row.student_attitudes,
  comprehension_level: row.comprehension_level || "medium",
  homework_assigned: row.homework_assigned,
  next_lesson_plan: row.next_lesson_plan,
  parent_feedback: row.parent_feedback,
  director_feedback: row.director_feedback,
  final_message: row.final_message,
  notification_sent: row.notification_sent,
  notification_sent_at: row.notification_sent_at,
  attendance: row.attendance || [],
  homework_submissions: row.homework_submissions || {},
  created_at: row.created_at,
  updated_at: row.updated_at,
});

// GET /api/lessons/:id
app.get("/", async (c) => {
  const id = c.req.param("id");
  try {
    const lesson = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM lessons WHERE id = $1`,
        [id],
      );
      return rows[0] ? mapLesson(rows[0]) : null;
    });
    if (!lesson) return c.json({ error: "Not found" }, 404);
    return c.json({ lesson });
  } catch (error: any) {
    console.error("[lessons/:id] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/lessons/:id
app.patch("/", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const fields = [
      "class_id",
      "teacher_id",
      "student_id",
      "lesson_date",
      "lesson_time",
      "duration_minutes",
      "subject",
      "content",
      "student_attitudes",
      "comprehension_level",
      "homework_assigned",
      "next_lesson_plan",
      "parent_feedback",
      "director_feedback",
      "final_message",
      "notification_sent",
      "attendance",
      "homework_submissions",
    ];
    const setParts: string[] = [];
    const values: any[] = [];
    fields.forEach((f) => {
      if (body[f] !== undefined) {
        setParts.push(`${f} = $${setParts.length + 1}`);
        values.push(body[f]);
      }
    });
    if (!setParts.length) return c.json({ error: "No fields to update" }, 400);
    values.push(id);
    const lesson = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `UPDATE lessons SET ${setParts.join(", ")}, updated_at = now() WHERE id = $${
          values.length
        } RETURNING *`,
        values,
      );
      return rows[0] ? mapLesson(rows[0]) : null;
    });
    if (!lesson) return c.json({ error: "Not found" }, 404);
    return c.json({ lesson });
  } catch (error: any) {
    console.error("[lessons/:id] PATCH error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/lessons/:id
app.delete("/", async (c) => {
  const id = c.req.param("id");
  try {
    const deleted = await withClient(c.env, async (client) => {
      const { rowCount } = await client.query(
        `DELETE FROM lessons WHERE id = $1`,
        [id],
      );
      return rowCount;
    });
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true }, 200);
  } catch (error: any) {
    console.error("[lessons/:id] DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/lessons/:id/notify - 수업 리포트 알림톡 발송
app.post("/notify", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const {
      class_name,
      lesson_date,
      content,
      homework_assigned,
      final_message,
    } = body || {};

    const result = await withClient(c.env, async (client) => {
      // 수업일지 조회
      const lessonResult = await client.query(
        `SELECT l.*, c.name as class_name, o.name as org_name
         FROM lessons l
         LEFT JOIN classes c ON c.id = l.class_id
         JOIN organizations o ON o.id = l.org_id
         WHERE l.id = $1`,
        [id]
      );

      if (lessonResult.rows.length === 0) {
        return { success: false, error: "수업일지를 찾을 수 없습니다" };
      }

      const lesson = lessonResult.rows[0] as any;

      // 해당 수업(반)의 학생들 조회
      const studentsResult = await client.query(
        `SELECT s.id, s.name, s.parent_phone
         FROM students s
         JOIN class_enrollments ce ON ce.student_id = s.id
         WHERE ce.class_id = $1 AND (ce.status IS NULL OR ce.status = 'active')`,
        [lesson.class_id]
      );

      if (studentsResult.rows.length === 0) {
        // 학생이 없으면 테스트용으로 텔레그램만 발송
        const testMessage = final_message || createLessonReportMessage(
          lesson.org_name || "GoldPen",
          "테스트 학생",
          class_name || lesson.class_name || "수업",
          lesson_date || lesson.lesson_date,
          content || lesson.content,
          homework_assigned || lesson.homework_assigned
        );

        await sendNotification(client, c.env, {
          orgId: lesson.org_id,
          orgName: lesson.org_name || "GoldPen",
          studentId: "test-student-id",
          studentName: "테스트 학생",
          type: "lesson_report",
          classId: lesson.class_id,
          className: class_name || lesson.class_name,
          message: testMessage,
          metadata: { lesson_id: id, lesson_date, content },
        });

        return { success: true, telegram_sent: true, students_notified: 0 };
      }

      // 각 학생에게 알림 발송
      let successCount = 0;
      for (const student of studentsResult.rows as any[]) {
        // final_message에 {{학생명}} 플레이스홀더가 있으면 실제 학생 이름으로 치환
        let message = final_message
          ? final_message.replace(/\{\{학생명\}\}/g, student.name)
          : createLessonReportMessage(
              lesson.org_name || "GoldPen",
              student.name,
              class_name || lesson.class_name || "수업",
              lesson_date || lesson.lesson_date,
              content || lesson.content,
              homework_assigned || lesson.homework_assigned
            );

        const notifResult = await sendNotification(client, c.env, {
          orgId: lesson.org_id,
          orgName: lesson.org_name || "GoldPen",
          studentId: student.id,
          studentName: student.name,
          type: "lesson_report",
          classId: lesson.class_id,
          className: class_name || lesson.class_name,
          recipientPhone: student.parent_phone,
          message,
          metadata: { lesson_id: id, lesson_date, content },
        });

        if (notifResult.success) {
          successCount++;
        }
      }

      // notification_sent 업데이트
      await client.query(
        `UPDATE lessons SET notification_sent = true, notification_sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [id]
      );

      return {
        success: true,
        telegram_sent: true,
        students_notified: successCount,
        total_students: studentsResult.rows.length,
      };
    });

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 404);
    }

    return c.json(result, 200);
  } catch (error: any) {
    console.error("[lessons/:id/notify] POST error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
