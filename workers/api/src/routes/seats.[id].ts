import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();

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

// GET /api/seats/:id
app.get("/", async (c) => {
  const id = c.req.param("id");
  try {
    const seat = await withClient(c.env, async (client) => {
      const { rows } = await client.query(`SELECT * FROM seats WHERE id = $1`, [
        id,
      ]);
      return rows[0] ? mapSeat(rows[0]) : null;
    });
    if (!seat) return c.json({ error: "Not found" }, 404);
    return c.json({ seat });
  } catch (error: any) {
    console.error("[seats/:id] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/seats/:id
app.delete("/", async (c) => {
  const id = c.req.param("id");
  try {
    const deleted = await withClient(c.env, async (client) => {
      const { rowCount } = await client.query(
        `DELETE FROM seats WHERE id = $1`,
        [id],
      );
      return rowCount;
    });
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true }, 204);
  } catch (error: any) {
    console.error("[seats/:id] DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
