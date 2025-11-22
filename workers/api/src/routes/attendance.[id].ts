import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

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

// GET /api/attendance/:id
app.get("/", async (c) => {
  const id = c.req.param("id");
  try {
    const rec = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM attendance WHERE id = $1`,
        [id],
      );
      return rows[0] ? mapAttendance(rows[0]) : null;
    });
    if (!rec) return c.json({ error: "Not found" }, 404);
    return c.json({ attendance: rec });
  } catch (error: any) {
    console.error("[attendance/:id] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/attendance/:id
app.patch("/", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const fields = ["student_id", "class_id", "date", "status", "notes"];
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
    const rec = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `UPDATE attendance SET ${setParts.join(", ")}, updated_at = now() WHERE id = $${
          values.length
        } RETURNING *`,
        values,
      );
      return rows[0] ? mapAttendance(rows[0]) : null;
    });
    if (!rec) return c.json({ error: "Not found" }, 404);
    return c.json({ attendance: rec });
  } catch (error: any) {
    console.error("[attendance/:id] PATCH error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/attendance/:id
app.delete("/", async (c) => {
  const id = c.req.param("id");
  try {
    const deleted = await withClient(c.env, async (client) => {
      const { rowCount } = await client.query(
        `DELETE FROM attendance WHERE id = $1`,
        [id],
      );
      return rowCount;
    });
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true }, 204);
  } catch (error: any) {
    console.error("[attendance/:id] DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
