import { Hono } from "hono";
import type { Env } from "../env";
import { createClient } from "@supabase/supabase-js";
import { getAuthToken } from "../lib/supabase";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  try {
    const supabase = createClient(
      c.env.NEXT_PUBLIC_SUPABASE_URL,
      c.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );

    const token = getAuthToken(c.req.raw);
    if (token) {
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: "",
      });
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return c.json({ error: "unauthorized" }, 401);
    return c.json({ user: data.user });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default app;
