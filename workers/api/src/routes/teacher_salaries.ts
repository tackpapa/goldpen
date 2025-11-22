import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();
const DEMO_ORG = "dddd0000-0000-0000-0000-000000000000";

const mapSalary = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  teacher_id: row.teacher_id,
  amount: Number(row.amount),
  payment_date: row.payment_date,
  memo: row.memo,
  created_at: row.created_at,
});

// GET /api/teacher_salaries
app.get("/", async (c) => {
  const summary = c.req.query("summary");
  try {
    if (summary === "monthly") {
      const monthly = await withClient(c.env, async (client) => {
        const { rows } = await client.query(
          `SELECT to_char(payment_date,'YYYY-MM') AS month, SUM(amount)::numeric AS salary_sum
           FROM teacher_salaries WHERE org_id = $1 GROUP BY 1 ORDER BY 1`,
          [DEMO_ORG]
        );
        return rows;
      });
      return c.json({ monthly });
    }

    const salaries = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM teacher_salaries WHERE org_id = $1 ORDER BY payment_date DESC, created_at DESC LIMIT 200`,
        [DEMO_ORG]
      );
      return rows.map(mapSalary);
    });
    return c.json({ salaries });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/teacher_salaries
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { teacher_id = null, amount, payment_date, memo = null } = body || {};
    if (amount === undefined || payment_date === undefined) return c.json({ error: "amount and payment_date required" }, 400);

    const salary = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO teacher_salaries (org_id, teacher_id, amount, payment_date, memo)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [DEMO_ORG, teacher_id, amount, payment_date, memo]
      );
      return rows[0] ? mapSalary(rows[0]) : null;
    });
    return c.json({ salary }, salary ? 201 : 500);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default app;
