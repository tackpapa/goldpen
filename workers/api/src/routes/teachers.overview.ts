import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();
const DEMO_ORG = "dddd0000-0000-0000-0000-000000000000";

/**
 * GET /api/teachers/overview
 * returns teachers with aggregated student/class counts (frontend expects this path)
 */
app.get("/", async (c) => {
  try {
    const teachers = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `
        WITH student_counts AS (
          SELECT teacher_id, COUNT(*)::int AS cnt
          FROM students
          WHERE org_id = $1
          GROUP BY teacher_id
        ),
        class_counts AS (
          SELECT teacher_id, COUNT(*)::int AS cnt
          FROM classes
          WHERE org_id = $1
          GROUP BY teacher_id
        )
        SELECT
          t.*,
          COALESCE(sc.cnt, 0) AS assigned_students_count,
          COALESCE(cc.cnt, 0) AS assigned_classes_count
        FROM teachers t
        LEFT JOIN student_counts sc ON sc.teacher_id = t.id
        LEFT JOIN class_counts cc ON cc.teacher_id = t.id
        WHERE t.org_id = $1
        ORDER BY t.created_at DESC
        `,
        [DEMO_ORG],
      );
      return rows.map((row) => ({
        ...row,
        subjects: row.subjects || [],
        assigned_students_count: Number(row.assigned_students_count || 0),
        assigned_classes_count: Number(row.assigned_classes_count || 0),
      }));
    });

    return c.json({ teachers });
  } catch (error: any) {
    console.error("[teachers/overview] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
