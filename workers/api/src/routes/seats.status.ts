import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();

// GET /api/seats/status?date=YYYY-MM-DD&student_ids=comma,separated
// Returns sleep_records, outing_records, call_records for given date (default today)
app.get("/", async (c) => {
  const url = new URL(c.req.url);
  const date =
    url.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const idsParam = url.searchParams.get("student_ids");
  const studentIds = idsParam ? idsParam.split(",") : [];

  try {
    const data = await withClient(c.env, async (client) => {
      const sleep = await client.query(
        `SELECT * FROM sleep_records WHERE date = $1 ${studentIds.length ? "AND student_id = ANY($2)" : ""}`,
        studentIds.length ? [date, studentIds] : [date],
      );
      const outing = await client.query(
        `SELECT * FROM outing_records WHERE date = $1 ${studentIds.length ? "AND student_id = ANY($2)" : ""}`,
        studentIds.length ? [date, studentIds] : [date],
      );
      const call = await client.query(
        `SELECT * FROM call_records WHERE date = $1 ${studentIds.length ? "AND student_id = ANY($2)" : ""}`,
        studentIds.length ? [date, studentIds] : [date],
      );
      return { sleep: sleep.rows, outing: outing.rows, call: call.rows };
    });

    return c.json(data);
  } catch (err: any) {
    console.error("[seats/status] error", err);
    return c.json({ error: err.message }, 500);
  }
});

export default app;
