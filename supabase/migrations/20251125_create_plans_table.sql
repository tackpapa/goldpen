-- Subscription Plans table
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,  -- 'free', 'basic', 'pro', 'enterprise'
  description text,
  price_monthly numeric DEFAULT 0,
  price_yearly numeric DEFAULT 0,
  max_users integer DEFAULT 5,
  max_students integer DEFAULT 30,
  max_teachers integer DEFAULT 3,
  max_classes integer DEFAULT 5,
  features jsonb DEFAULT '[]'::jsonb,  -- ['attendance', 'billing', 'kakao_alimtalk', ...]
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_timestamp_on_plans ON plans;
CREATE TRIGGER set_timestamp_on_plans
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION set_timestamp();

-- Insert default plans
INSERT INTO plans (name, code, description, price_monthly, price_yearly, max_users, max_students, max_teachers, max_classes, features, sort_order)
VALUES
  ('무료', 'free', '소규모 기관을 위한 무료 플랜', 0, 0, 3, 20, 2, 3,
   '["attendance", "students", "classes"]'::jsonb, 1),
  ('베이직', 'basic', '성장하는 기관을 위한 기본 플랜', 29000, 290000, 10, 50, 5, 10,
   '["attendance", "students", "classes", "billing", "reports"]'::jsonb, 2),
  ('프로', 'pro', '전문 기관을 위한 고급 플랜', 59000, 590000, 30, 150, 15, 30,
   '["attendance", "students", "classes", "billing", "reports", "kakao_alimtalk", "api_access"]'::jsonb, 3),
  ('엔터프라이즈', 'enterprise', '대규모 기관을 위한 맞춤형 플랜', 0, 0, 999, 999, 999, 999,
   '["attendance", "students", "classes", "billing", "reports", "kakao_alimtalk", "api_access", "custom_branding", "dedicated_support"]'::jsonb, 4)
ON CONFLICT (code) DO NOTHING;

-- Organization subscriptions history
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES plans(id),
  status text DEFAULT 'active',  -- 'active', 'cancelled', 'expired', 'trial'
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  cancelled_at timestamptz,
  payment_method text,  -- 'card', 'bank_transfer', 'none'
  billing_cycle text DEFAULT 'monthly',  -- 'monthly', 'yearly'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org_id ON organization_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON organization_subscriptions(status);

DROP TRIGGER IF EXISTS set_timestamp_on_org_subscriptions ON organization_subscriptions;
CREATE TRIGGER set_timestamp_on_org_subscriptions
  BEFORE UPDATE ON organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION set_timestamp();

-- RLS for plans (read-only for all, write for super_admin)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_select_policy ON plans
  FOR SELECT USING (true);

CREATE POLICY plans_admin_policy ON plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- RLS for organization_subscriptions
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_subscriptions_select_policy ON organization_subscriptions
  FOR SELECT USING (
    org_id = get_user_org_id() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY org_subscriptions_admin_policy ON organization_subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );
