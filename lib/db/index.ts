import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables')
}

// PostgreSQL connection
const connectionString = process.env.DATABASE_URL
const client = postgres(connectionString, { max: 10 })

// Drizzle instance
export const db = drizzle(client)

// Export connection for migrations
export { client }
