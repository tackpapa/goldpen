-- =====================================================
-- Settings Config Default Data Seed
-- Created: 2025-11-21
-- Purpose: Seed default data for settings config tables
--          (revenue_categories, expense_categories,
--           page_permissions, menu_settings)
-- =====================================================

-- =====================================================
-- PHASE 1: Default Revenue Categories
-- =====================================================

-- Note: This inserts default categories for ALL organizations
-- In production, you may want to run this only for new organizations

DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations
  LOOP
    -- 1. 수강료 (가장 일반적인 수익)
    INSERT INTO revenue_categories (org_id, name, description, is_active, display_order)
    VALUES (
      org_record.id,
      '수강료',
      '학생 수강료 (학원, 과외, 클래스 등)',
      true,
      1
    )
    ON CONFLICT (org_id, name) DO NOTHING;

    -- 2. 자릿세 (독서실)
    INSERT INTO revenue_categories (org_id, name, description, is_active, display_order)
    VALUES (
      org_record.id,
      '자릿세',
      '독서실 자리 사용료',
      true,
      2
    )
    ON CONFLICT (org_id, name) DO NOTHING;

    -- 3. 룸 이용료 (1:1 과외실)
    INSERT INTO revenue_categories (org_id, name, description, is_active, display_order)
    VALUES (
      org_record.id,
      '룸 이용료',
      '1:1 과외실 대여료',
      true,
      3
    )
    ON CONFLICT (org_id, name) DO NOTHING;

    -- 4. 교재 판매
    INSERT INTO revenue_categories (org_id, name, description, is_active, display_order)
    VALUES (
      org_record.id,
      '교재 판매',
      '교재 및 교구 판매',
      true,
      4
    )
    ON CONFLICT (org_id, name) DO NOTHING;
  END LOOP;
END $$;

-- =====================================================
-- PHASE 2: Default Expense Categories
-- =====================================================

DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations
  LOOP
    -- 1. 강사비
    INSERT INTO expense_categories (org_id, name, description, color, is_active, display_order)
    VALUES (
      org_record.id,
      '강사비',
      '강사 급여 및 수당',
      '#ef4444',
      true,
      1
    )
    ON CONFLICT (org_id, name) DO NOTHING;

    -- 2. 임대료
    INSERT INTO expense_categories (org_id, name, description, color, is_active, display_order)
    VALUES (
      org_record.id,
      '임대료',
      '건물 임대료',
      '#f97316',
      true,
      2
    )
    ON CONFLICT (org_id, name) DO NOTHING;

    -- 3. 공과금
    INSERT INTO expense_categories (org_id, name, description, color, is_active, display_order)
    VALUES (
      org_record.id,
      '공과금',
      '전기/수도/가스/통신비',
      '#eab308',
      true,
      3
    )
    ON CONFLICT (org_id, name) DO NOTHING;

    -- 4. 교재구입
    INSERT INTO expense_categories (org_id, name, description, color, is_active, display_order)
    VALUES (
      org_record.id,
      '교재구입',
      '교재 및 교구 구입비',
      '#22c55e',
      true,
      4
    )
    ON CONFLICT (org_id, name) DO NOTHING;

    -- 5. 비품구입
    INSERT INTO expense_categories (org_id, name, description, color, is_active, display_order)
    VALUES (
      org_record.id,
      '비품구입',
      '사무용품 및 비품',
      '#3b82f6',
      true,
      5
    )
    ON CONFLICT (org_id, name) DO NOTHING;

    -- 6. 마케팅
    INSERT INTO expense_categories (org_id, name, description, color, is_active, display_order)
    VALUES (
      org_record.id,
      '마케팅',
      '광고 및 홍보비',
      '#a855f7',
      true,
      6
    )
    ON CONFLICT (org_id, name) DO NOTHING;
  END LOOP;
END $$;

-- =====================================================
-- PHASE 3: Default Page Permissions
-- =====================================================

-- Default permissions: staff and teacher both have access to most pages
-- Admin always has full access (hardcoded in app logic)

DO $$
DECLARE
  org_record RECORD;
  page_configs TEXT[][] := ARRAY[
    -- [page_id, staff_access, teacher_access]
    ['overview', 'true', 'true'],           -- 대시보드
    ['all-schedules', 'true', 'true'],     -- 전체 일정
    ['students', 'true', 'false'],         -- 학생 관리 (직원만)
    ['classes', 'true', 'false'],          -- 반 관리 (직원만)
    ['attendance', 'true', 'true'],        -- 출결 관리
    ['lessons', 'false', 'true'],          -- 수업일지 (강사만)
    ['teachers', 'true', 'false'],         -- 강사 관리 (직원만)
    ['schedule', 'true', 'true'],          -- 시간표
    ['rooms', 'true', 'true'],             -- 교실 관리
    ['seats', 'true', 'false'],            -- 좌석 관리 (직원만)
    ['consultations', 'true', 'false'],    -- 상담 관리 (직원만)
    ['exams', 'true', 'true'],             -- 시험 관리
    ['homework', 'false', 'true'],         -- 숙제 관리 (강사만)
    ['billing', 'true', 'false'],          -- 수납 관리 (직원만)
    ['expenses', 'true', 'false'],         -- 지출 관리 (직원만)
    ['settings', 'false', 'false']         -- 설정 (관리자만)
  ];
  page_config TEXT[];
BEGIN
  FOR org_record IN SELECT id FROM organizations
  LOOP
    FOREACH page_config SLICE 1 IN ARRAY page_configs
    LOOP
      INSERT INTO page_permissions (org_id, page_id, staff_access, teacher_access)
      VALUES (
        org_record.id,
        page_config[1],
        page_config[2]::BOOLEAN,
        page_config[3]::BOOLEAN
      )
      ON CONFLICT (org_id, page_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- PHASE 4: Default Menu Settings
-- =====================================================

-- All menus enabled by default, ordered by navigation.ts order

DO $$
DECLARE
  org_record RECORD;
  menu_configs TEXT[][] := ARRAY[
    -- [menu_id, display_order]
    ['overview', '1'],
    ['all-schedules', '2'],
    ['students', '3'],
    ['classes', '4'],
    ['attendance', '5'],
    ['lessons', '6'],
    ['teachers', '7'],
    ['schedule', '8'],
    ['rooms', '9'],
    ['seats', '10'],
    ['consultations', '11'],
    ['exams', '12'],
    ['homework', '13'],
    ['billing', '14'],
    ['expenses', '15'],
    ['settings', '16']
  ];
  menu_config TEXT[];
BEGIN
  FOR org_record IN SELECT id FROM organizations
  LOOP
    FOREACH menu_config SLICE 1 IN ARRAY menu_configs
    LOOP
      INSERT INTO menu_settings (org_id, menu_id, is_enabled, display_order)
      VALUES (
        org_record.id,
        menu_config[1],
        true,
        menu_config[2]::INTEGER
      )
      ON CONFLICT (org_id, menu_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- SEED COMPLETE
-- =====================================================

-- Seeded default data:
--   1. Revenue Categories (4 categories per org)
--   2. Expense Categories (6 categories per org)
--   3. Page Permissions (16 pages per org)
--   4. Menu Settings (16 menu items per org)
--
-- Total: 42 records per organization
-- =====================================================
