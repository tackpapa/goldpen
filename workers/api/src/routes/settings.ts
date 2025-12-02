import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";
import { getOrgIdFromRequest } from "../lib/supabase";

const app = new Hono<{ Bindings: Env }>();

const mapOrg = (row: any) => ({
  id: row.id,
  name: row.name,
  owner_name: row.owner_name,
  address: row.address,
  phone: row.phone,
  email: row.email,
  logo_url: row.logo_url,
  settings: row.settings || {
    auto_sms: false,
    auto_email: false,
    notification_enabled: false,
  },
});

const mapBranch = (row: any) => ({
  id: row.id,
  org_id: row.org_id,
  name: row.name,
  address: row.address,
  phone: row.phone,
  manager_name: row.manager_name,
  status: row.status,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

// GET /api/settings
app.get("/", async (c) => {
  try {
    const orgId = await getOrgIdFromRequest(c.req.raw, c.env);
    if (!orgId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = await withClient(c.env, async (client) => {
      const orgRes = await client.query(`SELECT * FROM organizations WHERE id = $1 LIMIT 1`, [orgId]);
      const org = orgRes.rows[0] ? mapOrg(orgRes.rows[0]) : null;

      const { rows: branchRows } = await client.query(
        `SELECT * FROM branches WHERE org_id = $1 ORDER BY created_at DESC`,
        [orgId],
      );
      const branches = branchRows.map(mapBranch);

      // rooms: map from classes as fallback
      const { rows: roomRows } = await client.query(
        `SELECT id, org_id, name, 0::int as capacity, subject as type, status, created_at, updated_at FROM classes WHERE org_id = $1`,
        [orgId],
      );
      const rooms = roomRows.map((r: any) => ({
        id: r.id,
        org_id: r.org_id,
        name: r.name,
        capacity: r.capacity,
        status: r.status,
      }));

      return { organization: org, branches, rooms };
    });

    return c.json(data);
  } catch (error: any) {
    console.error("[settings] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/settings  (organization info + settings JSON)
app.put("/", async (c) => {
  try {
    const orgId = await getOrgIdFromRequest(c.req.raw, c.env);
    if (!orgId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const fields = [
      "name",
      "owner_name",
      "address",
      "phone",
      "email",
      "logo_url",
      "settings",
    ];
    const setParts: string[] = [];
    const values: any[] = [];
    fields.forEach((f) => {
      if (body[f] !== undefined) {
        setParts.push(`${f} = $${setParts.length + 1}`);
        values.push(body[f]);
      }
    });

    if (!setParts.length) return c.json({ error: "No fields to update" }, 400);

    // Add orgId as the last parameter
    values.push(orgId);

    const updated = await withClient(c.env, async (client) => {
      const { rows } = await client.query(
        `UPDATE organizations SET ${setParts.join(", ")}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
        values,
      );
      return rows[0] ? mapOrg(rows[0]) : null;
    });

    if (!updated) return c.json({ error: "organization row missing" }, 404);
    return c.json({ organization: updated });
  } catch (error: any) {
    console.error("[settings] PUT error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
