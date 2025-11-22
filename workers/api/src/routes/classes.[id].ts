import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

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
});

// GET /api/classes/:id
app.get("/", async (c) => {
  const id = c.req.param("id");
  try {
    const cls = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM classes WHERE id = $1`,
        [id],
      );
      return rows[0] ? mapClass(rows[0]) : null;
    });
    if (!cls) return c.json({ error: "Not found" }, 404);
    return c.json({ class: cls });
  } catch (error: any) {
    console.error("[classes/:id] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/classes/:id
app.patch("/", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const fields = ["name", "subject", "teacher_id", "schedule", "status"];
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
    const cls = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `UPDATE classes SET ${setParts.join(", ")}, updated_at = now() WHERE id = $${
          values.length
        } RETURNING *`,
        values,
      );
      return rows[0] ? mapClass(rows[0]) : null;
    });
    if (!cls) return c.json({ error: "Not found" }, 404);
    return c.json({ class: cls });
  } catch (error: any) {
    console.error("[classes/:id] PATCH error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/classes/:id
app.delete("/", async (c) => {
  const id = c.req.param("id");
  try {
    const deleted = await withClient(c.env, async (client) => {
      const { rowCount } = await client.query(
        `DELETE FROM classes WHERE id = $1`,
        [id],
      );
      return rowCount;
    });
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true }, 204);
  } catch (error: any) {
    console.error("[classes/:id] DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
