--
-- PostgreSQL database dump
--

\restrict D37aOysTl9UdtcJZPhhdXjVd8kIBWE1qZlMyAbAnfQcxigKjMavqwhJk7aoqoOn

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    student_id uuid NOT NULL,
    class_id uuid,
    date date NOT NULL,
    status text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT attendance_status_check CHECK ((status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'excused'::text])))
);


--
-- Name: call_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    student_id text NOT NULL,
    seat_number integer NOT NULL,
    date date NOT NULL,
    call_time timestamp with time zone NOT NULL,
    acknowledged_time timestamp with time zone,
    message text DEFAULT '카운터로 와주세요'::text,
    status text DEFAULT 'calling'::text NOT NULL,
    CONSTRAINT call_records_status_check CHECK ((status = ANY (ARRAY['calling'::text, 'acknowledged'::text])))
);


--
-- Name: classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    name text NOT NULL,
    subject text,
    teacher_id uuid,
    schedule jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT classes_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


--
-- Name: consultations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    student_id uuid,
    teacher_id uuid,
    date timestamp with time zone NOT NULL,
    type text,
    summary text,
    notes text,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT consultations_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT consultations_type_check CHECK ((type = ANY (ARRAY['parent'::text, 'student'::text, 'academic'::text, 'behavioral'::text, 'other'::text])))
);


--
-- Name: livescreen_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.livescreen_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    student_id text NOT NULL,
    seat_number integer NOT NULL,
    date date NOT NULL,
    sleep_count integer DEFAULT 0,
    is_out boolean DEFAULT false,
    timer_running boolean DEFAULT false,
    current_sleep_id uuid,
    current_outing_id uuid
);

ALTER TABLE ONLY public.livescreen_state REPLICA IDENTITY FULL;


--
-- Name: manager_calls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manager_calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    student_id text NOT NULL,
    seat_number integer NOT NULL,
    student_name text NOT NULL,
    date date NOT NULL,
    call_time timestamp with time zone NOT NULL,
    acknowledged_time timestamp with time zone,
    status text DEFAULT 'calling'::text NOT NULL,
    CONSTRAINT manager_calls_status_check CHECK ((status = ANY (ARRAY['calling'::text, 'acknowledged'::text])))
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'academy'::text NOT NULL,
    owner_id uuid,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT organizations_type_check CHECK ((type = ANY (ARRAY['academy'::text, 'learning_center'::text, 'study_cafe'::text, 'tutoring'::text])))
);


--
-- Name: outing_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outing_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    student_id text NOT NULL,
    seat_number integer NOT NULL,
    date date NOT NULL,
    outing_time timestamp with time zone NOT NULL,
    return_time timestamp with time zone,
    duration_minutes integer,
    reason text DEFAULT ''::text,
    status text DEFAULT 'out'::text NOT NULL,
    CONSTRAINT outing_records_status_check CHECK ((status = ANY (ARRAY['out'::text, 'returned'::text])))
);

ALTER TABLE ONLY public.outing_records REPLICA IDENTITY FULL;


--
-- Name: sleep_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sleep_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    student_id text NOT NULL,
    seat_number integer NOT NULL,
    date date NOT NULL,
    sleep_time timestamp with time zone NOT NULL,
    wake_time timestamp with time zone,
    duration_minutes integer,
    status text DEFAULT 'sleeping'::text NOT NULL,
    CONSTRAINT sleep_records_status_check CHECK ((status = ANY (ARRAY['sleeping'::text, 'awake'::text])))
);

ALTER TABLE ONLY public.sleep_records REPLICA IDENTITY FULL;


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    name text NOT NULL,
    grade text,
    phone text,
    parent_phone text,
    notes text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT students_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'graduated'::text])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    org_id uuid NOT NULL,
    role public.user_role DEFAULT 'student'::public.user_role NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_student_id_date_class_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_student_id_date_class_id_key UNIQUE (student_id, date, class_id);


--
-- Name: call_records call_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_records
    ADD CONSTRAINT call_records_pkey PRIMARY KEY (id);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: consultations consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_pkey PRIMARY KEY (id);


--
-- Name: livescreen_state livescreen_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.livescreen_state
    ADD CONSTRAINT livescreen_state_pkey PRIMARY KEY (id);


--
-- Name: livescreen_state livescreen_state_student_id_seat_number_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.livescreen_state
    ADD CONSTRAINT livescreen_state_student_id_seat_number_date_key UNIQUE (student_id, seat_number, date);


--
-- Name: manager_calls manager_calls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manager_calls
    ADD CONSTRAINT manager_calls_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: outing_records outing_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outing_records
    ADD CONSTRAINT outing_records_pkey PRIMARY KEY (id);


--
-- Name: sleep_records sleep_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sleep_records
    ADD CONSTRAINT sleep_records_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_attendance_class_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_class_id ON public.attendance USING btree (class_id);


--
-- Name: idx_attendance_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_date ON public.attendance USING btree (date);


--
-- Name: idx_attendance_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_org_id ON public.attendance USING btree (org_id);


--
-- Name: idx_attendance_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_status ON public.attendance USING btree (status);


--
-- Name: idx_attendance_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_student_id ON public.attendance USING btree (student_id);


--
-- Name: idx_call_records_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_records_status ON public.call_records USING btree (status);


--
-- Name: idx_call_records_student_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_records_student_date ON public.call_records USING btree (student_id, date);


--
-- Name: idx_classes_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classes_org_id ON public.classes USING btree (org_id);


--
-- Name: idx_classes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classes_status ON public.classes USING btree (status);


--
-- Name: idx_classes_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classes_subject ON public.classes USING btree (subject);


--
-- Name: idx_classes_teacher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classes_teacher_id ON public.classes USING btree (teacher_id);


--
-- Name: idx_consultations_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultations_date ON public.consultations USING btree (date);


--
-- Name: idx_consultations_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultations_org_id ON public.consultations USING btree (org_id);


--
-- Name: idx_consultations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultations_status ON public.consultations USING btree (status);


--
-- Name: idx_consultations_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultations_student_id ON public.consultations USING btree (student_id);


--
-- Name: idx_consultations_teacher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultations_teacher_id ON public.consultations USING btree (teacher_id);


--
-- Name: idx_livescreen_state_student_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_livescreen_state_student_date ON public.livescreen_state USING btree (student_id, seat_number, date);


--
-- Name: idx_manager_calls_date_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_manager_calls_date_status ON public.manager_calls USING btree (date, status);


--
-- Name: idx_organizations_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_owner_id ON public.organizations USING btree (owner_id);


--
-- Name: idx_outing_records_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outing_records_status ON public.outing_records USING btree (status);


--
-- Name: idx_outing_records_student_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outing_records_student_date ON public.outing_records USING btree (student_id, date);


--
-- Name: idx_sleep_records_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sleep_records_status ON public.sleep_records USING btree (status);


--
-- Name: idx_sleep_records_student_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sleep_records_student_date ON public.sleep_records USING btree (student_id, date);


--
-- Name: idx_students_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_name ON public.students USING btree (name);


--
-- Name: idx_students_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_org_id ON public.students USING btree (org_id);


--
-- Name: idx_students_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_status ON public.students USING btree (status);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_org_id ON public.users USING btree (org_id);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: attendance update_attendance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: classes update_classes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: consultations update_consultations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organizations update_organizations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: students update_students_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: attendance attendance_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;


--
-- Name: attendance attendance_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: classes classes_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: classes classes_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: consultations consultations_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: consultations consultations_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;


--
-- Name: consultations consultations_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: livescreen_state livescreen_state_current_outing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.livescreen_state
    ADD CONSTRAINT livescreen_state_current_outing_id_fkey FOREIGN KEY (current_outing_id) REFERENCES public.outing_records(id);


--
-- Name: livescreen_state livescreen_state_current_sleep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.livescreen_state
    ADD CONSTRAINT livescreen_state_current_sleep_id_fkey FOREIGN KEY (current_sleep_id) REFERENCES public.sleep_records(id);


--
-- Name: students students_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: users users_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organizations Anyone can create organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create organization" ON public.organizations FOR INSERT WITH CHECK (true);


--
-- Name: users Anyone can create user profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create user profile" ON public.users FOR INSERT WITH CHECK (true);


--
-- Name: manager_calls Enable delete access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete access for all users" ON public.manager_calls FOR DELETE USING (true);


--
-- Name: call_records Enable insert access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert access for all users" ON public.call_records FOR INSERT WITH CHECK (true);


--
-- Name: livescreen_state Enable insert access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert access for all users" ON public.livescreen_state FOR INSERT WITH CHECK (true);


--
-- Name: manager_calls Enable insert access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert access for all users" ON public.manager_calls FOR INSERT WITH CHECK (true);


--
-- Name: outing_records Enable insert access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert access for all users" ON public.outing_records FOR INSERT WITH CHECK (true);


--
-- Name: sleep_records Enable insert access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert access for all users" ON public.sleep_records FOR INSERT WITH CHECK (true);


--
-- Name: call_records Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.call_records FOR SELECT USING (true);


--
-- Name: livescreen_state Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.livescreen_state FOR SELECT USING (true);


--
-- Name: manager_calls Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.manager_calls FOR SELECT USING (true);


--
-- Name: outing_records Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.outing_records FOR SELECT USING (true);


--
-- Name: sleep_records Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.sleep_records FOR SELECT USING (true);


--
-- Name: call_records Enable update access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update access for all users" ON public.call_records FOR UPDATE USING (true);


--
-- Name: livescreen_state Enable update access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update access for all users" ON public.livescreen_state FOR UPDATE USING (true);


--
-- Name: manager_calls Enable update access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update access for all users" ON public.manager_calls FOR UPDATE USING (true);


--
-- Name: outing_records Enable update access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update access for all users" ON public.outing_records FOR UPDATE USING (true);


--
-- Name: sleep_records Enable update access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update access for all users" ON public.sleep_records FOR UPDATE USING (true);


--
-- Name: organizations Owners can update own organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can update own organization" ON public.organizations FOR UPDATE USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));


--
-- Name: attendance Owners/Managers can delete attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners/Managers can delete attendance" ON public.attendance FOR DELETE USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::public.user_role, 'manager'::public.user_role]))))));


--
-- Name: classes Owners/Managers can delete classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners/Managers can delete classes" ON public.classes FOR DELETE USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::public.user_role, 'manager'::public.user_role]))))));


--
-- Name: consultations Owners/Managers can delete consultations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners/Managers can delete consultations" ON public.consultations FOR DELETE USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::public.user_role, 'manager'::public.user_role]))))));


--
-- Name: students Owners/Managers can delete students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners/Managers can delete students" ON public.students FOR DELETE USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::public.user_role, 'manager'::public.user_role]))))));


--
-- Name: users Owners/Managers can manage users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners/Managers can manage users" ON public.users USING (((org_id = public.user_org_id()) AND (public.user_role() = ANY (ARRAY['owner'::public.user_role, 'manager'::public.user_role]))));


--
-- Name: attendance Users can create attendance in own organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create attendance in own organization" ON public.attendance FOR INSERT WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: classes Users can create classes in own organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create classes in own organization" ON public.classes FOR INSERT WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: consultations Users can create consultations in own organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create consultations in own organization" ON public.consultations FOR INSERT WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: students Users can create students in own organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create students in own organization" ON public.students FOR INSERT WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: attendance Users can update attendance in own organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update attendance in own organization" ON public.attendance FOR UPDATE USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: classes Users can update classes in own organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update classes in own organization" ON public.classes FOR UPDATE USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid())))) WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: consultations Users can update consultations in own organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update consultations in own organization" ON public.consultations FOR UPDATE USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: users Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: students Users can update students in own organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update students in own organization" ON public.students FOR UPDATE USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid())))) WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: attendance Users can view attendance in own organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view attendance in own organization" ON public.attendance FOR SELECT USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: classes Users can view classes in own organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view classes in own organization" ON public.classes FOR SELECT USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: consultations Users can view consultations in own organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view consultations in own organization" ON public.consultations FOR SELECT USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: organizations Users can view own organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own organization" ON public.organizations FOR SELECT USING (((id = public.user_org_id()) OR (owner_id = auth.uid())));


--
-- Name: students Users can view students in own organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view students in own organization" ON public.students FOR SELECT USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: users Users can view users in own organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view users in own organization" ON public.users FOR SELECT USING (((id = auth.uid()) OR (org_id = public.user_org_id())));


--
-- Name: attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: call_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.call_records ENABLE ROW LEVEL SECURITY;

--
-- Name: classes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

--
-- Name: consultations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

--
-- Name: livescreen_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.livescreen_state ENABLE ROW LEVEL SECURITY;

--
-- Name: manager_calls; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.manager_calls ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: outing_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.outing_records ENABLE ROW LEVEL SECURITY;

--
-- Name: sleep_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sleep_records ENABLE ROW LEVEL SECURITY;

--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict D37aOysTl9UdtcJZPhhdXjVd8kIBWE1qZlMyAbAnfQcxigKjMavqwhJk7aoqoOn

