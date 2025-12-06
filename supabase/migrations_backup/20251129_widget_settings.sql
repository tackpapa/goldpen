-- =====================================================
-- Widget Settings Table Migration
-- Created: 2025-11-29
-- Purpose: Store dashboard widget configuration per organization
-- =====================================================

-- widget_settings table (Dashboard widget configuration)
CREATE TABLE IF NOT EXISTS widget_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  widget_id TEXT NOT NULL,  -- 'realtime-status', 'students-total', etc.
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, widget_id)
);

CREATE INDEX IF NOT EXISTS idx_widget_settings_org_id ON widget_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_widget_settings_order ON widget_settings(org_id, display_order);
CREATE INDEX IF NOT EXISTS idx_widget_settings_enabled ON widget_settings(org_id, is_enabled);

COMMENT ON TABLE widget_settings IS 'Dashboard widget visibility and ordering per organization';
COMMENT ON COLUMN widget_settings.widget_id IS 'Widget ID from lib/config/widgets.ts (e.g., realtime-status, students-total)';

-- Enable RLS
ALTER TABLE widget_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "widget_settings_select_policy" ON widget_settings
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "widget_settings_insert_policy" ON widget_settings
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'super_admin'))
  );

CREATE POLICY "widget_settings_update_policy" ON widget_settings
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'super_admin'))
  );

CREATE POLICY "widget_settings_delete_policy" ON widget_settings
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'super_admin'))
  );

-- Trigger for automatic updated_at
CREATE TRIGGER widget_settings_updated_at_trigger
  BEFORE UPDATE ON widget_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
