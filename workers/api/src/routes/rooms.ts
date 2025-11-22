import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();
const DEMO_ORG = "dddd0000-0000-0000-0000-000000000000";

const mapRoom = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  name: row.name,
  capacity: row.capacity,
  type: row.type,
  status: row.status,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

// rooms table is not in initial schema; we create a lightweight in-memory view via classes
// For now, map classes as rooms-like data

// GET /api/rooms
app.get("/", async (c) => {
  try {
    const rooms = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT id, org_id, name, 0::int as capacity, subject as type, status, created_at, updated_at
         FROM classes WHERE org_id = $1 ORDER BY created_at DESC`,
        [DEMO_ORG],
      );
      return rows.map(mapRoom);
    });
    return c.json({ rooms });
  } catch (error: any) {
    console.error("[rooms] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/rooms -> create class as room
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { name, type = null, status = "active" } = body || {};
    if (!name) return c.json({ error: "name is required" }, 400);

    const room = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO classes (org_id, name, subject, status) VALUES ($1,$2,$3,$4) RETURNING id, org_id, name, 0::int as capacity, subject as type, status, created_at, updated_at`,
        [DEMO_ORG, name, type, status],
      );
      return rows[0] ? mapRoom(rows[0]) : null;
    });

    return c.json({ room }, room ? 201 : 500);
  } catch (error: any) {
    console.error("[rooms] POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
