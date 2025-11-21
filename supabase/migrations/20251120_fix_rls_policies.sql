-- =====================================================
-- Fix RLS Policies for audit_logs
-- Created: 2025-11-20
-- Purpose: Add missing policy for organization admins
-- =====================================================

-- Drop the failed policy if it exists (it has incorrect role name)
DROP POLICY IF EXISTS "Org admins can view their org audit logs" ON public.audit_logs;

-- Create the correct policy with proper role names
CREATE POLICY "Org admins can view their org audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('owner', 'manager', 'staff')
    )
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies fixed successfully!';
  RAISE NOTICE '   - Organization admins can now view their org audit logs';
END $$;
