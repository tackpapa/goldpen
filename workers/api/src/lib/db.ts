// @ts-ignore - pg types not available in Workers context
import { Pool } from 'pg'
import type { Env } from '../env'

// Lazy singleton pool per worker instance
const globalAny = globalThis as any

export function getPool(env: Env) {
  if (!env.HYPERDRIVE_DB) {
    throw new Error('[DB] HYPERDRIVE_DB binding is missing')
  }

  // Hyperdrive binding returns an object with connectionString property
  const connectionString = typeof env.HYPERDRIVE_DB === 'string'
    ? env.HYPERDRIVE_DB
    : (env.HYPERDRIVE_DB as { connectionString: string }).connectionString

  if (!globalAny.__goldpen_pg_pool) {
    globalAny.__goldpen_pg_pool = new Pool({
      connectionString,
      // Hyperdrive already pools; keep pool small
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    })
  }

  return globalAny.__goldpen_pg_pool as Pool
}

export async function withClient<T>(env: Env, fn: (client: any) => Promise<T>): Promise<T> {
  const pool = getPool(env)
  const client = await pool.connect()
  try {
    return await fn(client)
  } finally {
    client.release()
  }
}
