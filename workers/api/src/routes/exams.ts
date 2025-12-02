import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";
import { getOrgIdFromRequest } from "../lib/supabase";

const app = new Hono<{ Bindings: Env }>();

const mapExam = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  class_id: row.class_id,
  title: row.title,
  subject: row.subject,
  exam_date: row.exam_date,
  exam_time: row.exam_time,
  duration_minutes: row.duration_minutes,
  total_score: row.total_score,
  description: row.description,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

// GET /api/exams
app.get("/", async (c) => {
  try {
    const orgId = await getOrgIdFromRequest(c.req.raw, c.env);
    if (!orgId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const exams = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM exams WHERE org_id = $1 ORDER BY exam_date DESC, created_at DESC LIMIT 200`,
        [orgId],
      );
      return rows.map(mapExam);
    });
    return c.json({ exams });
  } catch (error: any) {
    console.error("[exams] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/exams
app.post("/", async (c) => {
  try {
    const orgId = await getOrgIdFromRequest(c.req.raw, c.env);
    if (!orgId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const {
      class_id,
      title,
      subject,
      exam_date,
      exam_time = null,
      duration_minutes = null,
      total_score = 100,
      description = null,
    } = body || {};

    if (!class_id || !title || !subject || !exam_date)
      return c.json({ error: "class_id, title, subject, exam_date required" }, 400);

    const exam = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO exams (org_id, class_id, title, subject, exam_date, exam_time, duration_minutes, total_score, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [orgId, class_id, title, subject, exam_date, exam_time, duration_minutes, total_score, description],
      );
      return rows[0] ? mapExam(rows[0]) : null;
    });

    return c.json({ exam }, exam ? 201 : 500);
  } catch (error: any) {
    console.error("[exams] POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
