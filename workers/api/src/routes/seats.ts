import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();
const DEMO_ORG = "dddd0000-0000-0000-0000-000000000000";

const mapSeat = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  number: row.number,
  type_name: row.type_name,
  status: row.status,
  student_id: row.student_id,
  check_in_time: row.check_in_time,
  session_start_time: row.session_start_time,
  allocated_minutes: row.allocated_minutes,
  pass_type: row.pass_type,
  seatsremainingtime: row.seatsremainingtime,
  remaining_days: row.remaining_days,
});

// GET /api/seats
app.get("/", async (c) => {
  try {
    const seats = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM seats WHERE org_id = $1 ORDER BY number`,
        [DEMO_ORG],
      );
      return rows.map(mapSeat);
    });
    return c.json({ seats });
  } catch (error: any) {
    console.error("[seats] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/seats  (create seat)
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { number, type_name = null } = body || {};
    if (number === undefined)
      return c.json({ error: "number is required" }, 400);
    const seat = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO seats (org_id, number, type_name) VALUES ($1,$2,$3) RETURNING *`,
        [DEMO_ORG, number, type_name],
      );
      return rows[0] ? mapSeat(rows[0]) : null;
    });
    return c.json({ seat }, seat ? 201 : 500);
  } catch (error: any) {
    console.error("[seats] POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/seats (update one seat by id)
app.patch("/", async (c) => {
  try {
    const body = await c.req.json();
    const {
      id,
      status,
      student_id,
      allocated_minutes,
      pass_type,
      seatsremainingtime,
      remaining_days,
      type_name,
    } = body || {};
    if (!id) return c.json({ error: "id is required" }, 400);
    const setParts: string[] = [];
    const values: any[] = [];
    const push = (col: string, val: any) => {
      setParts.push(`${col} = $${setParts.length + 1}`);
      values.push(val);
    };
    if (status !== undefined) push("status", status);
    if (student_id !== undefined) push("student_id", student_id);
    if (allocated_minutes !== undefined)
      push("allocated_minutes", allocated_minutes);
    if (pass_type !== undefined) push("pass_type", pass_type);
    if (seatsremainingtime !== undefined)
      push("seatsremainingtime", seatsremainingtime);
    if (remaining_days !== undefined) push("remaining_days", remaining_days);
    if (type_name !== undefined) push("type_name", type_name);

    if (!setParts.length) return c.json({ error: "No fields to update" }, 400);
    values.push(id);
    const seat = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `UPDATE seats SET ${setParts.join(", ")}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
        values,
      );
      return rows[0] ? mapSeat(rows[0]) : null;
    });
    if (!seat) return c.json({ error: "Not found" }, 404);
    return c.json({ seat });
  } catch (error: any) {
    console.error("[seats] PATCH error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
