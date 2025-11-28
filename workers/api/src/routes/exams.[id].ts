import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();

const mapExam = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  title: row.title,
  subject: row.subject,
  exam_date: row.exam_date,
  max_score: row.max_score,
  description: row.description,
  created_at: row.created_at,
});

// GET /api/exams/:id
app.get("/", async (c) => {
  const id = c.req.param("id");
  try {
    const exam = await withClient(c.env, async (client) => {
      const { rows } = await client.query(`SELECT * FROM exams WHERE id = $1`, [
        id,
      ]);
      return rows[0] ? mapExam(rows[0]) : null;
    });
    if (!exam) return c.json({ error: "Not found" }, 404);
    return c.json({ exam });
  } catch (error: any) {
    console.error("[exams/:id] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/exams/:id
app.patch("/", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const fields = [
      "title",
      "subject",
      "exam_date",
      "max_score",
      "description",
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
    const exam = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `UPDATE exams SET ${setParts.join(", ")}, created_at = created_at WHERE id = $${values.length} RETURNING *`,
        values,
      );
      return rows[0] ? mapExam(rows[0]) : null;
    });
    if (!exam) return c.json({ error: "Not found" }, 404);
    return c.json({ exam });
  } catch (error: any) {
    console.error("[exams/:id] PATCH error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/exams/:id
app.delete("/", async (c) => {
  const id = c.req.param("id");
  try {
    const deleted = await withClient(c.env, async (client) => {
      const { rowCount } = await client.query(
        `DELETE FROM exams WHERE id = $1`,
        [id],
      );
      return rowCount;
    });
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true }, 200);
  } catch (error: any) {
    console.error("[exams/:id] DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
