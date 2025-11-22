import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();

const mapStudent = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  name: row.name,
  phone: row.phone,
  grade: row.grade,
  teacher_id: row.teacher_id,
  class_id: row.class_id,
  school: row.school,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

// GET /api/students/:id
app.get("/", async (c) => {
  const id = c.req.param("id");
  try {
    const student = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM students WHERE id = $1`,
        [id],
      );
      return rows[0] ? mapStudent(rows[0]) : null;
    });
    if (!student) return c.json({ error: "Not found" }, 404);
    return c.json({ student });
  } catch (error: any) {
    console.error("[students/:id] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/students/:id
app.patch("/", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const fields = ["name", "phone", "grade", "school", "teacher_id", "class_id"];
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
    const student = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `UPDATE students SET ${setParts.join(", ")}, updated_at = now() WHERE id = $${
          values.length
        } RETURNING *`,
        values,
      );
      return rows[0] ? mapStudent(rows[0]) : null;
    });
    if (!student) return c.json({ error: "Not found" }, 404);
    return c.json({ student });
  } catch (error: any) {
    console.error("[students/:id] PATCH error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/students/:id
app.delete("/", async (c) => {
  const id = c.req.param("id");
  try {
    const deleted = await withClient(c.env, async (client) => {
      const { rowCount } = await client.query(
        `DELETE FROM students WHERE id = $1`,
        [id],
      );
      return rowCount;
    });
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true }, 204);
  } catch (error: any) {
    console.error("[students/:id] DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
