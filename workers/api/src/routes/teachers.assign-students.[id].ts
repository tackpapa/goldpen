import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();
const DEMO_ORG = "dddd0000-0000-0000-0000-000000000000";

/**
 * POST /api/teachers/:id/assign-students
 * body: { studentIds: string[] }
 * - clears previous assignments for this teacher
 * - assigns provided students to the teacher
 */
app.post("/", async (c) => {
  const teacherId = c.req.param("id");
  try {
    const { studentIds = [] } = (await c.req.json()) ?? {};
    const ids: string[] = Array.isArray(studentIds)
      ? studentIds.filter((v): v is string => !!v)
      : [];

    const result = await withClient(c.env, async (client) => {
      // 1) 모두 해제
      await client.query(
        `UPDATE students SET teacher_id = NULL WHERE org_id = $1 AND teacher_id = $2`,
        [DEMO_ORG, teacherId],
      );

      // 2) 새로 배정
      if (ids.length) {
        await client.query(
          `UPDATE students SET teacher_id = $1 WHERE org_id = $2 AND id = ANY($3::uuid[])`,
          [teacherId, DEMO_ORG, ids],
        );
      }

      // 3) 반환용 데이터
      const { rows } = await client.query(
        `SELECT id, name, grade, school, teacher_id FROM students WHERE org_id = $1 AND teacher_id = $2`,
        [DEMO_ORG, teacherId],
      );

      return rows;
    });

    return c.json({
      ok: true,
      assigned_students: result,
      assigned_count: result.length,
    });
  } catch (error: any) {
    console.error("[teachers/:id/assign-students] POST error:", error);
    return c.json({ error: error.message ?? "assign failed" }, 500);
  }
});

export default app;
