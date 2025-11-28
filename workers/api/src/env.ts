/**
 * Cloudflare Workers Environment Variables
 */
export interface Env {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY?: string // Optional: for admin operations

  // Environment
  ENVIRONMENT?: string // 'production' | 'development'

 // App Config
  NEXT_PUBLIC_APP_URL?: string

  // External APIs
  NEXT_PUBLIC_OPENWEATHER_API_KEY?: string

  // Cloudflare Hyperdrive (Postgres over Hyperdrive)
  HYPERDRIVE_DB?: string

  // Cloudflare Bindings (for future use)
  // KV?: KVNamespace
  // DB?: D1Database
  // BUCKET?: R2Bucket
}
