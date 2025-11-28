import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();

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

// GET /api/homework/:id
app.get("/", async (c) => {
  const id = c.req.param("id");
  try {
    const item = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM homework WHERE id = $1`,
        [id],
      );
      return rows[0] ? mapHw(rows[0]) : null;
    });
    if (!item) return c.json({ error: "Not found" }, 404);
    return c.json({ homework: item });
  } catch (error: any) {
    console.error("[homework/:id] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/homework/:id
app.patch("/", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const fields = [
      "title",
      "description",
      "due_date",
      "class_id",
      "teacher_id",
      "status",
      "submission_url",
    ];
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
    const item = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `UPDATE homework SET ${setParts.join(", ")}, created_at = created_at WHERE id = $${values.length} RETURNING *`,
        values,
      );
      return rows[0] ? mapHw(rows[0]) : null;
    });
    if (!item) return c.json({ error: "Not found" }, 404);
    return c.json({ homework: item });
  } catch (error: any) {
    console.error("[homework/:id] PATCH error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/homework/:id
app.delete("/", async (c) => {
  const id = c.req.param("id");
  try {
    const deleted = await withClient(c.env, async (client) => {
      const { rowCount } = await client.query(
        `DELETE FROM homework WHERE id = $1`,
        [id],
      );
      return rowCount;
    });
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true }, 200);
  } catch (error: any) {
    console.error("[homework/:id] DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
