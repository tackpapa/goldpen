import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();

const mapExpense = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  category_id: row.category_id,
  amount: Number(row.amount),
  description: row.description,
  expense_date: row.expense_date,
  payment_method: row.payment_method,
  created_at: row.created_at,
});

// GET /api/expenses/:id
app.get("/", async (c) => {
  const id = c.req.param("id");
  try {
    const exp = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM expenses WHERE id = $1`,
        [id],
      );
      return rows[0] ? mapExpense(rows[0]) : null;
    });
    if (!exp) return c.json({ error: "Not found" }, 404);
    return c.json({ expense: exp });
  } catch (error: any) {
    console.error("[expenses/:id] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/expenses/:id
app.patch("/", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const fields = [
      "category_id",
      "amount",
      "description",
      "expense_date",
      "payment_method",
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
    const exp = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `UPDATE expenses SET ${setParts.join(", ")}, created_at = created_at WHERE id = $${values.length} RETURNING *`,
        values,
      );
      return rows[0] ? mapExpense(rows[0]) : null;
    });
    if (!exp) return c.json({ error: "Not found" }, 404);
    return c.json({ expense: exp });
  } catch (error: any) {
    console.error("[expenses/:id] PATCH error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/expenses/:id
app.delete("/", async (c) => {
  const id = c.req.param("id");
  try {
    const deleted = await withClient(c.env, async (client) => {
      const { rowCount } = await client.query(
        `DELETE FROM expenses WHERE id = $1`,
        [id],
      );
      return rowCount;
    });
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true }, 200);
  } catch (error: any) {
    console.error("[expenses/:id] DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
