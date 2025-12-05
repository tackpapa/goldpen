import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";
import { insertNotificationQueueBatch, type NotificationQueuePayload } from "../lib/notifications";

const app = new Hono<{ Bindings: Env }>();

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
// notification_queue에 추가하면 Queue Worker가 1분 내에 처리
app.post("/notify", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const {
      content,
      homework_assigned,
      // 알림톡 템플릿 변수 (프론트엔드에서 전송)
      templateVariables,
    } = body || {} as {
      content?: string;
      homework_assigned?: string;
      templateVariables?: {
        오늘수업?: string;
        학습포인트?: string;
        선생님코멘트?: string;
        원장님코멘트?: string;
        숙제?: string;
        복습팁?: string;
      };
    };

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
        `SELECT s.id, s.name
         FROM students s
         JOIN class_enrollments ce ON ce.student_id = s.id
         WHERE ce.class_id = $1 AND (ce.status IS NULL OR ce.status = 'active')`,
        [lesson.class_id]
      );

      if (studentsResult.rows.length === 0) {
        return { success: false, error: "해당 반에 등록된 학생이 없습니다" };
      }

      // 템플릿 변수 준비
      const vars = templateVariables || {
        오늘수업: content || lesson.content || '-',
        학습포인트: '-',
        선생님코멘트: '-',
        원장님코멘트: '-',
        숙제: homework_assigned || lesson.homework_assigned || '-',
        복습팁: '-',
      };

      // 배치로 notification_queue에 추가
      const queueItems: NotificationQueuePayload[] = (studentsResult.rows as any[]).map((student) => ({
        student_id: student.id,
        lesson_id: id,
        오늘수업: vars.오늘수업 || '-',
        학습포인트: vars.학습포인트 || '-',
        선생님코멘트: vars.선생님코멘트 || '-',
        원장님코멘트: vars.원장님코멘트 || '-',
        숙제: vars.숙제 || '-',
        복습팁: vars.복습팁 || '-',
      }));

      const queueResult = await insertNotificationQueueBatch(
        client,
        lesson.org_id,
        'lesson_report',
        queueItems
      );

      console.log(`[lessons/:id/notify] Queued ${queueResult.insertedCount}/${queueItems.length} lesson_report notifications`);

      // 숙제가 있으면 과제 알림도 함께 발송
      let assignmentQueued = 0;
      const homeworkText = homework_assigned || lesson.homework_assigned;
      if (homeworkText && homeworkText.trim() !== '' && homeworkText !== '-') {
        // 마감일: 수업일 + 7일 (기본값)
        const lessonDate = new Date(lesson.lesson_date);
        const dueDate = new Date(lessonDate);
        dueDate.setDate(dueDate.getDate() + 7);
        const dueDateStr = dueDate.toISOString().split('T')[0];

        // assignment_new 알림 큐에 추가
        const assignmentQueueItems: NotificationQueuePayload[] = (studentsResult.rows as any[]).map((student) => ({
          student_id: student.id,
          class_id: lesson.class_id,
          class_name: lesson.class_name || '수업',
          title: homeworkText,
          due_date: dueDateStr,
        }));

        const assignmentQueueResult = await insertNotificationQueueBatch(
          client,
          lesson.org_id,
          'assignment_new',
          assignmentQueueItems
        );

        assignmentQueued = assignmentQueueResult.insertedCount;
        console.log(`[lessons/:id/notify] Queued ${assignmentQueued}/${assignmentQueueItems.length} assignment_new notifications`);
      }

      // notification_sent 업데이트
      await client.query(
        `UPDATE lessons SET notification_sent = true, notification_sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [id]
      );

      return {
        success: true,
        queued: queueResult.insertedCount,
        assignmentQueued,
        total_students: studentsResult.rows.length,
        studentNames: (studentsResult.rows as any[]).map(s => s.name),
      };
    });

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 404);
    }

    return c.json({
      success: true,
      message: `${(result as any).queued}명에게 알림이 예약되었습니다. 1분 내에 발송됩니다.`,
      queued: (result as any).queued,
      total_students: (result as any).total_students,
    }, 200);
  } catch (error: any) {
    console.error("[lessons/:id/notify] POST error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
