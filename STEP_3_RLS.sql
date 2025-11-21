-- STEP 3: RLS (Row Level Security) 정책
-- STEP 2 완료 후 실행

-- RLS 활성화
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE livescreen_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE outing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_records ENABLE ROW LEVEL SECURITY;

-- Organizations 정책
CREATE POLICY "Anyone can create organization" ON organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own organization" ON organizations FOR SELECT USING ((id = user_org_id()) OR (owner_id = auth.uid()));
CREATE POLICY "Owners can update own organization" ON organizations FOR UPDATE USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));

-- Users 정책
CREATE POLICY "Anyone can create user profile" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view users in own organization" ON users FOR SELECT USING (((id = auth.uid()) OR (org_id = user_org_id())));
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));
CREATE POLICY "Owners/Managers can manage users" ON users USING (((org_id = user_org_id()) AND (user_role() = ANY (ARRAY['owner'::user_role, 'manager'::user_role]))));

-- Students 정책
CREATE POLICY "Users can view students in own organization" ON students FOR SELECT USING ((org_id IN ( SELECT users.org_id FROM users WHERE (users.id = auth.uid()))));
CREATE POLICY "Users can create students in own organization" ON students FOR INSERT WITH CHECK ((org_id IN ( SELECT users.org_id FROM users WHERE (users.id = auth.uid()))));
CREATE POLICY "Users can update students in own organization" ON students FOR UPDATE USING ((org_id IN ( SELECT users.org_id FROM users WHERE (users.id = auth.uid())))) WITH CHECK ((org_id IN ( SELECT users.org_id FROM users WHERE (users.id = auth.uid()))));
CREATE POLICY "Owners/Managers can delete students" ON students FOR DELETE USING ((org_id IN ( SELECT users.org_id FROM users WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::user_role, 'manager'::user_role]))))));

-- Classes 정책
CREATE POLICY "Users can view classes in own organization" ON classes FOR SELECT USING ((org_id IN ( SELECT users.org_id FROM users WHERE (users.id = auth.uid()))));
CREATE POLICY "Users can create classes in own organization" ON classes FOR INSERT WITH CHECK ((org_id IN ( SELECT users.org_id FROM users WHERE (users.id = auth.uid()))));
CREATE POLICY "Users can update classes in own organization" ON classes FOR UPDATE USING ((org_id IN ( SELECT users.org_id FROM users WHERE (users.id = auth.uid())))) WITH CHECK ((org_id IN ( SELECT users.org_id FROM users WHERE (users.id = auth.uid()))));
CREATE POLICY "Owners/Managers can delete classes" ON classes FOR DELETE USING ((org_id IN ( SELECT users.org_id FROM users WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::user_role, 'manager'::user_role]))))));

-- Attendance 정책
CREATE POLICY "Users can view attendance in own organization" ON attendance FOR SELECT USING ((org_id IN ( SELECT users.org_id FROM users WHERE (users.id = auth.uid()))));
CREATE POLICY "Users can create attendance in own organization" ON attendance FOR INSERT WITH CHECK ((org_id IN ( SELECT users.org_id FROM users WHERE (users.id = auth.uid()))));
CREATE POLICY "Users can update attendance in own organization" ON attendance FOR UPDATE USING ((org_id IN ( SELECT users.org_id FROM users WHERE (users.id = auth.uid()))));
CREATE POLICY "Owners/Managers can delete attendance" ON attendance FOR DELETE USING ((org_id IN ( SELECT users.org_id FROM users WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::user_role, 'manager'::user_role]))))));

-- Consultations 정책
CREATE POLICY "Users can view consultations in own organization" ON consultations FOR SELECT USING ((org_id IN ( SELECT users.org_id FROM users WHERE (users.id = auth.uid()))));
CREATE POLICY "Users can create consultations in own organization" ON consultations FOR INSERT WITH CHECK ((org_id IN ( SELECT users.org_id FROM users WHERE (users.id = auth.uid()))));
CREATE POLICY "Users can update consultations in own organization" ON consultations FOR UPDATE USING ((org_id IN ( SELECT users.org_id FROM users WHERE (users.id = auth.uid()))));
CREATE POLICY "Owners/Managers can delete consultations" ON consultations FOR DELETE USING ((org_id IN ( SELECT users.org_id FROM users WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::user_role, 'manager'::user_role]))))));

-- Livescreen 관련 정책 (전체 접근 허용 - 실시간 기능용)
CREATE POLICY "Enable read access for all users" ON call_records FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON call_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON call_records FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON manager_calls FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON manager_calls FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON manager_calls FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON manager_calls FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON livescreen_state FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON livescreen_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON livescreen_state FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON outing_records FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON outing_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON outing_records FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON sleep_records FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON sleep_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON sleep_records FOR UPDATE USING (true);
