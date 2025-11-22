import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

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
    return c.json({ ok: true }, 204);
  } catch (error: any) {
    console.error("[lessons/:id] DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
