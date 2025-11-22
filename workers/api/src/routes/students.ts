import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();
const DEMO_ORG = "dddd0000-0000-0000-0000-000000000000";

const mapStudent = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  name: row.name,
  phone: row.phone,
  grade: row.grade,
  teacher_id: row.teacher_id,
  class_id: row.class_id,
  school: row.school,
  created_at: row.created_at,
});

/**
 * GET /api/students
 */
app.get("/", async (c) => {
  try {
    const students = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM students WHERE org_id = $1 ORDER BY created_at DESC`,
        [DEMO_ORG],
      );
      return rows.map(mapStudent);
    });

    return c.json({ students });
  } catch (error: any) {
    console.error("[students] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/students
 */
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const {
      name,
      phone = null,
      grade = null,
      school = null,
      teacher_id = null,
      class_id = null,
    } = body || {};

    if (!name) return c.json({ error: "name is required" }, 400);

    const student = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `
        INSERT INTO students (org_id, name, phone, grade, school, teacher_id, class_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *
        `,
        [DEMO_ORG, name, phone, grade, school, teacher_id, class_id],
      );
      return rows[0] ? mapStudent(rows[0]) : null;
    });

    return c.json({ student }, student ? 201 : 500);
  } catch (error: any) {
    console.error("[students] POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
