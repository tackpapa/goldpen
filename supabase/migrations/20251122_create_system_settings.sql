-- =====================================================
-- System Settings Table Migration
-- Created: 2025-11-22
-- Purpose: Create system_settings table for Admin settings page
--          (General, Email, Security, Features settings)
-- =====================================================

-- =====================================================
-- PHASE 1: System Settings Table
-- =====================================================

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,  -- NULL이면 전역 설정
  key TEXT NOT NULL,
  value JSONB NOT NULL,  -- JSONB for flexible value types (string, number, boolean)
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('general', 'email', 'security', 'features')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, key)  -- org_id별로 key 유니크 (NULL도 유니크 키로 취급)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_org_id ON system_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Comments
COMMENT ON TABLE system_settings IS 'System-wide and organization-specific settings (Admin settings page)';
COMMENT ON COLUMN system_settings.org_id IS 'NULL for global settings, specific org_id for organization settings';
COMMENT ON COLUMN system_settings.value IS 'JSONB value (string, number, boolean, etc.)';
COMMENT ON COLUMN system_settings.category IS 'general, email, security, or features';

-- =====================================================
-- PHASE 2: RLS (Row Level Security) Policies
-- =====================================================

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Select Policy: Users can read global settings + their org settings
CREATE POLICY "system_settings_select_policy" ON system_settings
  FOR SELECT
  USING (
    org_id IS NULL  -- Global settings (모두 읽기 가능)
    OR org_id = get_user_org_id()  -- Organization settings (본인 기관만)
  );

-- Insert Policy: Only admin/owner can insert organization settings
CREATE POLICY "system_settings_insert_policy" ON system_settings
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- Update Policy: Only admin/owner can update organization settings
CREATE POLICY "system_settings_update_policy" ON system_settings
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- Delete Policy: Only admin/owner can delete organization settings
CREATE POLICY "system_settings_delete_policy" ON system_settings
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- =====================================================
-- PHASE 3: Trigger for updated_at
-- =====================================================

CREATE TRIGGER system_settings_updated_at_trigger
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PHASE 4: Default Settings Seed (Global)
-- =====================================================

-- Default global settings (org_id = NULL)
INSERT INTO system_settings (org_id, key, value, description, category) VALUES
  -- General Settings
  (NULL, 'site_name', '"GoldPen"', '사이트 이름', 'general'),
  (NULL, 'support_email', '"support@goldpen.kr"', '지원 이메일', 'general'),
  (NULL, 'max_upload_size_mb', '10', '최대 업로드 크기 (MB)', 'general'),

  -- Email Settings
  (NULL, 'smtp_host', '"smtp.sendgrid.net"', 'SMTP 호스트', 'email'),
  (NULL, 'smtp_port', '587', 'SMTP 포트', 'email'),
  (NULL, 'email_from', '"noreply@goldpen.kr"', '발신 이메일', 'email'),

  -- Security Settings
  (NULL, 'session_timeout_minutes', '60', '세션 타임아웃 (분)', 'security'),
  (NULL, 'password_min_length', '8', '최소 비밀번호 길이', 'security'),
  (NULL, 'require_2fa', 'false', '2FA 필수 여부', 'security'),

  -- Features Settings
  (NULL, 'enable_ai_reports', 'true', 'AI 리포트 기능', 'features'),
  (NULL, 'enable_kakao_notifications', 'true', '카카오 알림', 'features'),
  (NULL, 'enable_calendar_sync', 'true', '캘린더 동기화', 'features')
ON CONFLICT (org_id, key) DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Created 1 new table:
--   - system_settings (시스템 설정)
--
-- Features:
--   - RLS policies (org_id isolation)
--   - Indexes for performance
--   - Trigger for updated_at
--   - Default global settings seeded
-- =====================================================
