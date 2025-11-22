import { Hono } from "hono";
import type { Env } from "../env";
import { createClient } from "@supabase/supabase-js";

const app = new Hono<{ Bindings: Env }>();

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = body || {};
    if (!email || !password) return c.json({ error: "email and password required" }, 400);

    const supabase = createClient(c.env.NEXT_PUBLIC_SUPABASE_URL, c.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) return c.json({ error: error.message }, 400);

    return c.json({ user: data.user }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default app;
