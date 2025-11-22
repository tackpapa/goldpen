import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();
const DEMO_ORG = "dddd0000-0000-0000-0000-000000000000";

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

const mapClassForSchedule = (row: any) => {
  // schedule can be json object or array
  const schedule = row.schedule || {};
  let day_of_week: string | null = null;
  let start_time: string | null = null;
  let end_time: string | null = null;

  const pick = Array.isArray(schedule) ? schedule[0] : schedule;
  if (pick) {
    day_of_week = pick.day_of_week || pick.day || null;
    start_time = pick.start_time || pick.start || null;
    end_time = pick.end_time || pick.end || null;
  }

  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    student_count: Number(row.student_count ?? 0),
    day_of_week,
    start_time,
    end_time,
  };
};

/**
 * GET /api/teachers/:id/modal
 * returns teacher + classes + students for modal
 */
app.get("/", async (c) => {
  const id = c.req.param("id");
  try {
    const data = await withClient(c.env, async (client) => {
      const teacherRes = await client.query(
        `SELECT * FROM teachers WHERE id = $1 AND org_id = $2`,
        [id, DEMO_ORG],
      );
      const teacher = teacherRes.rows[0] ? mapTeacher(teacherRes.rows[0]) : null;
      if (!teacher) return null;

      const studentsRes = await client.query(
        `SELECT id, name, grade, school, teacher_id FROM students WHERE org_id = $1 AND teacher_id = $2 ORDER BY name`,
        [DEMO_ORG, id],
      );

      const classesRes = await client.query(
        `
          SELECT
            c.*,
            (SELECT COUNT(*)::int FROM students s WHERE s.class_id = c.id) AS student_count
          FROM classes c
          WHERE c.org_id = $1 AND c.teacher_id = $2
          ORDER BY c.created_at DESC
        `,
        [DEMO_ORG, id],
      );

      return {
        teacher,
        students: studentsRes.rows,
        classes: classesRes.rows.map(mapClassForSchedule),
      };
    });

    if (!data) return c.json({ error: "Not found" }, 404);
    return c.json(data);
  } catch (error: any) {
    console.error("[teachers/:id/modal] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
