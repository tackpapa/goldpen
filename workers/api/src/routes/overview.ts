import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();
const DEMO_ORG = "dddd0000-0000-0000-0000-000000000000";

/**
 * GET /api/overview
 * returns high-level counts for dashboard
 */
app.get("/", async (c) => {
  try {
    const data = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `
        SELECT
          (SELECT COUNT(*)::int FROM students WHERE org_id = $1) AS total_students,
          (SELECT COUNT(*)::int FROM teachers WHERE org_id = $1) AS total_teachers,
          (SELECT COUNT(*)::int FROM classes WHERE org_id = $1) AS total_classes,
          (SELECT COUNT(*)::int FROM lessons WHERE org_id = $1) AS total_lessons
        `,
        [DEMO_ORG],
      );
      return rows[0];
    });

    return c.json({ overview: data });
  } catch (error: any) {
    console.error("[overview] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
