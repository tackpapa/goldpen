#!/usr/bin/env node
/**
 * Add slug and logo_url columns to organizations table
 */

import pg from 'pg'
const { Client } = pg

const DB_URL = process.env.SUPABASE_DB_URL ||
  "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected\n')

    await client.query("SET session_replication_role = replica;")

    // Add slug column
    console.log('Adding slug column...')
    await client.query(`
      ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;
    `)

    // Add logo_url column
    console.log('Adding logo_url column...')
    await client.query(`
      ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS logo_url TEXT;
    `)

    // Update existing orgs with slug based on name
    console.log('Updating existing orgs with slugs...')
    await client.query(`
      UPDATE organizations
      SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9가-힣]', '', 'g'))
      WHERE slug IS NULL;
    `)

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
    `)

    await client.query("SET session_replication_role = DEFAULT;")
    await client.query("NOTIFY pgrst, 'reload schema'")

    // Show results
    const { rows } = await client.query('SELECT id, name, slug, logo_url FROM organizations LIMIT 5')
    console.log('\nOrganizations:', rows)

    console.log('\n✅ Done!')

  } catch (error) {
    console.error('Error:', error)
    throw error
  } finally {
    await client.end()
  }
}

main().catch(console.error)
