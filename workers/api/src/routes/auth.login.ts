import { Hono } from "hono";
import type { Env } from "../env";
import { createClient } from "@supabase/supabase-js";

const app = new Hono<{ Bindings: Env }>();

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body || {};
    if (!email || !password)
      return c.json({ error: "email and password required" }, 400);

    const supabase = createClient(
      c.env.NEXT_PUBLIC_SUPABASE_URL,
      c.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session) {
      return c.json({ error: error?.message || "login failed" }, 401);
    }

    // 전달할 최소 정보
    return c.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: data.user,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default app;
