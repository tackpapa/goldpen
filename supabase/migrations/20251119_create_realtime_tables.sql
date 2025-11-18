-- Create sleep_records table
CREATE TABLE IF NOT EXISTS public.sleep_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  student_id TEXT NOT NULL,
  seat_number INT NOT NULL,
  date DATE NOT NULL,
  sleep_time TIMESTAMPTZ NOT NULL,
  wake_time TIMESTAMPTZ,
  duration_minutes INT,
  status TEXT CHECK (status IN ('sleeping', 'awake')) NOT NULL DEFAULT 'sleeping'
);

-- Create outing_records table
CREATE TABLE IF NOT EXISTS public.outing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  student_id TEXT NOT NULL,
  seat_number INT NOT NULL,
  date DATE NOT NULL,
  outing_time TIMESTAMPTZ NOT NULL,
  return_time TIMESTAMPTZ,
  duration_minutes INT,
  reason TEXT DEFAULT '',
  status TEXT CHECK (status IN ('out', 'returned')) NOT NULL DEFAULT 'out'
);

-- Create livescreen_state table
CREATE TABLE IF NOT EXISTS public.livescreen_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  student_id TEXT NOT NULL,
  seat_number INT NOT NULL,
  date DATE NOT NULL,
  sleep_count INT DEFAULT 0,
  is_out BOOLEAN DEFAULT FALSE,
  timer_running BOOLEAN DEFAULT FALSE,
  current_sleep_id UUID REFERENCES public.sleep_records(id),
  current_outing_id UUID REFERENCES public.outing_records(id),
  UNIQUE(student_id, seat_number, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sleep_records_student_date ON public.sleep_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_sleep_records_status ON public.sleep_records(status);
CREATE INDEX IF NOT EXISTS idx_outing_records_student_date ON public.outing_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_outing_records_status ON public.outing_records(status);
CREATE INDEX IF NOT EXISTS idx_livescreen_state_student_date ON public.livescreen_state(student_id, seat_number, date);

-- Enable Row Level Security (RLS)
ALTER TABLE public.sleep_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livescreen_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies (모든 사용자가 조회/수정 가능 - 개발용)
-- 실제 운영에서는 org_id 기반으로 제한해야 함
CREATE POLICY "Enable read access for all users" ON public.sleep_records
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.sleep_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.sleep_records
  FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.outing_records
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.outing_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.outing_records
  FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.livescreen_state
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.livescreen_state
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.livescreen_state
  FOR UPDATE USING (true);

-- Create call_records table
CREATE TABLE IF NOT EXISTS public.call_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  student_id TEXT NOT NULL,
  seat_number INT NOT NULL,
  date DATE NOT NULL,
  call_time TIMESTAMPTZ NOT NULL,
  acknowledged_time TIMESTAMPTZ,
  message TEXT DEFAULT '카운터로 와주세요',
  status TEXT CHECK (status IN ('calling', 'acknowledged')) NOT NULL DEFAULT 'calling'
);

-- Create index for call_records
CREATE INDEX IF NOT EXISTS idx_call_records_student_date ON public.call_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_call_records_status ON public.call_records(status);

-- Enable RLS for call_records
ALTER TABLE public.call_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.call_records
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.call_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.call_records
  FOR UPDATE USING (true);

-- Create manager_calls table
CREATE TABLE IF NOT EXISTS public.manager_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  student_id TEXT NOT NULL,
  seat_number INT NOT NULL,
  student_name TEXT NOT NULL,
  date DATE NOT NULL,
  call_time TIMESTAMPTZ NOT NULL,
  acknowledged_time TIMESTAMPTZ,
  status TEXT CHECK (status IN ('calling', 'acknowledged')) NOT NULL DEFAULT 'calling'
);

-- Create index for manager_calls
CREATE INDEX IF NOT EXISTS idx_manager_calls_date_status ON public.manager_calls(date, status);

-- Enable RLS for manager_calls
ALTER TABLE public.manager_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.manager_calls
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.manager_calls
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.manager_calls
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON public.manager_calls
  FOR DELETE USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sleep_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outing_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.livescreen_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.manager_calls;
