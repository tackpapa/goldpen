-- STEP 2: 테이블 스키마 생성
-- STEP 1 완료 후 실행

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET row_security = off;

-- Organizations 테이블
CREATE TABLE organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'academy'::text NOT NULL,
    owner_id uuid,
    settings jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'active',
    subscription_plan text DEFAULT 'free',
    max_users integer DEFAULT 10,
    max_students integer DEFAULT 50,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT organizations_pkey PRIMARY KEY (id),
    CONSTRAINT organizations_type_check CHECK ((type = ANY (ARRAY['academy'::text, 'learning_center'::text, 'study_cafe'::text, 'tutoring'::text])))
);

-- Users 테이블
CREATE TABLE users (
    id uuid NOT NULL,
    org_id uuid NOT NULL,
    role user_role DEFAULT 'student'::user_role NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Students 테이블
CREATE TABLE students (
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
    CONSTRAINT students_pkey PRIMARY KEY (id),
    CONSTRAINT students_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'graduated'::text]))),
    CONSTRAINT students_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Classes 테이블
CREATE TABLE classes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    name text NOT NULL,
    subject text,
    teacher_id uuid,
    schedule jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT classes_pkey PRIMARY KEY (id),
    CONSTRAINT classes_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text]))),
    CONSTRAINT classes_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Attendance 테이블
CREATE TABLE attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    student_id uuid NOT NULL,
    class_id uuid,
    date date NOT NULL,
    status text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT attendance_pkey PRIMARY KEY (id),
    CONSTRAINT attendance_student_id_date_class_id_key UNIQUE (student_id, date, class_id),
    CONSTRAINT attendance_status_check CHECK ((status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'excused'::text]))),
    CONSTRAINT attendance_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT attendance_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);

-- Consultations 테이블
CREATE TABLE consultations (
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
    CONSTRAINT consultations_pkey PRIMARY KEY (id),
    CONSTRAINT consultations_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT consultations_type_check CHECK ((type = ANY (ARRAY['parent'::text, 'student'::text, 'academic'::text, 'behavioral'::text, 'other'::text]))),
    CONSTRAINT consultations_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT consultations_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
    CONSTRAINT consultations_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Livescreen 관련 테이블들
CREATE TABLE sleep_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    student_id text NOT NULL,
    seat_number integer NOT NULL,
    date date NOT NULL,
    sleep_time timestamp with time zone NOT NULL,
    wake_time timestamp with time zone,
    duration_minutes integer,
    status text DEFAULT 'sleeping'::text NOT NULL,
    CONSTRAINT sleep_records_pkey PRIMARY KEY (id),
    CONSTRAINT sleep_records_status_check CHECK ((status = ANY (ARRAY['sleeping'::text, 'awake'::text])))
);
ALTER TABLE ONLY sleep_records REPLICA IDENTITY FULL;

CREATE TABLE outing_records (
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
    CONSTRAINT outing_records_pkey PRIMARY KEY (id),
    CONSTRAINT outing_records_status_check CHECK ((status = ANY (ARRAY['out'::text, 'returned'::text])))
);
ALTER TABLE ONLY outing_records REPLICA IDENTITY FULL;

CREATE TABLE call_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    student_id text NOT NULL,
    seat_number integer NOT NULL,
    date date NOT NULL,
    call_time timestamp with time zone NOT NULL,
    acknowledged_time timestamp with time zone,
    message text DEFAULT '카운터로 와주세요'::text,
    status text DEFAULT 'calling'::text NOT NULL,
    CONSTRAINT call_records_pkey PRIMARY KEY (id),
    CONSTRAINT call_records_status_check CHECK ((status = ANY (ARRAY['calling'::text, 'acknowledged'::text])))
);

CREATE TABLE manager_calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    student_id text NOT NULL,
    seat_number integer NOT NULL,
    student_name text NOT NULL,
    date date NOT NULL,
    call_time timestamp with time zone NOT NULL,
    acknowledged_time timestamp with time zone,
    status text DEFAULT 'calling'::text NOT NULL,
    CONSTRAINT manager_calls_pkey PRIMARY KEY (id),
    CONSTRAINT manager_calls_status_check CHECK ((status = ANY (ARRAY['calling'::text, 'acknowledged'::text])))
);

CREATE TABLE livescreen_state (
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
    current_outing_id uuid,
    CONSTRAINT livescreen_state_pkey PRIMARY KEY (id),
    CONSTRAINT livescreen_state_student_id_seat_number_date_key UNIQUE (student_id, seat_number, date),
    CONSTRAINT livescreen_state_current_sleep_id_fkey FOREIGN KEY (current_sleep_id) REFERENCES sleep_records(id),
    CONSTRAINT livescreen_state_current_outing_id_fkey FOREIGN KEY (current_outing_id) REFERENCES outing_records(id)
);
ALTER TABLE ONLY livescreen_state REPLICA IDENTITY FULL;

-- 인덱스 생성
CREATE INDEX idx_users_org_id ON users USING btree (org_id);
CREATE INDEX idx_users_email ON users USING btree (email);
CREATE INDEX idx_users_role ON users USING btree (role);

CREATE INDEX idx_students_org_id ON students USING btree (org_id);
CREATE INDEX idx_students_name ON students USING btree (name);
CREATE INDEX idx_students_status ON students USING btree (status);

CREATE INDEX idx_classes_org_id ON classes USING btree (org_id);
CREATE INDEX idx_classes_teacher_id ON classes USING btree (teacher_id);
CREATE INDEX idx_classes_status ON classes USING btree (status);
CREATE INDEX idx_classes_subject ON classes USING btree (subject);

CREATE INDEX idx_attendance_org_id ON attendance USING btree (org_id);
CREATE INDEX idx_attendance_student_id ON attendance USING btree (student_id);
CREATE INDEX idx_attendance_class_id ON attendance USING btree (class_id);
CREATE INDEX idx_attendance_date ON attendance USING btree (date);
CREATE INDEX idx_attendance_status ON attendance USING btree (status);

CREATE INDEX idx_consultations_org_id ON consultations USING btree (org_id);
CREATE INDEX idx_consultations_student_id ON consultations USING btree (student_id);
CREATE INDEX idx_consultations_teacher_id ON consultations USING btree (teacher_id);
CREATE INDEX idx_consultations_date ON consultations USING btree (date);
CREATE INDEX idx_consultations_status ON consultations USING btree (status);

CREATE INDEX idx_organizations_owner_id ON organizations USING btree (owner_id);

CREATE INDEX idx_sleep_records_student_date ON sleep_records USING btree (student_id, date);
CREATE INDEX idx_sleep_records_status ON sleep_records USING btree (status);

CREATE INDEX idx_outing_records_student_date ON outing_records USING btree (student_id, date);
CREATE INDEX idx_outing_records_status ON outing_records USING btree (status);

CREATE INDEX idx_call_records_student_date ON call_records USING btree (student_id, date);
CREATE INDEX idx_call_records_status ON call_records USING btree (status);

CREATE INDEX idx_manager_calls_date_status ON manager_calls USING btree (date, status);

CREATE INDEX idx_livescreen_state_student_date ON livescreen_state USING btree (student_id, seat_number, date);

-- 트리거 생성
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON consultations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
