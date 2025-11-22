import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();
const DEMO_ORG = "dddd0000-0000-0000-0000-000000000000";

const mapConsultation = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  student_id: row.student_id,
  teacher_id: row.teacher_id,
  date: row.date,
  type: row.type,
  summary: row.summary,
  notes: row.notes,
  status: row.status,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

/**
 * GET /api/consultations
 */
app.get("/", async (c) => {
  try {
    const items = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM consultations WHERE org_id = $1 ORDER BY date DESC LIMIT 500`,
        [DEMO_ORG],
      );
      return rows.map(mapConsultation);
    });
    return c.json({ consultations: items });
  } catch (error: any) {
    console.error("[consultations] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/consultations
 */
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const {
      student_id = null,
      teacher_id = null,
      date,
      type = null,
      summary = null,
      notes = null,
      status = "scheduled",
    } = body || {};

    if (!date) return c.json({ error: "date is required" }, 400);

    const item = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `
        INSERT INTO consultations (org_id, student_id, teacher_id, date, type, summary, notes, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *
        `,
        [DEMO_ORG, student_id, teacher_id, date, type, summary, notes, status],
      );
      return rows[0] ? mapConsultation(rows[0]) : null;
    });

    return c.json({ consultation: item }, item ? 201 : 500);
  } catch (error: any) {
    console.error("[consultations] POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
