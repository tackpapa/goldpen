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

  // Kakao AlimTalk (Solapi)
  KAKAO_ALIMTALK_API_KEY?: string
  KAKAO_ALIMTALK_SECRET_KEY?: string
  KAKAO_ALIMTALK_SENDER_KEY?: string

  // Telegram (모니터링용)
  TELEGRAM_BOT_TOKEN?: string
  TELEGRAM_CHAT_ID?: string

  // Cloudflare Hyperdrive (Postgres over Hyperdrive)
  HYPERDRIVE_DB?: string

  // Cloudflare Bindings
  AI?: Ai // Workers AI binding
  // KV?: KVNamespace
  // DB?: D1Database
  // BUCKET?: R2Bucket
}
