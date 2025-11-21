# GoldPen Database Migration Guide

**Created:** 2025-11-21
**Purpose:** Complete migration from mock data to Supabase PostgreSQL database

---

## 📋 Overview

This migration converts all mock data from 8 dashboard pages into a production-ready Supabase database with:
- **17 new tables** covering all business domains
- **65+ RLS policies** for multi-tenant security
- **50+ indexes** for query performance
- **17 triggers** for automatic timestamp updates and calculations
- **Sample seed data** for immediate testing

---

## 🗂️ Migration Files

### 1. Schema Migration
**File:** `supabase/migrations/20251121_complete_schema_migration.sql`

**Creates:**
- **Enum types:** attendance_status, consultation_status, seat_status, activity_status, payment_method
- **Financial tables:** billing_transactions, expenses, expense_categories
- **Academic tables:** homework_assignments, homework_submissions, exams, exam_scores, lessons
- **Operational tables:** attendance_records, consultations, consultation_images, waitlists, waitlist_entries
- **Seat management:** seats, seat_sleep_records, seat_outing_records, seat_call_records

**Features:**
- All tables have `org_id` for multi-tenancy
- Automatic `updated_at` timestamps via triggers
- Duration auto-calculation for sleep/outing records
- Proper foreign key relationships with CASCADE/SET NULL

### 2. RLS Policies
**File:** `supabase/migrations/20251121_rls_policies.sql`

**Security model:**
- Organization-level isolation (users can only see their org's data)
- Role-based access (admin, teacher, student)
- Fine-grained permissions (students see own submissions, teachers see assigned classes)
- Helper function: `get_user_org_id()` for clean policy definitions

### 3. Seed Data
**File:** `supabase/migrations/20251121_seed_data.sql`

**Includes:**
- 5 expense categories (교재비, 간식비, 관리비, 인건비, 광고비)
- 5 sample expenses
- 7 billing transactions
- 5 consultations (various statuses)
- 20 seats (mixed types: premium, regular, quiet)

**Note:** Homework, exams, lessons, and attendance are commented out (need actual student/class/teacher IDs)

---

## 🚀 How to Run Migrations

### Prerequisites
1. Supabase CLI installed: `npm install -g supabase`
2. Linked to your Supabase project: `supabase link`
3. Environment variables set in `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

### Step 1: Run Migrations (Production)
```bash
# Apply all migrations in order
supabase db push

# Or run individually via SQL editor in Supabase Dashboard:
# 1. Copy content of 20251121_complete_schema_migration.sql
# 2. Paste into Supabase SQL Editor
# 3. Execute
# 4. Repeat for RLS policies and seed data
```

### Step 2: Verify Tables Created
```sql
-- Check all new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'billing_transactions', 'expenses', 'expense_categories',
  'homework_assignments', 'homework_submissions',
  'exams', 'exam_scores', 'lessons',
  'attendance_records', 'consultations', 'consultation_images',
  'waitlists', 'waitlist_entries',
  'seats', 'seat_sleep_records', 'seat_outing_records', 'seat_call_records'
);
```

### Step 3: Verify RLS Enabled
```sql
-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE '%transactions%' OR tablename LIKE '%expenses%';
```

### Step 4: Test with Sample Data
```sql
-- Check seed data inserted
SELECT COUNT(*) FROM expense_categories; -- Should be 5
SELECT COUNT(*) FROM consultations; -- Should be 5
SELECT COUNT(*) FROM seats; -- Should be 20
```

---

## 📊 Database Schema Summary

### Financial Domain
```
expense_categories (5 categories)
  ├── expenses (track all expenses)
  └── billing_transactions (track all revenue)
```

### Academic Domain
```
homework_assignments
  └── homework_submissions (student submissions with grading)

exams
  └── exam_scores (student exam results)

lessons (수업일지 - daily lesson records)
```

### Operational Domain
```
attendance_records (with teacher tracking, one-on-one flags)

consultations (lead pipeline)
  ├── consultation_images
  └── waitlist_entries → waitlists
```

### Seat Management (독서실)
```
seats (20 seats)
  ├── seat_sleep_records (sleep tracking)
  ├── seat_outing_records (outing tracking)
  └── seat_call_records (call system)
```

---

## 🔐 RLS Policy Examples

### Multi-Tenant Isolation
```sql
-- Every table has org-level isolation
CREATE POLICY "billing_select_policy" ON billing_transactions
  FOR SELECT
  USING (org_id = get_user_org_id());
```

### Role-Based Access
```sql
-- Teachers can only grade their own homework
CREATE POLICY "homework_assignments_update_policy" ON homework_assignments
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
      OR
      EXISTS (SELECT 1 FROM teachers WHERE user_id = auth.uid() AND id = teacher_id)
    )
  );
```

### Student Privacy
```sql
-- Students can only see their own submissions
CREATE POLICY "homework_submissions_select_policy" ON homework_submissions
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM students WHERE user_id = auth.uid() AND id = student_id)
    OR [teacher/admin checks]
  );
```

---

## 🎯 Next Steps: Frontend Integration

### Phase 1: Replace Mock Data with Supabase Queries

#### Example: Billing Page
**Before (Mock Data):**
```typescript
// app/[institutionname]/(dashboard)/billing/page.tsx
const mockTransactions = [
  { id: '1', amount: 500000, payment_method: 'card', ... }
]
```

**After (Real Data):**
```typescript
import { createClient } from '@/lib/supabase/client'

export default async function BillingPage() {
  const supabase = createClient()

  const { data: transactions, error } = await supabase
    .from('billing_transactions')
    .select('*')
    .order('payment_date', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching billing:', error)
    return <div>Error loading data</div>
  }

  return <BillingTable transactions={transactions} />
}
```

### Phase 2: Update All Dashboard Pages

**Files to update (in order of priority):**
1. ✅ `app/[institutionname]/(dashboard)/billing/page.tsx` - billing_transactions
2. ✅ `app/[institutionname]/(dashboard)/expenses/page.tsx` - expenses, expense_categories
3. ✅ `app/[institutionname]/(dashboard)/consultations/page.tsx` - consultations
4. ✅ `app/[institutionname]/(dashboard)/seats/page.tsx` - seats + activity records
5. ✅ `app/[institutionname]/(dashboard)/attendance/page.tsx` - attendance_records
6. ⏳ `app/[institutionname]/(dashboard)/homework/page.tsx` - homework_assignments
7. ⏳ `app/[institutionname]/(dashboard)/exams/page.tsx` - exams, exam_scores
8. ⏳ `app/[institutionname]/(dashboard)/lessons/page.tsx` - lessons

### Phase 3: Add Real-Time Subscriptions

**For Seats (real-time updates):**
```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SeatsPage() {
  const [seats, setSeats] = useState([])
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    fetchSeats()

    // Real-time subscription
    const channel = supabase
      .channel('seats-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'seats' },
        (payload) => {
          console.log('Seat updated:', payload)
          fetchSeats() // Refresh data
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchSeats() {
    const { data } = await supabase.from('seats').select('*')
    setSeats(data || [])
  }

  return <SeatGrid seats={seats} />
}
```

### Phase 4: Add TypeScript Types

**Create:** `types/database.ts`
```typescript
export type BillingTransaction = {
  id: string
  org_id: string
  student_id: string | null
  amount: number // In cents
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'mobile'
  payment_date: string
  description: string | null
  created_at: string
  updated_at: string
}

export type Expense = {
  id: string
  org_id: string
  category_id: string | null
  amount: number // In cents
  expense_date: string
  description: string
  notes: string | null
  created_at: string
  updated_at: string
}

// ... more types
```

**Use in components:**
```typescript
import type { BillingTransaction } from '@/types/database'

interface BillingTableProps {
  transactions: BillingTransaction[]
}

export function BillingTable({ transactions }: BillingTableProps) {
  return (
    <table>
      {transactions.map(tx => (
        <tr key={tx.id}>
          <td>{tx.description}</td>
          <td>{(tx.amount / 100).toLocaleString()}원</td>
          <td>{tx.payment_method}</td>
        </tr>
      ))}
    </table>
  )
}
```

---

## ✅ Testing Checklist

### Database Level
- [ ] All 17 tables created
- [ ] All indexes created (check with `\di` in psql)
- [ ] All triggers working (test updated_at by updating a record)
- [ ] RLS enabled on all tables
- [ ] RLS policies working (test as different user roles)
- [ ] Seed data inserted

### Application Level
- [ ] Billing page loads data from database
- [ ] Expenses page loads data from database
- [ ] Consultations page loads data from database
- [ ] Seats page loads data from database
- [ ] Attendance page loads data from database
- [ ] Real-time updates working for seats
- [ ] No console errors related to data fetching

### Performance
- [ ] Billing queries <500ms (check Supabase dashboard)
- [ ] Attendance queries <500ms
- [ ] Seat queries <100ms (needed for real-time)
- [ ] No N+1 query problems (check network tab)

---

## 🐛 Troubleshooting

### Issue: "relation does not exist"
**Cause:** Migration not run or wrong database
**Fix:**
```bash
# Check current database
supabase status

# Run migrations
supabase db push
```

### Issue: "permission denied for table"
**Cause:** RLS policy blocking access
**Fix:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'billing_transactions';

-- Temporarily disable RLS for testing (DANGER: only on dev)
ALTER TABLE billing_transactions DISABLE ROW LEVEL SECURITY;
```

### Issue: "infinite value out of range for type integer"
**Cause:** Trying to store decimal money as INTEGER
**Fix:** Convert to cents before inserting
```typescript
// Wrong
const amount = 500.00

// Correct
const amount = 50000 // 500.00 * 100 = 50000 cents
```

### Issue: "duplicate key value violates unique constraint"
**Cause:** Trying to insert same data twice
**Fix:** Use `ON CONFLICT` clause
```sql
INSERT INTO seats (org_id, seat_number, status)
VALUES ('...', 1, 'vacant')
ON CONFLICT (org_id, seat_number) DO NOTHING;
```

---

## 📈 Performance Optimization

### Query Performance
```sql
-- Analyze slow queries
EXPLAIN ANALYZE
SELECT * FROM attendance_records
WHERE org_id = '...' AND attendance_date >= '2025-06-01';

-- Create covering index if needed
CREATE INDEX idx_attendance_date_status
ON attendance_records(org_id, attendance_date, status);
```

### Real-Time Subscription Tips
- Only subscribe to tables that need real-time updates (seats, attendance)
- Use filters to reduce data transfer
- Unsubscribe when component unmounts

```typescript
// Good: Filtered subscription
const channel = supabase
  .channel('my-seats')
  .on('postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'seats',
      filter: `org_id=eq.${orgId}` // Filter by org
    },
    handleUpdate
  )
  .subscribe()
```

---

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [PostgreSQL Trigger Documentation](https://www.postgresql.org/docs/current/sql-createtrigger.html)

---

## 🎉 Success Criteria

You'll know the migration is complete when:
1. ✅ All dashboard pages load data from Supabase (no more mock data)
2. ✅ Real-time updates work for seats page
3. ✅ RLS prevents cross-organization data access
4. ✅ All queries complete in <500ms
5. ✅ No console errors in browser
6. ✅ Playwright tests pass with real data

---

**Last Updated:** 2025-11-21
**Version:** 1.0.0
