-- =====================================================
-- Settings Config Tables Migration
-- Created: 2025-11-21
-- Purpose: Create all tables for settings page config data
--          (localStorage + mock data → Supabase)
-- =====================================================

-- =====================================================
-- PHASE 1: Critical Tables (User & Permissions)
-- =====================================================

-- 1.1 user_accounts table (Internal staff/teacher accounts)
CREATE TABLE IF NOT EXISTS user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,  -- bcrypt hash (NOT plain text!)
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'teacher')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, username)
);

CREATE INDEX IF NOT EXISTS idx_user_accounts_org_id ON user_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_username ON user_accounts(username);
CREATE INDEX IF NOT EXISTS idx_user_accounts_role ON user_accounts(org_id, role);

COMMENT ON TABLE user_accounts IS 'Internal staff/teacher accounts (not Supabase Auth users)';
COMMENT ON COLUMN user_accounts.password_hash IS 'bcrypt hashed password';
COMMENT ON COLUMN user_accounts.role IS 'admin, staff, or teacher';

-- 1.2 page_permissions table (Role-based page access control)
CREATE TABLE IF NOT EXISTS page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL,  -- 'students', 'classes', 'lessons', 'billing', etc.
  staff_access BOOLEAN NOT NULL DEFAULT false,
  teacher_access BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, page_id)
);

CREATE INDEX IF NOT EXISTS idx_page_permissions_org_id ON page_permissions(org_id);
CREATE INDEX IF NOT EXISTS idx_page_permissions_page_id ON page_permissions(page_id);

COMMENT ON TABLE page_permissions IS 'Page-level access control for staff and teachers';
COMMENT ON COLUMN page_permissions.page_id IS 'Navigation item ID (students, classes, lessons, etc.)';

-- =====================================================
-- PHASE 2: Category Tables
-- =====================================================

-- 2.1 revenue_categories table (Customizable revenue types)
CREATE TABLE IF NOT EXISTS revenue_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_revenue_categories_org_id ON revenue_categories(org_id);
CREATE INDEX IF NOT EXISTS idx_revenue_categories_order ON revenue_categories(org_id, display_order);
CREATE INDEX IF NOT EXISTS idx_revenue_categories_active ON revenue_categories(org_id, is_active);

COMMENT ON TABLE revenue_categories IS 'Customizable revenue categories (수강료, 자릿세, 룸이용료, etc.)';

-- 2.2 expense_categories table (Customizable expense types)
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6b7280',  -- Hex color for UI
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_org_id ON expense_categories(org_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_order ON expense_categories(org_id, display_order);
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON expense_categories(org_id, is_active);

COMMENT ON TABLE expense_categories IS 'Customizable expense categories (강사비, 임대료, 공과금, etc.)';
COMMENT ON COLUMN expense_categories.color IS 'Hex color for UI display';

-- =====================================================
-- PHASE 3: Menu Settings
-- =====================================================

-- 3.1 menu_settings table (Organization menu customization)
CREATE TABLE IF NOT EXISTS menu_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  menu_id TEXT NOT NULL,  -- 'students', 'classes', 'teachers', 'billing', etc.
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, menu_id)
);

CREATE INDEX IF NOT EXISTS idx_menu_settings_org_id ON menu_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_menu_settings_order ON menu_settings(org_id, display_order);
CREATE INDEX IF NOT EXISTS idx_menu_settings_enabled ON menu_settings(org_id, is_enabled);

COMMENT ON TABLE menu_settings IS 'Organization-specific menu visibility and ordering';
COMMENT ON COLUMN menu_settings.menu_id IS 'Navigation item ID (from lib/config/navigation.ts)';

-- =====================================================
-- PHASE 4: Usage Tracking Tables
-- =====================================================

-- 4.1 kakao_talk_usages table (KakaoTalk message cost tracking)
CREATE TABLE IF NOT EXISTS kakao_talk_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,  -- Denormalized for archived students
  message_type TEXT NOT NULL,  -- '지각 안내', '등원 알림', '하원 알림', '수업일지 전송', etc.
  message_content TEXT NOT NULL,
  cost_cents INTEGER NOT NULL,  -- Cost in cents (1500 = 15원, 2000 = 20원)
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kakao_talk_usages_org_id ON kakao_talk_usages(org_id);
CREATE INDEX IF NOT EXISTS idx_kakao_talk_usages_student_id ON kakao_talk_usages(student_id);
CREATE INDEX IF NOT EXISTS idx_kakao_talk_usages_sent_at ON kakao_talk_usages(org_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_kakao_talk_usages_status ON kakao_talk_usages(org_id, status);
CREATE INDEX IF NOT EXISTS idx_kakao_talk_usages_type ON kakao_talk_usages(org_id, message_type);

COMMENT ON TABLE kakao_talk_usages IS 'KakaoTalk message cost tracking and status';
COMMENT ON COLUMN kakao_talk_usages.cost_cents IS 'Cost in cents (e.g., 1500 = 15원)';
COMMENT ON COLUMN kakao_talk_usages.student_name IS 'Denormalized for display when student is deleted';

-- 4.2 service_usages table (Platform service cost tracking)
CREATE TABLE IF NOT EXISTS service_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  service_type TEXT NOT NULL,  -- '서버비', '문자 발송료', '스토리지', etc.
  description TEXT,
  cost_cents INTEGER NOT NULL,  -- Cost in cents
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_usages_org_id ON service_usages(org_id);
CREATE INDEX IF NOT EXISTS idx_service_usages_date ON service_usages(org_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_service_usages_type ON service_usages(org_id, service_type);

COMMENT ON TABLE service_usages IS 'Platform service cost tracking (server, SMS, storage, etc.)';
COMMENT ON COLUMN service_usages.cost_cents IS 'Cost in cents (e.g., 5000000 = 50,000원)';

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kakao_talk_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_usages ENABLE ROW LEVEL SECURITY;

-- ===== user_accounts policies =====
CREATE POLICY "user_accounts_select_policy" ON user_accounts
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "user_accounts_insert_policy" ON user_accounts
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "user_accounts_update_policy" ON user_accounts
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "user_accounts_delete_policy" ON user_accounts
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- ===== page_permissions policies =====
CREATE POLICY "page_permissions_select_policy" ON page_permissions
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "page_permissions_insert_policy" ON page_permissions
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "page_permissions_update_policy" ON page_permissions
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "page_permissions_delete_policy" ON page_permissions
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- ===== revenue_categories policies =====
CREATE POLICY "revenue_categories_select_policy" ON revenue_categories
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "revenue_categories_insert_policy" ON revenue_categories
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "revenue_categories_update_policy" ON revenue_categories
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "revenue_categories_delete_policy" ON revenue_categories
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- ===== expense_categories policies =====
CREATE POLICY "expense_categories_select_policy" ON expense_categories
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "expense_categories_insert_policy" ON expense_categories
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "expense_categories_update_policy" ON expense_categories
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "expense_categories_delete_policy" ON expense_categories
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- ===== menu_settings policies =====
CREATE POLICY "menu_settings_select_policy" ON menu_settings
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "menu_settings_insert_policy" ON menu_settings
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "menu_settings_update_policy" ON menu_settings
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "menu_settings_delete_policy" ON menu_settings
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- ===== kakao_talk_usages policies =====
CREATE POLICY "kakao_talk_usages_select_policy" ON kakao_talk_usages
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "kakao_talk_usages_insert_policy" ON kakao_talk_usages
  FOR INSERT
  WITH CHECK (org_id = get_user_org_id());

-- No UPDATE/DELETE policies (append-only log)

-- ===== service_usages policies =====
CREATE POLICY "service_usages_select_policy" ON service_usages
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "service_usages_insert_policy" ON service_usages
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "service_usages_delete_policy" ON service_usages
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- =====================================================
-- Triggers for automatic updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_accounts_updated_at_trigger
  BEFORE UPDATE ON user_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER page_permissions_updated_at_trigger
  BEFORE UPDATE ON page_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER revenue_categories_updated_at_trigger
  BEFORE UPDATE ON revenue_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER expense_categories_updated_at_trigger
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER menu_settings_updated_at_trigger
  BEFORE UPDATE ON menu_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Created 7 new tables:
--   1. user_accounts (internal staff/teacher accounts)
--   2. page_permissions (role-based page access)
--   3. revenue_categories (customizable revenue types)
--   4. expense_categories (customizable expense types)
--   5. menu_settings (menu visibility and ordering)
--   6. kakao_talk_usages (KakaoTalk cost tracking)
--   7. service_usages (platform service costs)
--
-- All tables have:
--   - RLS policies (org_id isolation)
--   - Indexes for performance
--   - Triggers for updated_at (where applicable)
--   - Comments for documentation
-- =====================================================
