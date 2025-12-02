import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";
import { getOrgIdFromRequest } from "../lib/supabase";

const app = new Hono<{ Bindings: Env }>();

const mapAttendance = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  student_id: row.student_id,
  class_id: row.class_id,
  date: row.date,
  status: row.status,
  notes: row.notes,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

/**
 * GET /api/attendance
 */
app.get("/", async (c) => {
  try {
    const orgId = await getOrgIdFromRequest(c.req.raw, c.env);
    if (!orgId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const records = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM attendance WHERE org_id = $1 ORDER BY date DESC, created_at DESC LIMIT 500`,
        [orgId],
      );
      return rows.map(mapAttendance);
    });
    return c.json({ attendance: records });
  } catch (error: any) {
    console.error("[attendance] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/attendance
 * body: { student_id, class_id, date, status, notes }
 */
app.post("/", async (c) => {
  try {
    const orgId = await getOrgIdFromRequest(c.req.raw, c.env);
    if (!orgId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const {
      student_id,
      class_id = null,
      date,
      status,
      notes = null,
    } = body || {};
    if (!student_id || !date || !status) {
      return c.json({ error: "student_id, date, status are required" }, 400);
    }

    const rec = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `
        INSERT INTO attendance (org_id, student_id, class_id, date, status, notes)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *
        `,
        [orgId, student_id, class_id, date, status, notes],
      );
      return rows[0] ? mapAttendance(rows[0]) : null;
    });

    return c.json({ attendance: rec }, rec ? 201 : 500);
  } catch (error: any) {
    console.error("[attendance] POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
