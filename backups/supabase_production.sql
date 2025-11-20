





-- Name: attendance; Type: TABLE; Schema: public; Owner: -

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


-- Name: call_records; Type: TABLE; Schema: public; Owner: -

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


-- Name: classes; Type: TABLE; Schema: public; Owner: -

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


-- Name: consultations; Type: TABLE; Schema: public; Owner: -

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


-- Name: livescreen_state; Type: TABLE; Schema: public; Owner: -

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


-- Name: manager_calls; Type: TABLE; Schema: public; Owner: -

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


-- Name: organizations; Type: TABLE; Schema: public; Owner: -

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


-- Name: outing_records; Type: TABLE; Schema: public; Owner: -

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


-- Name: sleep_records; Type: TABLE; Schema: public; Owner: -

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


-- Name: students; Type: TABLE; Schema: public; Owner: -

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


-- Name: users; Type: TABLE; Schema: public; Owner: -

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


-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: -



-- Data for Name: call_records; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.call_records VALUES ('1a3f7527-3a54-4a93-9fe4-f377d0141685', '2025-11-19 04:48:39.475441+00', 'student-1', 1, '2025-11-19', '2025-11-19 04:48:39.459+00', '2025-11-19 04:48:48.637+00', '카운터로 와주세요', 'acknowledged');
INSERT INTO public.call_records VALUES ('5b769048-3cb9-4719-aa44-42a97388cb80', '2025-11-19 04:48:56.747195+00', 'student-1', 1, '2025-11-19', '2025-11-19 04:48:56.726+00', '2025-11-19 04:49:02.092+00', '재휘"똥꼬', 'acknowledged');
INSERT INTO public.call_records VALUES ('599f8921-4e86-4368-b54f-92fa52c863d4', '2025-11-19 04:49:08.872176+00', 'student-1', 1, '2025-11-19', '2025-11-19 04:49:08.859+00', '2025-11-19 04:49:11.776+00', '찌찌만지러와', 'acknowledged');
INSERT INTO public.call_records VALUES ('54970984-1db9-485e-a0e0-111d03bf6635', '2025-11-19 05:07:16.68898+00', 'student-1', 1, '2025-11-19', '2025-11-19 05:07:16.68+00', '2025-11-19 05:07:19.356+00', '카운터로 와주세요', 'acknowledged');


-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: -



-- Data for Name: consultations; Type: TABLE DATA; Schema: public; Owner: -



-- Data for Name: livescreen_state; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.livescreen_state VALUES ('904c2106-0bc4-4202-87a0-18fdd24cd265', '2025-11-19 04:48:09.247757+00', '2025-11-19 04:48:09.247757+00', 'student-1', 1, '2025-11-19', 32, false, false, 'b468bffc-caca-4337-aa13-0ad83300a8ed', '9c23b112-d4b9-4f04-a58f-38dbc58db7f5');


-- Data for Name: manager_calls; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.manager_calls VALUES ('fba04b27-a88f-4de1-ab6e-049b96e6a8d9', '2025-11-19 10:44:36.372258+00', 'student-1', 1, '김민준', '2025-11-19', '2025-11-19 10:44:36.347+00', NULL, 'calling');
INSERT INTO public.manager_calls VALUES ('c314722c-2049-465f-b628-52656f9b14aa', '2025-11-19 10:52:49.265577+00', 'student-1', 1, '김민준', '2025-11-19', '2025-11-19 10:52:49.251+00', NULL, 'calling');
INSERT INTO public.manager_calls VALUES ('24542032-a00b-41b7-a124-572690afd240', '2025-11-19 10:56:26.130952+00', 'student-1', 1, '김민준', '2025-11-19', '2025-11-19 10:56:26.12+00', NULL, 'calling');
INSERT INTO public.manager_calls VALUES ('6ad1b5f4-22c2-4c12-bc6b-b4a36a4783d7', '2025-11-19 11:01:38.211566+00', 'student-1', 1, '김민준', '2025-11-19', '2025-11-19 11:01:38.206+00', NULL, 'calling');
INSERT INTO public.manager_calls VALUES ('a03b84fc-a7c1-42c8-881e-3eb93d963bb9', '2025-11-19 11:03:54.848729+00', 'student-1', 1, '김민준', '2025-11-19', '2025-11-19 11:03:54.841+00', NULL, 'calling');


-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.organizations VALUES ('3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', '골드펜 테스트 학원', 'academy', 'e9f6b5e9-da82-4409-8e07-1fd194273a33', '{}', '2025-11-19 16:05:15.512654+00', '2025-11-19 16:05:15.512654+00');


-- Data for Name: outing_records; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.outing_records VALUES ('f8f54b66-bc61-4713-a07c-793d8c18e049', '2025-11-19 04:49:48.104307+00', 'student-1', 1, '2025-11-19', '2025-11-19 04:49:48.077+00', '2025-11-19 04:49:57.627+00', 0, '편의점', 'returned');
INSERT INTO public.outing_records VALUES ('34ba80ec-6f76-44d7-a8f7-5a518837fa7b', '2025-11-19 05:00:06.503631+00', 'student-1', 1, '2025-11-19', '2025-11-19 05:00:06.49+00', '2025-11-19 05:00:14.74+00', 0, '편의점', 'returned');
INSERT INTO public.outing_records VALUES ('ae18c8a1-0428-4aea-8834-f7af83969a3a', '2025-11-19 05:06:58.133013+00', 'student-1', 1, '2025-11-19', '2025-11-19 05:06:58.114+00', '2025-11-19 05:07:08.096+00', 0, '편의점', 'returned');
INSERT INTO public.outing_records VALUES ('b36c20ba-a11a-42f2-878d-bd8e7c90f392', '2025-11-19 05:11:01.148233+00', 'student-1', 1, '2025-11-19', '2025-11-19 05:11:01.128+00', '2025-11-19 05:11:13.061+00', 0, '카페', 'returned');
INSERT INTO public.outing_records VALUES ('31d7d3d4-e61e-4e80-98b5-1d0d96d5fdcc', '2025-11-19 05:15:47.959795+00', 'student-1', 1, '2025-11-19', '2025-11-19 05:15:47.946+00', '2025-11-19 05:15:51.278+00', 0, '병원', 'returned');
INSERT INTO public.outing_records VALUES ('4a5147f6-8f68-4b91-a699-0ba9820de1e3', '2025-11-19 07:14:03.835627+00', 'student-1', 1, '2025-11-19', '2025-11-19 07:14:03.81+00', '2025-11-19 07:14:05.926+00', 0, '편의점', 'returned');
INSERT INTO public.outing_records VALUES ('8587c800-ddab-476c-85b8-47de68511196', '2025-11-19 07:14:18.292908+00', 'student-1', 1, '2025-11-19', '2025-11-19 07:14:18.261+00', '2025-11-19 07:14:21.076+00', 0, '편의점', 'returned');
INSERT INTO public.outing_records VALUES ('bf7ba909-16e4-4eba-8053-023d5ae15cdd', '2025-11-19 11:44:05.770601+00', 'student-1', 1, '2025-11-19', '2025-11-19 11:44:05.755+00', '2025-11-19 11:44:08.154+00', 0, '편의점', 'returned');
INSERT INTO public.outing_records VALUES ('1c4687e0-fd6b-4b6a-ada0-c3d409a3ac09', '2025-11-19 11:48:45.224819+00', 'student-1', 1, '2025-11-19', '2025-11-19 11:48:45.202+00', '2025-11-19 11:48:47.901+00', 0, '편의점', 'returned');
INSERT INTO public.outing_records VALUES ('9c23b112-d4b9-4f04-a58f-38dbc58db7f5', '2025-11-19 12:42:02.988374+00', 'student-1', 1, '2025-11-19', '2025-11-19 12:42:02.971+00', '2025-11-19 12:42:03.954+00', 0, '편의점', 'returned');


-- Data for Name: sleep_records; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.sleep_records VALUES ('515b7520-7153-4384-8b99-287127159eae', '2025-11-19 04:50:00.961308+00', 'student-1', 1, '2025-11-19', '2025-11-19 04:50:00.943+00', '2025-11-19 04:50:13.478+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('3fbe0d1a-6dee-441c-b517-65516cc25967', '2025-11-19 04:51:30.258063+00', 'student-1', 1, '2025-11-19', '2025-11-19 04:51:30.245+00', '2025-11-19 04:51:33.912+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('e906887e-2471-4933-9ff4-12569bea23f9', '2025-11-19 04:55:22.00706+00', 'student-1', 1, '2025-11-19', '2025-11-19 04:55:21.987+00', '2025-11-19 04:56:45.606+00', 1, 'awake');
INSERT INTO public.sleep_records VALUES ('1de3cc3d-3c76-4d5e-83b6-17d67787a3a6', '2025-11-19 04:58:47.213725+00', 'student-1', 1, '2025-11-19', '2025-11-19 04:58:47.208+00', '2025-11-19 04:58:53.606+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('1ce1c3f9-9be9-408d-a1ee-46ad343d2fd5', '2025-11-19 04:58:57.979937+00', 'student-1', 1, '2025-11-19', '2025-11-19 04:58:57.974+00', '2025-11-19 04:59:57.74+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('03de7250-27f7-4c0d-9e3c-e2d5c4132b36', '2025-11-19 05:01:04.796782+00', 'student-1', 1, '2025-11-19', '2025-11-19 05:01:04.777+00', '2025-11-19 05:01:09.224+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('4d51377b-9a79-4274-9df2-42a9f696529d', '2025-11-19 05:06:23.211226+00', 'student-1', 1, '2025-11-19', '2025-11-19 05:06:23.198+00', '2025-11-19 05:06:32.029+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('7a4529fa-7d59-4648-ab66-4c8f7d63cc44', '2025-11-19 05:06:41.068702+00', 'student-1', 1, '2025-11-19', '2025-11-19 05:06:41.063+00', '2025-11-19 05:06:55.045+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('49c22b51-3e90-4b67-a0a3-cfa50bc81450', '2025-11-19 05:10:47.701932+00', 'student-1', 1, '2025-11-19', '2025-11-19 05:10:47.68+00', '2025-11-19 05:10:57.611+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('33b0c8be-9aae-4456-8cbd-890a442e1a8c', '2025-11-19 05:11:42.744146+00', 'student-1', 1, '2025-11-19', '2025-11-19 05:11:42.73+00', '2025-11-19 05:14:55.029+00', 3, 'awake');
INSERT INTO public.sleep_records VALUES ('6b3d7d1e-2b64-4bc2-a9e3-74ab0a47ac3d', '2025-11-19 05:15:13.03794+00', 'student-1', 1, '2025-11-19', '2025-11-19 05:15:13.03+00', '2025-11-19 05:15:32.645+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('aa114401-870f-4847-acf1-8df6924c2794', '2025-11-19 05:15:37.686912+00', 'student-1', 1, '2025-11-19', '2025-11-19 05:15:37.68+00', '2025-11-19 05:15:44.862+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('b7432667-b5b2-433a-9248-4b27e9652c22', '2025-11-19 05:29:28.952696+00', 'student-1', 1, '2025-11-19', '2025-11-19 05:29:28.947+00', '2025-11-19 05:31:52.731+00', 2, 'awake');
INSERT INTO public.sleep_records VALUES ('69afd542-c57e-4461-b942-e0f98e6bb420', '2025-11-19 05:32:08.138177+00', 'student-1', 1, '2025-11-19', '2025-11-19 05:32:08.131+00', '2025-11-19 05:39:34.264+00', 7, 'awake');
INSERT INTO public.sleep_records VALUES ('b4d1d935-36a3-4eeb-b6cd-e4bdaa329025', '2025-11-19 05:44:32.552738+00', 'student-1', 1, '2025-11-19', '2025-11-19 05:44:32.531+00', '2025-11-19 05:44:40.587+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('271dd8c8-d088-4afc-8a8c-071701ca203c', '2025-11-19 05:53:44.590322+00', 'student-1', 1, '2025-11-19', '2025-11-19 05:53:44.582+00', '2025-11-19 05:54:49.813+00', 1, 'awake');
INSERT INTO public.sleep_records VALUES ('cf8122fb-0924-4818-8245-1dd562050315', '2025-11-19 05:59:34.825433+00', 'student-1', 1, '2025-11-19', '2025-11-19 05:59:34.817+00', '2025-11-19 05:59:59.579+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('89ef8f30-f36d-4efe-96c4-0e3665d6e09e', '2025-11-19 06:03:07.668208+00', 'student-1', 1, '2025-11-19', '2025-11-19 06:03:07.668+00', '2025-11-19 06:14:39.915+00', NULL, 'awake');
INSERT INTO public.sleep_records VALUES ('d66c0e84-1b94-4faf-b89b-4725345051ae', '2025-11-19 06:14:53.64299+00', 'student-1', 1, '2025-11-19', '2025-11-19 06:14:53.634+00', '2025-11-19 06:31:54.182+00', 17, 'awake');
INSERT INTO public.sleep_records VALUES ('5f42d746-bb12-4b75-9479-363542fde3bb', '2025-11-19 06:32:05.804652+00', 'student-1', 1, '2025-11-19', '2025-11-19 06:32:05.798+00', '2025-11-19 06:32:35.547+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('8e950760-969c-4149-96f8-5b17c9e4d2c2', '2025-11-19 06:40:04.629899+00', 'student-1', 1, '2025-11-19', '2025-11-19 06:40:04.62+00', '2025-11-19 06:40:08.702+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('f5ba44cb-04cc-4490-b74b-ea7e4a90a9c1', '2025-11-19 06:45:56.247489+00', 'student-1', 1, '2025-11-19', '2025-11-19 06:45:56.237+00', '2025-11-19 06:46:04.435+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('c5315910-6e59-4782-8d3d-171f7786bfa5', '2025-11-19 07:06:14.440666+00', 'student-1', 1, '2025-11-19', '2025-11-19 07:06:14.429+00', '2025-11-19 07:06:20.16+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('c3002366-7605-478c-8851-c5c9c4cef8e3', '2025-11-19 07:06:28.402098+00', 'student-1', 1, '2025-11-19', '2025-11-19 07:06:28.395+00', '2025-11-19 07:06:33.143+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('c51cf533-5d42-4e18-86b0-22fb613d5caf', '2025-11-19 07:13:57.551666+00', 'student-1', 1, '2025-11-19', '2025-11-19 07:13:57.545+00', '2025-11-19 07:14:00.844+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('bdc4d885-4418-4dbc-8d6f-f30045c5a00c', '2025-11-19 07:14:10.738323+00', 'student-1', 1, '2025-11-19', '2025-11-19 07:14:10.728+00', '2025-11-19 07:14:15.193+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('0f5c8eee-c7fe-47c5-8d27-aa7a28405ce6', '2025-11-19 07:15:56.400372+00', 'student-1', 1, '2025-11-19', '2025-11-19 07:15:56.394+00', '2025-11-19 07:15:57.509+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('f8d27ae7-c938-4fd4-b705-74f0d127ac1c', '2025-11-19 10:45:42.64162+00', 'student-1', 1, '2025-11-19', '2025-11-19 10:45:42.629+00', '2025-11-19 10:45:45.68+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('953e2d7e-4342-4901-827f-2f061cdace64', '2025-11-19 10:45:48.803666+00', 'student-1', 1, '2025-11-19', '2025-11-19 10:45:48.797+00', '2025-11-19 10:45:50.063+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('8ed9d9de-2e2f-4020-9f09-6f4cebbdf84b', '2025-11-19 11:43:58.463578+00', 'student-1', 1, '2025-11-19', '2025-11-19 11:43:58.438+00', '2025-11-19 11:44:03.253+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('955bf739-2e77-401a-87fc-cd1eab7bff20', '2025-11-19 11:48:39.810872+00', 'student-1', 1, '2025-11-19', '2025-11-19 11:48:39.785+00', '2025-11-19 11:48:41.234+00', 0, 'awake');
INSERT INTO public.sleep_records VALUES ('b468bffc-caca-4337-aa13-0ad83300a8ed', '2025-11-19 12:41:59.469977+00', 'student-1', 1, '2025-11-19', '2025-11-19 12:41:59.438+00', '2025-11-19 12:42:00.454+00', 0, 'awake');


-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: -



-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.users VALUES ('e9f6b5e9-da82-4409-8e07-1fd194273a33', '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3', 'owner', '테스트 사용자', 'test@goldpen.com', NULL, '2025-11-19 16:05:15.518742+00', '2025-11-19 16:05:15.518742+00');


-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


-- Name: attendance attendance_student_id_date_class_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_student_id_date_class_id_key UNIQUE (student_id, date, class_id);


-- Name: call_records call_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.call_records
    ADD CONSTRAINT call_records_pkey PRIMARY KEY (id);


-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


-- Name: consultations consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_pkey PRIMARY KEY (id);


-- Name: livescreen_state livescreen_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.livescreen_state
    ADD CONSTRAINT livescreen_state_pkey PRIMARY KEY (id);


-- Name: livescreen_state livescreen_state_student_id_seat_number_date_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.livescreen_state
    ADD CONSTRAINT livescreen_state_student_id_seat_number_date_key UNIQUE (student_id, seat_number, date);


-- Name: manager_calls manager_calls_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.manager_calls
    ADD CONSTRAINT manager_calls_pkey PRIMARY KEY (id);


-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


-- Name: outing_records outing_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.outing_records
    ADD CONSTRAINT outing_records_pkey PRIMARY KEY (id);


-- Name: sleep_records sleep_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.sleep_records
    ADD CONSTRAINT sleep_records_pkey PRIMARY KEY (id);


-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


-- Name: idx_attendance_class_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_attendance_class_id ON public.attendance USING btree (class_id);


-- Name: idx_attendance_date; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_attendance_date ON public.attendance USING btree (date);


-- Name: idx_attendance_org_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_attendance_org_id ON public.attendance USING btree (org_id);


-- Name: idx_attendance_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_attendance_status ON public.attendance USING btree (status);


-- Name: idx_attendance_student_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_attendance_student_id ON public.attendance USING btree (student_id);


-- Name: idx_call_records_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_call_records_status ON public.call_records USING btree (status);


-- Name: idx_call_records_student_date; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_call_records_student_date ON public.call_records USING btree (student_id, date);


-- Name: idx_classes_org_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_classes_org_id ON public.classes USING btree (org_id);


-- Name: idx_classes_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_classes_status ON public.classes USING btree (status);


-- Name: idx_classes_subject; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_classes_subject ON public.classes USING btree (subject);


-- Name: idx_classes_teacher_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_classes_teacher_id ON public.classes USING btree (teacher_id);


-- Name: idx_consultations_date; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_consultations_date ON public.consultations USING btree (date);


-- Name: idx_consultations_org_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_consultations_org_id ON public.consultations USING btree (org_id);


-- Name: idx_consultations_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_consultations_status ON public.consultations USING btree (status);


-- Name: idx_consultations_student_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_consultations_student_id ON public.consultations USING btree (student_id);


-- Name: idx_consultations_teacher_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_consultations_teacher_id ON public.consultations USING btree (teacher_id);


-- Name: idx_livescreen_state_student_date; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_livescreen_state_student_date ON public.livescreen_state USING btree (student_id, seat_number, date);


-- Name: idx_manager_calls_date_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_manager_calls_date_status ON public.manager_calls USING btree (date, status);


-- Name: idx_organizations_owner_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_organizations_owner_id ON public.organizations USING btree (owner_id);


-- Name: idx_outing_records_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_outing_records_status ON public.outing_records USING btree (status);


-- Name: idx_outing_records_student_date; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_outing_records_student_date ON public.outing_records USING btree (student_id, date);


-- Name: idx_sleep_records_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_sleep_records_status ON public.sleep_records USING btree (status);


-- Name: idx_sleep_records_student_date; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_sleep_records_student_date ON public.sleep_records USING btree (student_id, date);


-- Name: idx_students_name; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_students_name ON public.students USING btree (name);


-- Name: idx_students_org_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_students_org_id ON public.students USING btree (org_id);


-- Name: idx_students_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_students_status ON public.students USING btree (status);


-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_users_email ON public.users USING btree (email);


-- Name: idx_users_org_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_users_org_id ON public.users USING btree (org_id);


-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_users_role ON public.users USING btree (role);


-- Name: attendance update_attendance_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: classes update_classes_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: consultations update_consultations_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: organizations update_organizations_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: students update_students_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: attendance attendance_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;


-- Name: attendance attendance_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: attendance attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


-- Name: classes classes_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: classes classes_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE SET NULL;


-- Name: consultations consultations_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: consultations consultations_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;


-- Name: consultations consultations_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE SET NULL;


-- Name: livescreen_state livescreen_state_current_outing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.livescreen_state
    ADD CONSTRAINT livescreen_state_current_outing_id_fkey FOREIGN KEY (current_outing_id) REFERENCES public.outing_records(id);


-- Name: livescreen_state livescreen_state_current_sleep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.livescreen_state
    ADD CONSTRAINT livescreen_state_current_sleep_id_fkey FOREIGN KEY (current_sleep_id) REFERENCES public.sleep_records(id);


-- Name: students students_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: users users_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: organizations Anyone can create organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Anyone can create organization" ON public.organizations FOR INSERT WITH CHECK (true);


-- Name: users Anyone can create user profile; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Anyone can create user profile" ON public.users FOR INSERT WITH CHECK (true);


-- Name: manager_calls Enable delete access for all users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Enable delete access for all users" ON public.manager_calls FOR DELETE USING (true);


-- Name: call_records Enable insert access for all users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Enable insert access for all users" ON public.call_records FOR INSERT WITH CHECK (true);


-- Name: livescreen_state Enable insert access for all users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Enable insert access for all users" ON public.livescreen_state FOR INSERT WITH CHECK (true);


-- Name: manager_calls Enable insert access for all users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Enable insert access for all users" ON public.manager_calls FOR INSERT WITH CHECK (true);


-- Name: outing_records Enable insert access for all users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Enable insert access for all users" ON public.outing_records FOR INSERT WITH CHECK (true);


-- Name: sleep_records Enable insert access for all users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Enable insert access for all users" ON public.sleep_records FOR INSERT WITH CHECK (true);


-- Name: call_records Enable read access for all users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Enable read access for all users" ON public.call_records FOR SELECT USING (true);


-- Name: livescreen_state Enable read access for all users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Enable read access for all users" ON public.livescreen_state FOR SELECT USING (true);


-- Name: manager_calls Enable read access for all users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Enable read access for all users" ON public.manager_calls FOR SELECT USING (true);


-- Name: outing_records Enable read access for all users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Enable read access for all users" ON public.outing_records FOR SELECT USING (true);


-- Name: sleep_records Enable read access for all users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Enable read access for all users" ON public.sleep_records FOR SELECT USING (true);


-- Name: call_records Enable update access for all users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Enable update access for all users" ON public.call_records FOR UPDATE USING (true);


-- Name: livescreen_state Enable update access for all users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Enable update access for all users" ON public.livescreen_state FOR UPDATE USING (true);


-- Name: manager_calls Enable update access for all users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Enable update access for all users" ON public.manager_calls FOR UPDATE USING (true);


-- Name: outing_records Enable update access for all users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Enable update access for all users" ON public.outing_records FOR UPDATE USING (true);


-- Name: sleep_records Enable update access for all users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Enable update access for all users" ON public.sleep_records FOR UPDATE USING (true);


-- Name: organizations Owners can update own organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Owners can update own organization" ON public.organizations FOR UPDATE USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));


-- Name: attendance Owners/Managers can delete attendance; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Owners/Managers can delete attendance" ON public.attendance FOR DELETE USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::public.user_role, 'manager'::public.user_role]))))));


-- Name: classes Owners/Managers can delete classes; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Owners/Managers can delete classes" ON public.classes FOR DELETE USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::public.user_role, 'manager'::public.user_role]))))));


-- Name: consultations Owners/Managers can delete consultations; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Owners/Managers can delete consultations" ON public.consultations FOR DELETE USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::public.user_role, 'manager'::public.user_role]))))));


-- Name: students Owners/Managers can delete students; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Owners/Managers can delete students" ON public.students FOR DELETE USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::public.user_role, 'manager'::public.user_role]))))));


-- Name: users Owners/Managers can manage users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Owners/Managers can manage users" ON public.users USING (((org_id = public.user_org_id()) AND (public.user_role() = ANY (ARRAY['owner'::public.user_role, 'manager'::public.user_role]))));


-- Name: attendance Users can create attendance in own organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can create attendance in own organization" ON public.attendance FOR INSERT WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


-- Name: classes Users can create classes in own organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can create classes in own organization" ON public.classes FOR INSERT WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


-- Name: consultations Users can create consultations in own organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can create consultations in own organization" ON public.consultations FOR INSERT WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


-- Name: students Users can create students in own organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can create students in own organization" ON public.students FOR INSERT WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


-- Name: attendance Users can update attendance in own organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can update attendance in own organization" ON public.attendance FOR UPDATE USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


-- Name: classes Users can update classes in own organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can update classes in own organization" ON public.classes FOR UPDATE USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid())))) WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


-- Name: consultations Users can update consultations in own organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can update consultations in own organization" ON public.consultations FOR UPDATE USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


-- Name: users Users can update own profile; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


-- Name: students Users can update students in own organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can update students in own organization" ON public.students FOR UPDATE USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid())))) WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


-- Name: attendance Users can view attendance in own organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view attendance in own organization" ON public.attendance FOR SELECT USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


-- Name: classes Users can view classes in own organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view classes in own organization" ON public.classes FOR SELECT USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


-- Name: consultations Users can view consultations in own organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view consultations in own organization" ON public.consultations FOR SELECT USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


-- Name: organizations Users can view own organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view own organization" ON public.organizations FOR SELECT USING (((id = public.user_org_id()) OR (owner_id = auth.uid())));


-- Name: students Users can view students in own organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view students in own organization" ON public.students FOR SELECT USING ((org_id IN ( SELECT users.org_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


-- Name: users Users can view users in own organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view users in own organization" ON public.users FOR SELECT USING (((id = auth.uid()) OR (org_id = public.user_org_id())));


-- Name: attendance; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Name: call_records; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.call_records ENABLE ROW LEVEL SECURITY;

-- Name: classes; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Name: consultations; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- Name: livescreen_state; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.livescreen_state ENABLE ROW LEVEL SECURITY;

-- Name: manager_calls; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.manager_calls ENABLE ROW LEVEL SECURITY;

-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Name: outing_records; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.outing_records ENABLE ROW LEVEL SECURITY;

-- Name: sleep_records; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.sleep_records ENABLE ROW LEVEL SECURITY;

-- Name: students; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;



