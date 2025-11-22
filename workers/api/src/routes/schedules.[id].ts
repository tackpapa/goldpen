import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();

const mapSchedule = (row: any) => ({
  class_id: row.id,
  class_name: row.name,
  subject: row.subject,
  teacher_id: row.teacher_id,
  schedule: row.schedule || {},
  status: row.status,
});

// GET /api/schedules/:id (maps to classes.schedule)
app.get("/", async (c) => {
  const id = c.req.param("id");
  try {
    const sched = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT id, name, subject, teacher_id, schedule, status FROM classes WHERE id = $1`,
        [id],
      );
      return rows[0] ? mapSchedule(rows[0]) : null;
    });
    if (!sched) return c.json({ error: "Not found" }, 404);
    return c.json({ schedule: sched });
  } catch (error: any) {
    console.error("[schedules/:id] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/schedules/:id (replace schedule json)
app.put("/", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const { schedule = {} } = body || {};
    const sched = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `UPDATE classes SET schedule = $1, updated_at = now() WHERE id = $2 RETURNING id, name, subject, teacher_id, schedule, status`,
        [schedule, id],
      );
      return rows[0] ? mapSchedule(rows[0]) : null;
    });
    if (!sched) return c.json({ error: "Not found" }, 404);
    return c.json({ schedule: sched });
  } catch (error: any) {
    console.error("[schedules/:id] PUT error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/schedules/:id (clears schedule json)
app.delete("/", async (c) => {
  const id = c.req.param("id");
  try {
    const sched = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `UPDATE classes SET schedule = '{}'::jsonb, updated_at = now() WHERE id = $1 RETURNING id, name, subject, teacher_id, schedule, status`,
        [id],
      );
      return rows[0] ? mapSchedule(rows[0]) : null;
    });
    if (!sched) return c.json({ error: "Not found" }, 404);
    return c.json({ schedule: sched });
  } catch (error: any) {
    console.error("[schedules/:id] DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
