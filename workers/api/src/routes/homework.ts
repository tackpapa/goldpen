import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

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
      return rows[0] ? mapHw(rows[0]) : null;
    });

    return c.json({ homework: item }, item ? 201 : 500);
  } catch (error: any) {
    console.error("[homework] POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
