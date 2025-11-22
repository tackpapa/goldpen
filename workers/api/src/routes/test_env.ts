import { Hono } from "hono";
import type { Env } from "../env";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
  return c.json({
    env: {
      hasHyperdrive: !!c.env.HYPERDRIVE_DB,
      supabaseUrl: c.env.NEXT_PUBLIC_SUPABASE_URL,
      appUrl: c.env.NEXT_PUBLIC_APP_URL,
    },
  });
});

export default app;
