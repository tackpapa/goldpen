#!/bin/bash

# Production Migration Script for audit_logs table
# Applies migration to production Supabase database

set -e

echo "📦 GoldPen Production Migration"
echo "================================"
echo ""
echo "Migration: 20251120_create_audit_logs.sql"
echo "Target: Production Supabase (ipqhhqduppzvsqwwzjkp)"
echo ""

# Load environment variables from .env.local
if [ -f .env.local ]; then
  source .env.local
fi

# Check environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: Missing environment variables"
  echo "Please ensure .env.local contains:"
  echo "  - NEXT_PUBLIC_SUPABASE_URL"
  echo "  - SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

echo "✓ Environment variables loaded"
echo ""

# Extract project ref from URL
PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -n 's|https://\([^.]*\)\.supabase\.co|\1|p')
echo "Project Reference: $PROJECT_REF"
echo ""

# Build connection string
# Supabase provides direct PostgreSQL connection at:
# postgres://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
# We'll use the Supabase SQL Editor API instead

echo "🔍 Checking if audit_logs table exists..."

# Use Supabase Management API to check table
CHECK_RESPONSE=$(curl -s \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/audit_logs?limit=1" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

if [[ "$CHECK_RESPONSE" != *"relation"*"does not exist"* ]] && [[ "$CHECK_RESPONSE" != "[]" ]]; then
  echo "⚠️  audit_logs table may already exist"
  echo "Response: $CHECK_RESPONSE"
  echo ""
  read -p "Continue with migration? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled"
    exit 0
  fi
fi

echo "🚀 Executing migration..."
echo ""

# Read migration file
MIGRATION_FILE="supabase/migrations/20251120_create_audit_logs.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Error: Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "📄 Migration file: $MIGRATION_FILE"
echo ""

# Execute using Supabase SQL API
# Note: This requires the SQL to be executed via Management API or Dashboard
echo "⚠️  Direct SQL execution via API requires additional setup"
echo ""
echo "Please use ONE of these methods:"
echo ""
echo "1. Supabase Dashboard (RECOMMENDED):"
echo "   - Go to: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
echo "   - Copy and paste the SQL from: $MIGRATION_FILE"
echo "   - Click 'Run'"
echo ""
echo "2. PostgreSQL Connection String:"
echo "   Get your database password from Supabase Dashboard → Settings → Database"
echo "   Then run:"
echo "   psql \"postgresql://postgres.${PROJECT_REF}:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres\" -f $MIGRATION_FILE"
echo ""
echo "3. Supabase CLI (if installed):"
echo "   supabase db push --project-ref ${PROJECT_REF}"
echo ""

# For now, print the SQL for manual execution
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SQL to execute:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$MIGRATION_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
