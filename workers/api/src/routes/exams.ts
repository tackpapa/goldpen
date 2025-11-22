import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();
const DEMO_ORG = "dddd0000-0000-0000-0000-000000000000";

const mapExam = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  title: row.title,
  subject: row.subject,
  exam_date: row.exam_date,
  max_score: row.max_score,
  description: row.description,
  created_at: row.created_at,
});

// GET /api/exams
app.get("/", async (c) => {
  try {
    const exams = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM exams WHERE org_id = $1 ORDER BY exam_date DESC, created_at DESC LIMIT 200`,
        [DEMO_ORG],
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
    const body = await c.req.json();
    const {
      title,
      subject = null,
      exam_date,
      max_score = null,
      description = null,
    } = body || {};
    if (!title || !exam_date)
      return c.json({ error: "title and exam_date required" }, 400);

    const exam = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO exams (org_id, title, subject, exam_date, max_score, description)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [DEMO_ORG, title, subject, exam_date, max_score, description],
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
