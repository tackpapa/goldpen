import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";
import { getOrgIdFromRequest } from "../lib/supabase";

const app = new Hono<{ Bindings: Env }>();

const mapClass = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  name: row.name,
  subject: row.subject,
  teacher_id: row.teacher_id,
  schedule: row.schedule || {},
  status: row.status,
  created_at: row.created_at,
  updated_at: row.updated_at,
  capacity: row.capacity ?? 20,
  room: row.room,
  teacher_name: row.teacher_name ?? null,
  current_students: Number(row.current_students ?? 0),
  student_count: Number(row.current_students ?? 0),
  day_of_week:
    (Array.isArray(row.schedule) ? row.schedule[0]?.day_of_week : row.schedule?.day_of_week) ||
    (Array.isArray(row.schedule) ? row.schedule[0]?.day : row.schedule?.day) ||
    null,
  start_time:
    (Array.isArray(row.schedule) ? row.schedule[0]?.start_time : row.schedule?.start_time) ||
    (Array.isArray(row.schedule) ? row.schedule[0]?.start : row.schedule?.start) ||
    null,
  end_time:
    (Array.isArray(row.schedule) ? row.schedule[0]?.end_time : row.schedule?.end_time) ||
    (Array.isArray(row.schedule) ? row.schedule[0]?.end : row.schedule?.end) ||
    null,
});

/**
 * GET /api/classes
 */
app.get("/", async (c) => {
  try {
    const orgId = await getOrgIdFromRequest(c.req.raw, c.env);
    if (!orgId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const classes = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `
        SELECT
          c.*,
          t.name AS teacher_name,
          c.capacity,
          c.room,
          (
            SELECT COUNT(*)::int FROM students s WHERE s.class_id = c.id
          ) AS current_students
        FROM classes c
        LEFT JOIN teachers t ON t.id = c.teacher_id
        WHERE c.org_id = $1
        ORDER BY c.created_at DESC`,
        [orgId],
      );
      return rows.map(mapClass);
    });
    return c.json({ classes });
  } catch (error: any) {
    console.error("[classes] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/classes
 * body: { name (required), subject, teacher_id, schedule(json), status }
 */
app.post("/", async (c) => {
  try {
    const orgId = await getOrgIdFromRequest(c.req.raw, c.env);
    if (!orgId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const {
      name,
      subject = null,
      teacher_id = null,
      schedule = {},
      status = "active",
      capacity = 20,
      room = null,
    } = body || {};
    if (!name) return c.json({ error: "name is required" }, 400);

    const cls = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `
        INSERT INTO classes (org_id, name, subject, teacher_id, schedule, status, capacity, room)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *
        `,
        [orgId, name, subject, teacher_id, schedule, status, capacity, room],
      );
      return rows[0] ? mapClass(rows[0]) : null;
    });

    return c.json({ class: cls }, cls ? 201 : 500);
  } catch (error: any) {
    console.error("[classes] POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
