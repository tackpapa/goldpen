import { readFileSync } from 'fs'

const SUPABASE_URL = 'https://ipqhhqduppzvsqwwzjkp.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwcWhocWR1cHB6dnNxd3d6amtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYzNjYzOCwiZXhwIjoyMDc5MjEyNjM4fQ.bedodvDtJ9WkJblh7wITNTkSXk8DyjCjIkjAIxSl8qc'

const sql = readFileSync('./FULL_MIGRATION.sql', 'utf-8')

console.log('🚀 Executing migration via Supabase API...')

const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
  },
  body: JSON.stringify({ query: sql })
})

if (!response.ok) {
  const error = await response.text()
  console.error('❌ Migration failed:', error)
  process.exit(1)
}

const result = await response.json()
console.log('✅ Migration completed successfully!')
console.log('Result:', result)
