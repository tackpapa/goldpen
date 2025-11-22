-- Expense categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#94a3b8',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expense_categories_org ON expense_categories(org_id);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  category_id uuid REFERENCES expense_categories(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  description text,
  expense_date date NOT NULL,
  payment_method text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_org_date ON expenses(org_id, expense_date DESC);

-- Billing (revenue) transactions
CREATE TABLE IF NOT EXISTS billing_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  category text, -- 수강료, 자릿세 등
  amount numeric NOT NULL,
  payment_method text,
  payment_date date NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_billing_org_date ON billing_transactions(org_id, payment_date DESC);

-- Teacher salaries
CREATE TABLE IF NOT EXISTS teacher_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  payment_date date NOT NULL,
  memo text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_salaries_org_date ON teacher_salaries(org_id, payment_date DESC);

-- Seats base table (metadata, not realtime)
CREATE TABLE IF NOT EXISTS seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  number integer NOT NULL,
  type_name text,
  status text DEFAULT 'vacant', -- checked_in / checked_out / vacant
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  check_in_time timestamptz,
  session_start_time timestamptz,
  allocated_minutes integer,
  pass_type text, -- hours | days
  remaining_minutes integer,
  remaining_days integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, number)
);
CREATE INDEX IF NOT EXISTS idx_seats_org ON seats(org_id);

-- Branches (학원 지점)
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  address text,
  phone text,
  manager_name text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_branches_org ON branches(org_id);

-- Organizations (settings)
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_name text,
  address text,
  phone text,
  email text,
  logo_url text,
  settings jsonb DEFAULT '{"auto_sms":false,"auto_email":false,"notification_enabled":false}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
