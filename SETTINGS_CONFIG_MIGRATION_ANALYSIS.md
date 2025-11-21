# Settings Page Config Migration Analysis

**Created**: 2025-11-21
**Purpose**: Complete analysis of all settings config data (localStorage + mock data) and Supabase migration plan

---

## 📊 Executive Summary

### Current Storage Methods
- **localStorage**: 8 config categories (accounts, permissions, categories, menu settings, org settings)
- **Mock Data**: 5 data types (organization, branches, rooms, KakaoTalk usage, service usage)

### Migration Status
- **Existing Tables**: 3 (organizations, branches, rooms)
- **New Tables Needed**: 8 tables
- **Schema Gaps**: 100% of localStorage data needs Supabase tables

---

## 🗂️ Complete Config Data Inventory

### 1. Organization Settings

**Current Storage**: localStorage (`organization_logo`, `organization_name`) + mock data

```typescript
Organization {
  id, name, owner_name, address, phone, email, logo_url,
  settings: {
    auto_sms: boolean,
    auto_email: boolean,
    notification_enabled: boolean
  }
}
```

**Supabase Table**: ✅ `organizations` (exists)
**Schema Match**: ✅ Perfect match (settings as JSONB)
**Action**: None - Use existing table

---

### 2. Branches (지점 관리)

**Current Storage**: Mock data

```typescript
Branch {
  id, org_id, name, address, phone, manager_name,
  status: 'active' | 'inactive'
}
```

**Supabase Table**: ✅ `branches` (exists)
**Schema Match**: ✅ Perfect match
**Action**: None - Use existing table

---

### 3. Rooms (교실/강의실 관리)

**Current Storage**: Mock data

```typescript
Room {
  id, created_at, org_id, name, capacity, status, notes?
}
```

**Supabase Table**: ✅ `rooms` (exists)
**Schema Match**: ✅ Perfect match
**Action**: None - Use existing table

---

### 4. User Accounts (계정 관리)

**Current Storage**: localStorage (`user_accounts`)
**Manager**: `accountManager` in `lib/utils/permissions.ts`

```typescript
UserAccount {
  id: string,
  username: string,
  password: string,  // Plain text in localStorage!
  name: string,
  role: 'admin' | 'staff' | 'teacher',
  createdAt: string
}
```

**Supabase Table**: ❌ **NEW TABLE NEEDED** `user_accounts`
**Purpose**: Internal staff/teacher accounts (not Supabase Auth users)
**Security Note**: Passwords should be hashed in Supabase

---

### 5. Page Permissions (페이지 권한)

**Current Storage**: localStorage (`page_permissions`)
**Manager**: `permissionManager` in `lib/utils/permissions.ts`

```typescript
PagePermissions {
  [pageId: string]: {
    staff: boolean,
    teacher: boolean
  }
}

// Example:
{
  "students": { staff: true, teacher: false },
  "classes": { staff: true, teacher: false },
  "lessons": { staff: false, teacher: true },
  // ...
}
```

**Supabase Table**: ❌ **NEW TABLE NEEDED** `page_permissions`
**Note**: Admin always has full access (hardcoded logic)

---

### 6. Revenue Categories (수익 항목)

**Current Storage**: localStorage (`revenue_categories`)
**Manager**: `revenueCategoryManager` in `lib/utils/revenue-categories.ts`

```typescript
RevenueCategory {
  id: string,
  name: string,
  description?: string,
  is_active: boolean,
  order: number,
  created_at: string
}

// Default categories:
- 수강료
- 자릿세 (독서실)
- 룸 이용료 (1:1 과외실)
- 교재 판매
```

**Supabase Table**: ❓ Check if exists
**Action**: Create if not exists

---

### 7. Expense Categories (지출 항목)

**Current Storage**: localStorage (`expense_categories`)
**Manager**: `expenseCategoryManager` in `lib/utils/expense-categories.ts`

```typescript
ExpenseCategory {
  id: string,
  name: string,
  description?: string,
  color: string,  // Hex color for UI
  is_active: boolean,
  order: number,
  created_at: string
}

// Default categories:
- 강사비
- 임대료
- 공과금
- 교재구입
- 비품구입
- 마케팅
```

**Supabase Table**: ❓ Check if exists (related to `expenses` table)
**Action**: Create if not exists

---

### 8. Menu Visibility Settings (메뉴 표시 설정)

**Current Storage**: localStorage (`enabledMenus`)
**Manager**: `getEnabledMenuIds`, `setEnabledMenuIds` in `lib/config/navigation.ts`

```typescript
// Array of enabled menu IDs
enabledMenus: string[]

// Example:
["overview", "students", "classes", "teachers", "billing", "settings"]
```

**Purpose**: Organization-specific menu customization
**Supabase Table**: ❌ **NEW TABLE NEEDED** `menu_settings`
**Note**: Each organization can enable/disable specific menus

---

### 9. Menu Order Settings (메뉴 순서 설정)

**Current Storage**: localStorage (`menuOrder`)
**Manager**: `getMenuOrder`, `setMenuOrder` in `lib/config/navigation.ts`

```typescript
// Array of menu IDs in display order
menuOrder: string[]

// Example:
["overview", "students", "attendance", "lessons", "billing"]
```

**Purpose**: Custom menu ordering for each organization
**Supabase Table**: Can be combined with `menu_settings` table

---

### 10. KakaoTalk Usage Tracking (카카오톡 발송 내역)

**Current Storage**: Mock data

```typescript
KakaoTalkUsage {
  id: string,
  date: string,  // '2025-01-19 09:15'
  type: string,  // '지각 안내', '등원 알림', '하원 알림', '수업일지 전송', 등
  studentName: string,
  message: string,
  cost: number,  // 15 or 20 (원)
  status: 'success' | 'failed'
}
```

**Supabase Table**: ❌ **NEW TABLE NEEDED** `kakao_talk_usages`
**Purpose**: Track KakaoTalk message costs and status
**Note**: Should link to student_id (UUID) instead of studentName

---

### 11. Service Usage Tracking (서비스 이용료 내역)

**Current Storage**: Mock data

```typescript
ServiceUsage {
  id: string,
  date: string,
  type: string,  // '서버비', '문자 발송료', '스토리지' 등
  description: string,
  cost: number  // In cents (원)
}
```

**Supabase Table**: ❌ **NEW TABLE NEEDED** `service_usages`
**Purpose**: Track platform service costs (server, SMS, storage, etc.)

---

## ⚠️ Required Database Tables

### Summary of New Tables Needed

| Table Name | Priority | Purpose |
|------------|----------|---------|
| `user_accounts` | 🔴 HIGH | Internal staff/teacher account management |
| `page_permissions` | 🔴 HIGH | Role-based page access control |
| `revenue_categories` | 🟡 MEDIUM | Customizable revenue categories |
| `expense_categories` | 🟡 MEDIUM | Customizable expense categories |
| `menu_settings` | 🟡 MEDIUM | Organization menu customization |
| `kakao_talk_usages` | 🟢 LOW | KakaoTalk cost tracking |
| `service_usages` | 🟢 LOW | Platform service cost tracking |
| `organization_settings` | 🟡 MEDIUM | Extended organization settings (optional) |

---

## 📋 Complete Migration Plan

### Phase 1: Critical Tables (User & Permissions)

**1.1 `user_accounts` table**
```sql
CREATE TABLE user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,  -- bcrypt hash
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'teacher')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, username)
);

CREATE INDEX idx_user_accounts_org_id ON user_accounts(org_id);
CREATE INDEX idx_user_accounts_username ON user_accounts(username);
```

**1.2 `page_permissions` table**
```sql
CREATE TABLE page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL,  -- 'students', 'classes', 'lessons', etc.
  staff_access BOOLEAN NOT NULL DEFAULT false,
  teacher_access BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, page_id)
);

CREATE INDEX idx_page_permissions_org_id ON page_permissions(org_id);
```

### Phase 2: Category Tables

**2.1 `revenue_categories` table**
```sql
CREATE TABLE revenue_categories (
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

CREATE INDEX idx_revenue_categories_org_id ON revenue_categories(org_id);
CREATE INDEX idx_revenue_categories_order ON revenue_categories(org_id, display_order);
```

**2.2 `expense_categories` table**
```sql
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6b7280',  -- Hex color
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, name)
);

CREATE INDEX idx_expense_categories_org_id ON expense_categories(org_id);
CREATE INDEX idx_expense_categories_order ON expense_categories(org_id, display_order);
```

### Phase 3: Menu Settings

**3.1 `menu_settings` table**
```sql
CREATE TABLE menu_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  menu_id TEXT NOT NULL,  -- 'students', 'classes', 'teachers', etc.
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, menu_id)
);

CREATE INDEX idx_menu_settings_org_id ON menu_settings(org_id);
CREATE INDEX idx_menu_settings_order ON menu_settings(org_id, display_order);
```

### Phase 4: Usage Tracking Tables

**4.1 `kakao_talk_usages` table**
```sql
CREATE TABLE kakao_talk_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,  -- Denormalized for archived students
  message_type TEXT NOT NULL,  -- '지각 안내', '등원 알림', '수업일지 전송', etc.
  message_content TEXT NOT NULL,
  cost_cents INTEGER NOT NULL,  -- Cost in cents (1500 = 15원, 2000 = 20원)
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kakao_talk_usages_org_id ON kakao_talk_usages(org_id);
CREATE INDEX idx_kakao_talk_usages_student_id ON kakao_talk_usages(student_id);
CREATE INDEX idx_kakao_talk_usages_sent_at ON kakao_talk_usages(sent_at);
CREATE INDEX idx_kakao_talk_usages_status ON kakao_talk_usages(org_id, status);
```

**4.2 `service_usages` table**
```sql
CREATE TABLE service_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  service_type TEXT NOT NULL,  -- '서버비', '문자 발송료', '스토리지', etc.
  description TEXT,
  cost_cents INTEGER NOT NULL,  -- Cost in cents
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_usages_org_id ON service_usages(org_id);
CREATE INDEX idx_service_usages_date ON service_usages(org_id, usage_date);
CREATE INDEX idx_service_usages_type ON service_usages(org_id, service_type);
```

---

## 🔐 RLS (Row Level Security) Policies

**All tables must have RLS enabled**:

```sql
-- Enable RLS on all new tables
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kakao_talk_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_usages ENABLE ROW LEVEL SECURITY;

-- Standard RLS policy pattern (org_id isolation)
-- Example for user_accounts:
CREATE POLICY "user_accounts_select_policy" ON user_accounts
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "user_accounts_insert_policy" ON user_accounts
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- Similar policies for UPDATE and DELETE
```

---

## 📍 Next Steps

### Step 1: Create Migration SQL

```bash
# Create comprehensive migration file
touch supabase/migrations/20251121_create_settings_config_tables.sql
```

### Step 2: Execute Migration

```bash
# Run migration via script
node scripts/create-settings-config-tables.mjs
```

### Step 3: Seed Default Data

```bash
# Seed default categories and permissions
node scripts/seed-settings-defaults.mjs
```

### Step 4: Update Frontend Utils

Replace localStorage managers with Supabase queries:
- `lib/utils/permissions.ts` → Use Supabase
- `lib/utils/revenue-categories.ts` → Use Supabase
- `lib/utils/expense-categories.ts` → Use Supabase
- `lib/config/navigation.ts` → Use Supabase

---

## 🎯 Success Criteria

Migration complete when:
1. ✅ All 8 new tables created with proper schema
2. ✅ RLS policies applied to all tables
3. ✅ Default data seeded (categories, permissions, menu settings)
4. ✅ Settings page uses Supabase queries (no localStorage)
5. ✅ Password hashing implemented for user_accounts
6. ✅ All queries complete in <500ms
7. ✅ No console errors

---

**Last Updated**: 2025-11-21
**Status**: Ready for migration SQL generation and execution
