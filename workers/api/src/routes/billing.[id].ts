import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();

const mapTrans = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  student_id: row.student_id,
  category: row.category,
  amount: Number(row.amount),
  payment_method: row.payment_method,
  payment_date: row.payment_date,
  description: row.description,
  created_at: row.created_at,
});

// GET /api/billing/:id
app.get("/", async (c) => {
  const id = c.req.param("id");
  try {
    const trans = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM billing_transactions WHERE id = $1`,
        [id],
      );
      return rows[0] ? mapTrans(rows[0]) : null;
    });
    if (!trans) return c.json({ error: "Not found" }, 404);
    return c.json({ transaction: trans });
  } catch (error: any) {
    console.error("[billing/:id] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/billing/:id
app.patch("/", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const fields = [
      "student_id",
      "category",
      "amount",
      "payment_method",
      "payment_date",
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
    const trans = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `UPDATE billing_transactions SET ${setParts.join(", ")}, created_at = created_at WHERE id = $${values.length} RETURNING *`,
        values,
      );
      return rows[0] ? mapTrans(rows[0]) : null;
    });
    if (!trans) return c.json({ error: "Not found" }, 404);
    return c.json({ transaction: trans });
  } catch (error: any) {
    console.error("[billing/:id] PATCH error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/billing/:id
app.delete("/", async (c) => {
  const id = c.req.param("id");
  try {
    const deleted = await withClient(c.env, async (client) => {
      const { rowCount } = await client.query(
        `DELETE FROM billing_transactions WHERE id = $1`,
        [id],
      );
      return rowCount;
    });
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true }, 200);
  } catch (error: any) {
    console.error("[billing/:id] DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
