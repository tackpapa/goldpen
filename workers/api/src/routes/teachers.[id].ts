import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();

const mapTeacher = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  user_id: row.user_id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  subjects: row.subjects || [],
  status: row.status,
  employment_type: row.employment_type,
  salary_type: row.salary_type,
  salary_amount: row.salary_amount,
  hire_date: row.hire_date,
  notes: row.notes ?? "",
  created_at: row.created_at,
  updated_at: row.updated_at,
});

// GET /api/teachers/:id
app.get("/", async (c) => {
  const id = c.req.param("id");
  try {
    const teacher = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM teachers WHERE id = $1`,
        [id],
      );
      return rows[0] ? mapTeacher(rows[0]) : null;
    });
    if (!teacher) return c.json({ error: "Not found" }, 404);
    return c.json({ teacher });
  } catch (error: any) {
    console.error("[teachers/:id] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/teachers/:id
app.put("/", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const fields = [
      "name",
      "email",
      "phone",
      "subjects",
      "status",
      "employment_type",
      "salary_type",
      "salary_amount",
      "hire_date",
      "notes",
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
    const teacher = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `UPDATE teachers SET ${setParts.join(", ")}, updated_at = now() WHERE id = $${
          values.length
        } RETURNING *`,
        values,
      );
      return rows[0] ? mapTeacher(rows[0]) : null;
    });
    if (!teacher) return c.json({ error: "Not found" }, 404);
    return c.json({ teacher });
  } catch (error: any) {
    console.error("[teachers/:id] PUT error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/teachers/:id
app.delete("/", async (c) => {
  const id = c.req.param("id");
  try {
    const deleted = await withClient(c.env, async (client) => {
      const { rowCount } = await client.query(
        `DELETE FROM teachers WHERE id = $1`,
        [id],
      );
      return rowCount;
    });
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true }, 204);
  } catch (error: any) {
    console.error("[teachers/:id] DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
