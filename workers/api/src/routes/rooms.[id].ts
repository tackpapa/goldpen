import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();

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

// GET /api/rooms/:id (mapped from classes)
app.get("/", async (c) => {
  const id = c.req.param("id");
  try {
    const room = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `SELECT id, org_id, name, 0::int as capacity, subject as type, status, created_at, updated_at FROM classes WHERE id = $1`,
        [id],
      );
      return rows[0] ? mapRoom(rows[0]) : null;
    });
    if (!room) return c.json({ error: "Not found" }, 404);
    return c.json({ room });
  } catch (error: any) {
    console.error("[rooms/:id] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/rooms/:id
app.put("/", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const fields = ["name", "type", "status"];
    const setParts: string[] = [];
    const values: any[] = [];
    if (body.name !== undefined) {
      setParts.push(`name = $${setParts.length + 1}`);
      values.push(body.name);
    }
    if (body.type !== undefined) {
      setParts.push(`subject = $${setParts.length + 1}`);
      values.push(body.type);
    }
    if (body.status !== undefined) {
      setParts.push(`status = $${setParts.length + 1}`);
      values.push(body.status);
    }
    if (!setParts.length) return c.json({ error: "No fields to update" }, 400);
    values.push(id);
    const room = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `UPDATE classes SET ${setParts.join(", ")}, updated_at = now() WHERE id = $${values.length} RETURNING id, org_id, name, 0::int as capacity, subject as type, status, created_at, updated_at`,
        values,
      );
      return rows[0] ? mapRoom(rows[0]) : null;
    });
    if (!room) return c.json({ error: "Not found" }, 404);
    return c.json({ room });
  } catch (error: any) {
    console.error("[rooms/:id] PUT error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/rooms/:id
app.delete("/", async (c) => {
  const id = c.req.param("id");
  try {
    const deleted = await withClient(c.env, async (client) => {
      const { rowCount } = await client.query(
        `DELETE FROM classes WHERE id = $1`,
        [id],
      );
      return rowCount;
    });
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true }, 204);
  } catch (error: any) {
    console.error("[rooms/:id] DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
