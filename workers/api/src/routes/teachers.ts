import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();
const DEMO_ORG = "dddd0000-0000-0000-0000-000000000000";

// Normalize teacher row
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
  lesson_note_token: row.lesson_note_token ?? null,
  assigned_students_count: Number(row.assigned_students_count || 0),
  assigned_classes_count: Number(row.assigned_classes_count || 0),
});

/**
 * GET /api/teachers
 * returns teachers with assigned student/class counts
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
      return rows.map(mapTeacher);
    });

    return c.json({ teachers });
  } catch (error: any) {
    console.error("[teachers] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/teachers
 * body: { name, email, phone, subjects[], status, employment_type, salary_type, salary_amount, hire_date, notes }
 */
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const {
      name,
      email,
      phone,
      subjects = [],
      status = "active",
      employment_type = "full_time",
      salary_type = "monthly",
      salary_amount = 0,
      hire_date = null,
      notes = "",
    } = body || {};

    if (!name) return c.json({ error: "name is required" }, 400);

    const inserted = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `
        INSERT INTO teachers (
          org_id, name, email, phone, subjects, status,
          employment_type, salary_type, salary_amount, hire_date, notes
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING *
        `,
        [
          DEMO_ORG,
          name,
          email ?? null,
          phone ?? null,
          subjects,
          status,
          employment_type,
          salary_type,
          salary_amount,
          hire_date,
          notes,
        ],
      );
      return rows[0] ? mapTeacher(rows[0]) : null;
    });

    return c.json({ teacher: inserted }, inserted ? 201 : 500);
  } catch (error: any) {
    console.error("[teachers] POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
