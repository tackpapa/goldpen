import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();
const DEMO_ORG = "dddd0000-0000-0000-0000-000000000000";

const mapExpense = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  category_id: row.category_id,
  category_name: row.category_name,
  amount: Number(row.amount),
  description: row.description,
  expense_date: row.expense_date,
  payment_method: row.payment_method,
  created_at: row.created_at,
});

// GET /api/expenses
// summary options:
//  - monthly : 월별 지출 합계
//  - category: 카테고리별 지출 합계
// ?categories=1 -> 카테고리 목록
app.get("/", async (c) => {
  const summary = c.req.query("summary");
  const categories = c.req.query("categories");
  try {
    if (categories) {
      const cats = await withClient(c.env, async (client) => {
        const { rows } = await client.query(
          `SELECT * FROM expense_categories WHERE org_id = $1 ORDER BY created_at DESC`,
          [DEMO_ORG],
        );
        return rows;
      });
      return c.json({ categories: cats });
    }

    if (summary === "monthly") {
      const monthly = await withClient(c.env, async (client) => {
        const { rows } = await client.query(
          `
          SELECT to_char(expense_date, 'YYYY-MM') AS month,
                 SUM(amount)::numeric AS expenses
          FROM expenses
          WHERE org_id = $1
          GROUP BY 1
          ORDER BY 1
          `,
          [DEMO_ORG],
        );
        return rows;
      });
      return c.json({ monthly });
    }

    if (summary === "category") {
      const cats = await withClient(c.env, async (client) => {
        const { rows } = await client.query(
          `
          SELECT COALESCE(ec.name,'기타') AS category, SUM(e.amount)::numeric AS expenses
          FROM expenses e
          LEFT JOIN expense_categories ec ON ec.id = e.category_id
          WHERE e.org_id = $1
          GROUP BY 1
          ORDER BY 2 DESC
          `,
          [DEMO_ORG],
        );
        return rows;
      });
      return c.json({ categories: cats });
    }

    const expenses = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT e.*, ec.name AS category_name
         FROM expenses e
         LEFT JOIN expense_categories ec ON ec.id = e.category_id
         WHERE e.org_id = $1
         ORDER BY e.expense_date DESC, e.created_at DESC
         LIMIT 500`,
        [DEMO_ORG],
      );
      return rows.map(mapExpense);
    });
    return c.json({ expenses });
  } catch (error: any) {
    console.error("[expenses] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/expenses
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const {
      category_id = null,
      amount,
      description = null,
      expense_date,
      payment_method = null,
    } = body || {};

    if (amount === undefined || expense_date === undefined) {
      return c.json({ error: "amount and expense_date are required" }, 400);
    }

    const exp = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `
        INSERT INTO expenses (org_id, category_id, amount, description, expense_date, payment_method)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *
        `,
        [
          DEMO_ORG,
          category_id,
          amount,
          description,
          expense_date,
          payment_method,
        ],
      );
      return rows[0] ? mapExpense(rows[0]) : null;
    });

    return c.json({ expense: exp }, exp ? 201 : 500);
  } catch (error: any) {
    console.error("[expenses] POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
