import { Hono } from "hono";
import type { Env } from "../env";
import { createClient } from "@supabase/supabase-js";

const app = new Hono<{ Bindings: Env }>();

app.post("/", async (c) => {
  try {
    const supabase = createClient(
      c.env.NEXT_PUBLIC_SUPABASE_URL,
      c.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    await supabase.auth.signOut();
    return c.json({ ok: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default app;
