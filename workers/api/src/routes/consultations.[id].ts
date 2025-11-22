import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();

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

// GET /api/consultations/:id
app.get("/", async (c) => {
  const id = c.req.param("id");
  try {
    const item = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM consultations WHERE id = $1`,
        [id],
      );
      return rows[0] ? mapConsultation(rows[0]) : null;
    });
    if (!item) return c.json({ error: "Not found" }, 404);
    return c.json({ consultation: item });
  } catch (error: any) {
    console.error("[consultations/:id] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/consultations/:id
app.patch("/", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const fields = [
      "student_id",
      "teacher_id",
      "date",
      "type",
      "summary",
      "notes",
      "status",
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
        `UPDATE consultations SET ${setParts.join(", ")}, updated_at = now() WHERE id = $${
          values.length
        } RETURNING *`,
        values,
      );
      return rows[0] ? mapConsultation(rows[0]) : null;
    });
    if (!item) return c.json({ error: "Not found" }, 404);
    return c.json({ consultation: item });
  } catch (error: any) {
    console.error("[consultations/:id] PATCH error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/consultations/:id
app.delete("/", async (c) => {
  const id = c.req.param("id");
  try {
    const deleted = await withClient(c.env, async (client) => {
      const { rowCount } = await client.query(
        `DELETE FROM consultations WHERE id = $1`,
        [id],
      );
      return rowCount;
    });
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true }, 204);
  } catch (error: any) {
    console.error("[consultations/:id] DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
