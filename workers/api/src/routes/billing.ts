import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";
import { getOrgIdFromRequest } from "../lib/supabase";

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

// GET /api/billing
// summary options:
//  - monthly : 월별 매출 합계
//  - net     : 월별 매출/지출/순이익
//  - category: 카테고리별 매출 합계
//  - teacher_salaries: 월별 급여 합계
app.get("/", async (c) => {
  try {
    const orgId = await getOrgIdFromRequest(c.req.raw, c.env);
    if (!orgId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const summary = c.req.query("summary");

    if (summary === "monthly") {
      const monthly = await withClient(c.env, async (client) => {
        const { rows } = await client.query(
          `
          SELECT to_char(payment_date, 'YYYY-MM') AS month,
                 SUM(amount)::numeric AS revenue
          FROM billing_transactions
          WHERE org_id = $1
          GROUP BY 1
          ORDER BY 1
          `,
          [orgId],
        );
        return rows;
      });
      return c.json({ monthly });
    }

    if (summary === "category") {
      const categories = await withClient(c.env, async (client) => {
        const { rows } = await client.query(
          `
          SELECT COALESCE(category, '기타') AS category, SUM(amount)::numeric AS revenue
          FROM billing_transactions
          WHERE org_id = $1
          GROUP BY 1
          ORDER BY 2 DESC
          `,
          [orgId],
        );
        return rows;
      });
      return c.json({ categories });
    }

    if (summary === "teacher_salaries") {
      const salaries = await withClient(c.env, async (client) => {
        const { rows } = await client.query(
          `
          SELECT to_char(payment_date, 'YYYY-MM') AS month,
                 SUM(amount)::numeric AS salary_sum
          FROM teacher_salaries
          WHERE org_id = $1
          GROUP BY 1
          ORDER BY 1
          `,
          [orgId],
        );
        return rows;
      });
      return c.json({ teacher_salaries: salaries });
    }

    if (summary === "net") {
      const data = await withClient(c.env, async (client) => {
        const revenue = await client.query(
          `
          SELECT to_char(payment_date, 'YYYY-MM') AS month,
                 SUM(amount)::numeric AS revenue
          FROM billing_transactions
          WHERE org_id = $1
          GROUP BY 1
          `,
          [orgId],
        );
        const expenses = await client.query(
          `
          SELECT to_char(expense_date, 'YYYY-MM') AS month,
                 SUM(amount)::numeric AS expenses
          FROM expenses
          WHERE org_id = $1
          GROUP BY 1
          `,
          [orgId],
        );
        const revMap = new Map<string, number>();
        revenue.rows.forEach((r: any) => revMap.set(r.month, Number(r.revenue)));
        const expMap = new Map<string, number>();
        expenses.rows.forEach((r: any) => expMap.set(r.month, Number(r.expenses)));
        const months = Array.from(
          new Set([...revMap.keys(), ...expMap.keys()]),
        ).sort();
        const net = months.map((m) => {
          const rev = revMap.get(m) || 0;
          const exp = expMap.get(m) || 0;
          return {
            month: m,
            revenue: rev,
            expenses: exp,
            net_profit: rev - exp,
          };
        });
        return net;
      });
      return c.json({ monthly_net: data });
    }

    const transactions = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM billing_transactions WHERE org_id = $1 ORDER BY payment_date DESC, created_at DESC LIMIT 500`,
        [orgId],
      );
      return rows.map(mapTrans);
    });
    return c.json({ transactions });
  } catch (error: any) {
    console.error("[billing] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/billing
app.post("/", async (c) => {
  try {
    const orgId = await getOrgIdFromRequest(c.req.raw, c.env);
    if (!orgId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const {
      student_id = null,
      category = null,
      amount,
      payment_method = null,
      payment_date,
      description = null,
    } = body || {};

    if (amount === undefined || payment_date === undefined) {
      return c.json({ error: "amount and payment_date are required" }, 400);
    }

    const trans = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `
        INSERT INTO billing_transactions (org_id, student_id, category, amount, payment_method, payment_date, description)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *
        `,
        [
          orgId,
          student_id,
          category,
          amount,
          payment_method,
          payment_date,
          description,
        ],
      );
      return rows[0] ? mapTrans(rows[0]) : null;
    });

    return c.json({ transaction: trans }, trans ? 201 : 500);
  } catch (error: any) {
    console.error("[billing] POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
