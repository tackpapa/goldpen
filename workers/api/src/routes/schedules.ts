import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();
const DEMO_ORG = "dddd0000-0000-0000-0000-000000000000";

const mapSchedule = (row: any) => ({
  class_id: row.id,
  class_name: row.name,
  subject: row.subject,
  teacher_id: row.teacher_id,
  schedule: row.schedule || {},
  status: row.status,
});

/**
 * GET /api/schedules
 * Note: schedules는 classes.schedule JSONB를 그대로 노출
 */
app.get("/", async (c) => {
  try {
    const schedules = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT id, name, subject, teacher_id, schedule, status FROM classes WHERE org_id = $1`,
        [DEMO_ORG],
      );
      return rows.map(mapSchedule);
    });
    return c.json({ schedules });
  } catch (error: any) {
    console.error("[schedules] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/schedules
 * body: { class_id?, name?, subject?, teacher_id?, schedule(json) }
 * - class_id 존재 시 해당 클래스 schedule 업데이트
 * - 없으면 새 클래스 생성(name 필수)
 */
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const {
      class_id = null,
      name = null,
      subject = null,
      teacher_id = null,
      schedule = {},
    } = body || {};

    if (!class_id && !name)
      return c.json({ error: "name or class_id required" }, 400);

    const result = await withClient(c.env, async (client) => {
      if (class_id) {
        const { rows } = await client.query(
          `UPDATE classes SET schedule = $1, updated_at = now() WHERE id = $2 RETURNING id, name, subject, teacher_id, schedule, status`,
          [schedule, class_id],
        );
        return rows[0] ? mapSchedule(rows[0]) : null;
      } else {
        const { rows } = await client.query(
          `INSERT INTO classes (org_id, name, subject, teacher_id, schedule, status)
           VALUES ($1,$2,$3,$4,$5,'active')
           RETURNING id, name, subject, teacher_id, schedule, status`,
          [DEMO_ORG, name, subject, teacher_id, schedule],
        );
        return rows[0] ? mapSchedule(rows[0]) : null;
      }
    });

    if (!result) return c.json({ error: "Not found or insert failed" }, 404);
    return c.json({ schedule: result }, class_id ? 200 : 201);
  } catch (error: any) {
    console.error("[schedules] POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
