import { Hono } from "hono";
import type { Env } from "../env";
import { withClient } from "../lib/db";

const app = new Hono<{ Bindings: Env }>();

// Returns list of applied migrations from supabase migration table if exists
app.get("/", async (c) => {
  try {
    const rows = await withClient(c.env, async (client) => {
      const res = await client.query(
        `SELECT * FROM supabase_migrations ORDER BY version DESC LIMIT 50`,
      );
      return res.rows;
    });
    return c.json({ migrations: rows });
  } catch (err: any) {
    // If table not exist, just return ok
    return c.json({
      migrations: [],
      note: "migration table missing or inaccessible",
    });
  }
});

// No-op apply endpoint (safety)
app.post("/", async (c) => {
  return c.json({
    ok: true,
    note: "server-side migrations are managed separately",
  });
});

export default app;
