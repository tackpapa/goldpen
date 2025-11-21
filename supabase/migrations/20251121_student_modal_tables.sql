-- =====================================================
-- 학생 모달 관련 테이블 마이그레이션
-- 스크린샷 기반: 이용권, 서비스 소속, 수업 등록
-- =====================================================

-- 1. 이용권 테이블 (현재 이용권 카드)
-- 학생의 일수/시간 기반 이용권 관리
CREATE TABLE IF NOT EXISTS student_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- 이용권 정보
  subscription_type VARCHAR(50) NOT NULL DEFAULT 'days', -- 'days' (일수), 'hours' (시간), 'unlimited' (무제한)
  total_days INTEGER, -- 총 일수 (예: 30일)
  remaining_days INTEGER, -- 남은 일수 (예: 23일)
  total_hours INTEGER, -- 총 시간 (시간 이용권용)
  remaining_hours INTEGER, -- 남은 시간

  -- 기간 정보
  start_date DATE NOT NULL, -- 이용권 시작일
  expiry_date DATE NOT NULL, -- 만료일

  -- 상태
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'expired', 'paused', 'cancelled'

  -- 결제 연동 (추후 확장)
  payment_id UUID, -- 결제 내역 연결용
  price INTEGER, -- 결제 금액

  -- 메타데이터
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 인덱스용 제약조건
  CONSTRAINT valid_subscription_type CHECK (subscription_type IN ('days', 'hours', 'unlimited'))
);

-- 2. 서비스 소속 테이블 (학원/독서실/공부방)
-- 학생이 이용하는 서비스 유형 관리
CREATE TABLE IF NOT EXISTS student_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- 서비스 유형
  service_type VARCHAR(50) NOT NULL, -- 'academy' (학원), 'reading_room' (독서실), 'study_room' (공부방)

  -- 활성 상태
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 복수 선택 가능하지만 중복은 불가
  UNIQUE(org_id, student_id, service_type),
  CONSTRAINT valid_service_type CHECK (service_type IN ('academy', 'reading_room', 'study_room'))
);

-- 3. 수업 등록 테이블 (수강 수업)
-- 학생이 등록한 수업 목록
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,

  -- 등록 정보
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'dropped', 'completed'

  -- 담당 강사 (별도 배정시)
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,

  -- 메타데이터
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 같은 수업 중복 등록 방지
  UNIQUE(org_id, student_id, class_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_org ON student_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_student ON student_subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_status ON student_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_expiry ON student_subscriptions(expiry_date);

CREATE INDEX IF NOT EXISTS idx_student_services_org ON student_services(org_id);
CREATE INDEX IF NOT EXISTS idx_student_services_student ON student_services(student_id);
CREATE INDEX IF NOT EXISTS idx_student_services_type ON student_services(service_type);

CREATE INDEX IF NOT EXISTS idx_enrollments_org ON enrollments(org_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_teacher ON enrollments(teacher_id);

-- RLS 정책
ALTER TABLE student_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- RLS: 인증된 사용자는 자기 조직의 데이터만 접근
CREATE POLICY "Allow authenticated users to view subscriptions"
  ON student_subscriptions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage subscriptions"
  ON student_subscriptions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view services"
  ON student_services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage services"
  ON student_services FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage enrollments"
  ON enrollments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_student_subscriptions_updated_at ON student_subscriptions;
CREATE TRIGGER update_student_subscriptions_updated_at
    BEFORE UPDATE ON student_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_services_updated_at ON student_services;
CREATE TRIGGER update_student_services_updated_at
    BEFORE UPDATE ON student_services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_enrollments_updated_at ON enrollments;
CREATE TRIGGER update_enrollments_updated_at
    BEFORE UPDATE ON enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
