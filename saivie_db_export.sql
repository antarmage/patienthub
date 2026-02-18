--
-- PostgreSQL database dump
--

\restrict RcOlh2SJN5gxWCX3eHJcmO2ErJpmyX9b1Wp9fZs0COhNyeksuUQvoJx94ETBudi

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
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
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    patient_id integer,
    provider_id integer,
    service_id integer,
    date date NOT NULL,
    "time" text NOT NULL,
    type text,
    status text,
    notes text,
    end_time text,
    duration integer,
    reason text,
    chief_complaint text,
    visit_type text,
    priority text,
    room text,
    billing_code text,
    billing_amount real,
    payment_status text,
    insurance_claim text,
    checked_in_at text,
    seen_at text,
    completed_at text,
    follow_up_date date,
    follow_up_notes text,
    vitals jsonb
);


--
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id integer NOT NULL,
    employee_name text NOT NULL,
    role text,
    date date NOT NULL,
    clock_in text,
    clock_out text,
    status text DEFAULT 'present'::text,
    hours_worked real,
    notes text
);


--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: billing_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_catalog (
    id integer NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    price real NOT NULL,
    tax_rate real DEFAULT 0,
    hsn_code text,
    description text,
    is_active boolean DEFAULT true
);


--
-- Name: billing_catalog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.billing_catalog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: billing_catalog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.billing_catalog_id_seq OWNED BY public.billing_catalog.id;


--
-- Name: clinical_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinical_notes (
    id integer NOT NULL,
    patient_id integer,
    provider_id integer,
    date date NOT NULL,
    type text,
    title text,
    content text NOT NULL,
    tags text[],
    is_private integer
);


--
-- Name: clinical_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clinical_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clinical_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clinical_notes_id_seq OWNED BY public.clinical_notes.id;


--
-- Name: consent_forms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consent_forms (
    id integer NOT NULL,
    patient_id integer,
    form_type text NOT NULL,
    signed_date date,
    signed_via text,
    status text,
    expiry_date date,
    notes text
);


--
-- Name: consent_forms_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.consent_forms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: consent_forms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.consent_forms_id_seq OWNED BY public.consent_forms.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id integer NOT NULL,
    title text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    patient_id integer,
    name text NOT NULL,
    type text,
    category text,
    date date NOT NULL,
    uploaded_by integer,
    description text,
    metadata jsonb
);


--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    date date NOT NULL,
    category text NOT NULL,
    description text,
    amount real NOT NULL,
    vendor text,
    payment_method text,
    approved_by text,
    notes text
);


--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: follicle_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follicle_data (
    id integer NOT NULL,
    patient_id integer,
    day integer,
    "left" real,
    "right" real,
    endometrium real
);


--
-- Name: follicle_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.follicle_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: follicle_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.follicle_data_id_seq OWNED BY public.follicle_data.id;


--
-- Name: follow_up_calls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follow_up_calls (
    id integer NOT NULL,
    patient_id integer,
    patient_name text NOT NULL,
    phone text,
    patient_type text,
    consultation_date text,
    planned_date text,
    actual_date text,
    lmp text,
    notes text,
    feeling text,
    got_medicines text,
    concerns text,
    cross_sell text,
    next_visit text,
    next_milestone text,
    didnt_pick_call_time text,
    follow_up text,
    follow_up_date text,
    status text DEFAULT 'pending'::text,
    created_by text
);


--
-- Name: follow_up_calls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.follow_up_calls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: follow_up_calls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.follow_up_calls_id_seq OWNED BY public.follow_up_calls.id;


--
-- Name: hormone_readings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hormone_readings (
    id integer NOT NULL,
    patient_id integer,
    day integer NOT NULL,
    estrogen real,
    progesterone real,
    lh real,
    fsh real,
    symptoms integer
);


--
-- Name: hormone_readings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hormone_readings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hormone_readings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hormone_readings_id_seq OWNED BY public.hormone_readings.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    patient_id integer,
    appointment_id integer,
    date date NOT NULL,
    items jsonb,
    subtotal real,
    tax real,
    total real,
    payment_method text,
    payment_status text,
    insurance_claim_id text,
    notes text
);


--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: lab_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_results (
    id integer NOT NULL,
    patient_id integer,
    lab_task_id integer,
    test_name text NOT NULL,
    category text,
    date date NOT NULL,
    results jsonb,
    unit text,
    value real,
    reference_min real,
    reference_max real,
    status text,
    notes text
);


--
-- Name: lab_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_results_id_seq OWNED BY public.lab_results.id;


--
-- Name: lab_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_tasks (
    id integer NOT NULL,
    patient_id integer,
    test text NOT NULL,
    due text NOT NULL,
    status text
);


--
-- Name: lab_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_tasks_id_seq OWNED BY public.lab_tasks.id;


--
-- Name: medications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medications (
    id integer NOT NULL,
    patient_id integer,
    name text NOT NULL,
    dose text,
    frequency text,
    route text,
    start_date date,
    end_date date,
    prescribed_by integer,
    status text,
    notes text
);


--
-- Name: medications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medications_id_seq OWNED BY public.medications.id;


--
-- Name: medicine_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medicine_catalog (
    id integer NOT NULL,
    name text NOT NULL,
    generic_name text,
    default_dose text,
    dose_options text[],
    default_frequency text,
    route text,
    category text,
    is_active boolean DEFAULT true
);


--
-- Name: medicine_catalog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medicine_catalog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medicine_catalog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medicine_catalog_id_seq OWNED BY public.medicine_catalog.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: nutrition_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_plans (
    id integer NOT NULL,
    name text NOT NULL,
    tags text[],
    assigned_to integer
);


--
-- Name: nutrition_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nutrition_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nutrition_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nutrition_plans_id_seq OWNED BY public.nutrition_plans.id;


--
-- Name: patient_protocols; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_protocols (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    primary_goal text,
    dietary_strategy text,
    weekly_plan jsonb,
    notes text,
    saved_by text,
    saved_at text
);


--
-- Name: patient_protocols_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patient_protocols_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: patient_protocols_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patient_protocols_id_seq OWNED BY public.patient_protocols.id;


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id integer NOT NULL,
    name text NOT NULL,
    age integer NOT NULL,
    status text,
    focus text,
    last_visit text,
    cycle_day integer,
    avatar text,
    mode text,
    referred_by text,
    referred_to text,
    vaccination text,
    insurance text,
    contraception text,
    history jsonb,
    type text,
    mood text,
    weight real,
    hb real,
    genomics jsonb,
    functional jsonb,
    intervention jsonb,
    plan text,
    next_review text,
    clinician_note text,
    condition text,
    phone text,
    email text,
    address text,
    lmp text,
    height text,
    bp text,
    pregnancy_status text,
    is_prime_member boolean DEFAULT false,
    prime_member_since text
);


--
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- Name: pregnancy_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pregnancy_metrics (
    id integer NOT NULL,
    patient_id integer,
    week integer NOT NULL,
    weight real,
    expected real,
    systolic integer,
    diastolic integer
);


--
-- Name: pregnancy_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pregnancy_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pregnancy_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pregnancy_metrics_id_seq OWNED BY public.pregnancy_metrics.id;


--
-- Name: providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.providers (
    id integer NOT NULL,
    name text NOT NULL,
    role text,
    availability text,
    specialty text,
    qualification text,
    reg_number text,
    reg_council text,
    reg_year text,
    additional_qualifications text,
    clinic_name text,
    clinic_address text,
    clinic_phone text,
    clinic_timing text
);


--
-- Name: providers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.providers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: providers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.providers_id_seq OWNED BY public.providers.id;


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    id integer NOT NULL,
    patient_id integer,
    referred_by_provider_id integer,
    referred_to_provider_id integer,
    referred_to_external text,
    date date NOT NULL,
    reason text,
    urgency text,
    status text,
    notes text,
    outcome text
);


--
-- Name: referrals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.referrals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: referrals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.referrals_id_seq OWNED BY public.referrals.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id integer NOT NULL,
    service_id text,
    name text NOT NULL,
    duration text,
    price text
);


--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    role text
);


--
-- Name: usg_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usg_data (
    id integer NOT NULL,
    patient_id integer,
    week integer,
    hc real,
    ac real,
    fl real
);


--
-- Name: usg_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usg_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usg_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usg_data_id_seq OWNED BY public.usg_data.id;


--
-- Name: visit_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visit_history (
    id integer NOT NULL,
    patient_id integer,
    appointment_id integer,
    provider_id integer,
    date date NOT NULL,
    visit_type text,
    chief_complaint text,
    diagnosis text,
    vitals jsonb,
    examination jsonb,
    subjective text,
    objective text,
    assessment text,
    plan_notes text,
    prescriptions jsonb,
    procedures jsonb,
    labs_ordered jsonb,
    follow_up_plan text,
    outcome text
);


--
-- Name: visit_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.visit_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: visit_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.visit_history_id_seq OWNED BY public.visit_history.id;


--
-- Name: workouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workouts (
    id integer NOT NULL,
    name text NOT NULL,
    phase text,
    intensity text
);


--
-- Name: workouts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workouts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workouts_id_seq OWNED BY public.workouts.id;


--
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: billing_catalog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_catalog ALTER COLUMN id SET DEFAULT nextval('public.billing_catalog_id_seq'::regclass);


--
-- Name: clinical_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_notes ALTER COLUMN id SET DEFAULT nextval('public.clinical_notes_id_seq'::regclass);


--
-- Name: consent_forms id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_forms ALTER COLUMN id SET DEFAULT nextval('public.consent_forms_id_seq'::regclass);


--
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: follicle_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follicle_data ALTER COLUMN id SET DEFAULT nextval('public.follicle_data_id_seq'::regclass);


--
-- Name: follow_up_calls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_up_calls ALTER COLUMN id SET DEFAULT nextval('public.follow_up_calls_id_seq'::regclass);


--
-- Name: hormone_readings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hormone_readings ALTER COLUMN id SET DEFAULT nextval('public.hormone_readings_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: lab_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results ALTER COLUMN id SET DEFAULT nextval('public.lab_results_id_seq'::regclass);


--
-- Name: lab_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_tasks ALTER COLUMN id SET DEFAULT nextval('public.lab_tasks_id_seq'::regclass);


--
-- Name: medications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications ALTER COLUMN id SET DEFAULT nextval('public.medications_id_seq'::regclass);


--
-- Name: medicine_catalog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_catalog ALTER COLUMN id SET DEFAULT nextval('public.medicine_catalog_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: nutrition_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_plans ALTER COLUMN id SET DEFAULT nextval('public.nutrition_plans_id_seq'::regclass);


--
-- Name: patient_protocols id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_protocols ALTER COLUMN id SET DEFAULT nextval('public.patient_protocols_id_seq'::regclass);


--
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- Name: pregnancy_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pregnancy_metrics ALTER COLUMN id SET DEFAULT nextval('public.pregnancy_metrics_id_seq'::regclass);


--
-- Name: providers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.providers ALTER COLUMN id SET DEFAULT nextval('public.providers_id_seq'::regclass);


--
-- Name: referrals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals ALTER COLUMN id SET DEFAULT nextval('public.referrals_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: usg_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usg_data ALTER COLUMN id SET DEFAULT nextval('public.usg_data_id_seq'::regclass);


--
-- Name: visit_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_history ALTER COLUMN id SET DEFAULT nextval('public.visit_history_id_seq'::regclass);


--
-- Name: workouts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts ALTER COLUMN id SET DEFAULT nextval('public.workouts_id_seq'::regclass);


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appointments (id, patient_id, provider_id, service_id, date, "time", type, status, notes, end_time, duration, reason, chief_complaint, visit_type, priority, room, billing_code, billing_amount, payment_status, insurance_claim, checked_in_at, seen_at, completed_at, follow_up_date, follow_up_notes, vitals) FROM stdin;
1	1	1	3	2026-02-09	09:00	Fertility Scan	On Time	\N	09:45	45	Follicular monitoring - Day 14	Tracking ovulation for natural conception	Follow-up	High	Scan Room 1	CPT-76857	150	Covered	CLM-2026-0441	\N	\N	\N	\N	\N	{"bp": "118/76", "temp": 36.6, "pulse": 72, "weight": 68}
2	2	1	2	2026-02-09	09:30	Antenatal Check	Late	\N	10:00	30	Routine antenatal check - Week 24	Gestational diabetes monitoring, BP check	Follow-up	Medium	Consult Room 2	CPT-59426	100	Covered	CLM-2026-0442	\N	\N	\N	\N	\N	{"bp": "122/82", "temp": 36.5, "pulse": 80, "weight": 68, "fundal_height": "24cm"}
3	3	1	2	2026-02-09	10:00	Postpartum Review	On Time	\N	10:30	30	Postpartum recovery assessment - Week 6	Mood assessment, wound healing check	Follow-up	Medium	Consult Room 1	CPT-59430	100	Pending	\N	\N	\N	\N	\N	\N	{"bp": "116/74", "temp": 36.4, "pulse": 68, "weight": 65}
4	5	2	1	2026-02-09	11:00	Diet Consult	On Time	\N	12:00	60	PCOS dietary intervention review	Weight management, insulin resistance diet plan	Consultation	Low	Nutrition Suite	CPT-97804	200	Covered	CLM-2026-0444	\N	\N	\N	\N	\N	{"bp": "120/78", "temp": 36.5, "pulse": 74, "weight": 78}
5	20	4	\N	2024-10-04	20:06	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
42	20	4	\N	2024-11-11	19:20	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "154 cm", "weight": 61.3}
68	20	4	\N	2024-12-06	20:31	Gynaecologist consultation Dr. Divya	Completed	BP: 119/74	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "119/74", "height": "155", "weight": 64}
85	20	4	\N	2025-01-02	19:29	Gynaecologist consultation Dr. Divya	Completed	BP: 95/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "95/60", "height": "164", "weight": 65}
438	329	\N	\N	2025-01-02	19:29	Gynaecologist consultation Dr. Divya	Completed	BP: 95/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "95/60", "height": "164", "weight": 65}
439	330	\N	\N	2025-02-14	19:53	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80"}
440	331	\N	\N	2025-04-22	20:30	Gynaecologist consultation Dr. Divya	Completed	BP: 100/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/70"}
441	332	\N	\N	2025-07-10	20:40	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "148", "weight": 58}
442	331	\N	\N	2025-07-21	17:17	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "154", "weight": 61.3}
16	18	\N	\N	2024-10-17	19:10	General medicine Dr Antariksh	Completed	\N	\N	\N	General medicine Dr Antariksh	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
443	331	\N	\N	2025-10-09	11:40	Gynaecologist consultation Dr. Divya	Completed	BP: 115/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/80", "height": "150", "weight": 60.5}
444	333	\N	\N	2025-11-17	18:39	Gynaecologist consultation Dr. Divya	Completed	BP: 115/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/70", "height": "157", "weight": 59.1}
445	334	\N	\N	2025-11-14	00:00	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "151", "weight": 52.9}
446	335	\N	\N	2025-12-06	20:28	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "156", "weight": 701}
447	336	\N	\N	2025-12-20	18:59	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "145", "weight": 44}
448	337	\N	\N	2026-01-03	17:54	Gynaecologist consultation Dr. Divya	Completed	BP: 130/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/90", "height": "159", "weight": 69.3}
449	338	\N	\N	2026-01-10	17:45	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "156", "weight": 61}
450	298	\N	\N	2026-02-10	12:32	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "155", "weight": 52.4}
451	314	\N	\N	2026-02-10	12:39	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "156", "weight": 69.4}
455	346	\N	\N	2026-02-12	18:07	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "154", "weight": 67}
456	347	\N	\N	2026-02-13	19:03	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "152", "weight": 47.4}
458	349	\N	\N	2026-02-15	11:52	Gynaecologist consultation Dr. Divya	Completed	BP: 130/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	PCOS	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/70", "height": "151", "weight": 89.3}
459	350	\N	\N	2026-02-15	11:59	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "159", "weight": 54.5}
460	294	\N	\N	2026-02-15	12:07	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "139", "weight": 54}
461	351	\N	\N	2026-02-15	18:34	Gynaecologist consultation Dr. Divya	Completed	BP: 140/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "140/80", "height": "153", "weight": 91.6}
462	314	\N	\N	2026-02-15	18:39	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "158", "weight": 48.9}
38	37	\N	\N	2024-11-08	20:00	Dermatologist consultation Dr. Ismat	Completed	\N	\N	\N	Dermatologist consultation Dr. Ismat	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
6	8	4	\N	2024-10-05	20:12	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
386	304	4	\N	2025-12-06	20:28	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "156", "weight": 701}
452	345	\N	\N	2024-10-04	20:06	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
453	329	\N	\N	2024-11-11	19:20	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "154 cm", "weight": 61.3}
454	329	\N	\N	2024-12-06	20:31	Gynaecologist consultation Dr. Divya	Completed	BP: 119/74	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "119/74", "height": "155", "weight": 64}
457	1	1	\N	2026-02-13	10:00	Follow-up	scheduled	\N	\N	\N	\N	\N	Follow-up	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
52	50	\N	\N	2024-11-24	13:02	Pediatrician Dr Debasis	Completed	\N	\N	\N	Pediatrician Dr Debasis	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"weight": 14.5}
392	302	4	\N	2025-12-20	18:59	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "145", "weight": 44}
102	89	\N	\N	2025-01-25	15:33	Psychologist Dr. Prasakha	Completed	\N	\N	\N	Psychologist Dr. Prasakha	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
103	90	\N	\N	2025-01-25	16:00	Psychologist Dr. Prasakha	Completed	\N	\N	\N	Psychologist Dr. Prasakha	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
104	91	\N	\N	2025-01-25	16:41	Psychologist Dr. Prasakha	Completed	\N	\N	\N	Psychologist Dr. Prasakha	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
110	96	\N	\N	2025-02-04	20:18	Dermatologist consultation Dr. Ismat	Completed	\N	\N	\N	Dermatologist consultation Dr. Ismat	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
176	283	4	\N	2025-04-22	20:30	Gynaecologist consultation Dr. Divya	Completed	BP: 100/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/70"}
262	283	4	\N	2025-07-21	17:17	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "154", "weight": 61.3}
335	283	4	\N	2025-10-09	11:40	Gynaecologist consultation Dr. Divya	Completed	BP: 115/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/80", "height": "150", "weight": 60.5}
146	88	\N	\N	2025-03-10	17:12	Psychologist Dr. Prasakha	Completed	\N	\N	\N	Psychologist Dr. Prasakha	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
141	122	4	\N	2025-03-05	08:55	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
134	213	4	\N	2025-02-25	20:14	Gynaecologist consultation Dr. Divya	Completed	BP: 130/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/90"}
122	200	4	\N	2025-02-14	19:53	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80"}
20	13	4	\N	2024-10-19	19:26	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
21	21	4	\N	2024-10-19	20:44	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
306	249	\N	\N	2025-09-10	12:56	Nutrition Subhra	Completed	BP: 130/80	\N	\N	Nutrition Subhra	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "148", "weight": 90}
7	9	4	\N	2024-10-06	16:02	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
8	10	4	\N	2024-10-07	19:38	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
9	11	4	\N	2024-10-07	19:50	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
10	12	4	\N	2024-10-07	19:52	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
11	13	4	\N	2024-10-12	18:41	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
12	14	4	\N	2024-10-15	19:57	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
13	15	4	\N	2024-10-15	20:10	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
14	16	4	\N	2024-10-15	20:47	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
15	17	4	\N	2024-10-15	21:00	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
17	19	4	\N	2024-10-17	19:52	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
18	20	4	\N	2024-10-17	20:06	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
19	17	4	\N	2024-10-17	20:25	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
22	22	4	\N	2024-10-21	20:42	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
23	23	4	\N	2024-10-21	20:44	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
24	24	4	\N	2024-10-24	18:34	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
25	25	4	\N	2024-10-24	19:49	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
26	26	4	\N	2024-10-27	19:20	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
27	27	4	\N	2024-10-27	19:45	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
28	28	4	\N	2024-10-29	19:55	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
29	29	4	\N	2024-10-29	20:56	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
30	30	4	\N	2024-10-30	19:55	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
31	31	4	\N	2024-11-01	19:40	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
32	32	4	\N	2024-11-03	19:14	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
33	33	4	\N	2024-11-03	19:37	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
34	34	4	\N	2024-11-03	19:58	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
35	35	4	\N	2024-11-03	20:15	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
36	36	4	\N	2024-11-06	20:03	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "148 centimetre", "weight": 47.5}
37	26	4	\N	2024-11-07	19:39	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "153 cm", "weight": 60}
39	38	4	\N	2024-11-08	20:10	Gynaecologist consultation Dr. Divya	Completed	BP: 124/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "124/80", "weight": 71.7}
40	39	4	\N	2024-11-09	20:17	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "155", "weight": 77.2}
41	40	4	\N	2024-11-11	19:09	Gynaecologist consultation Dr. Divya	Completed	BP: 130/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/90", "height": "143 cm", "weight": 55.9}
43	41	4	\N	2024-11-11	19:49	Gynaecologist consultation Dr. Divya	Completed	BP: 90/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "90/60", "height": "154 cm", "weight": 67.2}
44	42	4	\N	2024-11-14	20:20	Gynaecologist consultation Dr. Divya	Completed	BP: 110/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/80", "height": "147 cm", "weight": 49.3}
129	111	4	\N	2025-02-19	18:06	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
45	43	4	\N	2024-11-23	18:53	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "153", "weight": 70.4}
46	44	4	\N	2024-11-23	19:29	Gynaecologist consultation Dr. Divya	Completed	BP: 110/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/80", "height": "151 cm", "weight": 64}
47	45	4	\N	2024-11-23	19:57	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "139 cm", "weight": 69.2}
48	46	4	\N	2024-11-23	20:00	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "149 cm", "weight": 53.7}
49	47	4	\N	2024-11-23	20:14	Gynaecologist consultation Dr. Divya	Completed	BP: 110/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/80", "height": "151", "weight": 60}
50	48	4	\N	2024-11-23	20:28	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "weight": 59.9}
51	49	4	\N	2024-11-24	12:48	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "148", "weight": 58.1}
53	51	4	\N	2024-11-24	19:28	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "144 cm", "weight": 45.3}
54	52	4	\N	2024-11-24	20:08	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "156 cm", "weight": 71.2}
55	53	4	\N	2024-11-24	20:23	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "144cm", "weight": 47.3}
56	38	4	\N	2024-11-24	20:53	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "weight": 71.7}
57	54	4	\N	2024-11-25	19:16	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "145 cm", "weight": 56.7}
58	55	4	\N	2024-11-25	19:26	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "140 cm", "weight": 44.9}
59	24	4	\N	2024-11-25	19:47	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "159 cm", "weight": 83.6}
60	56	4	\N	2024-11-25	20:13	Gynaecologist consultation Dr. Divya	Completed	BP: 132/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "132/70", "height": "145 cm", "weight": 52.9}
61	19	4	\N	2024-11-28	18:27	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "157 cm", "weight": 66.6}
62	57	4	\N	2024-11-28	19:43	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
63	26	4	\N	2024-11-28	19:59	Gynaecologist consultation Dr. Divya	Completed	BP: 105/66	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "105/66", "weight": 64}
64	11	4	\N	2024-11-28	20:00	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
65	27	4	\N	2024-11-28	20:38	Gynaecologist consultation Dr. Divya	Completed	BP: 110/72	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/72", "height": "5’2", "weight": 53.4}
66	35	4	\N	2024-11-28	20:54	Gynaecologist consultation Dr. Divya	Completed	BP: 122/74	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "122/74", "weight": 68.3}
67	58	4	\N	2024-12-05	20:21	Gynaecologist consultation Dr. Divya	Completed	BP: 142/87	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "142/87", "height": "152", "weight": 64}
69	59	4	\N	2024-12-08	19:40	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
70	60	4	\N	2024-12-08	20:18	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
71	61	4	\N	2024-12-18	19:21	Gynaecologist consultation Dr. Divya	Completed	BP: 121/77	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "121/77", "height": "159", "weight": 50}
72	62	4	\N	2024-12-18	19:24	Gynaecologist consultation Dr. Divya	Completed	BP: 124/77	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "124/77", "height": "143", "weight": 53}
73	63	4	\N	2024-12-19	19:34	Gynaecologist consultation Dr. Divya	Completed	BP: 115/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/70", "height": "155", "weight": 50.9}
74	64	4	\N	2024-12-21	19:16	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "153", "weight": 62.1}
75	65	4	\N	2024-12-21	19:28	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "151", "weight": 74.2}
76	66	4	\N	2024-12-21	20:07	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "150", "weight": 92.7}
77	67	4	\N	2024-12-21	20:11	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "155", "weight": 51}
78	68	4	\N	2024-12-23	19:04	Gynaecologist consultation Dr. Divya	Completed	BP: 117/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "117/75", "height": "145", "weight": 62.5}
79	44	4	\N	2024-12-23	19:30	Gynaecologist consultation Dr. Divya	Completed	BP: 129/85	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "129/85", "height": "161", "weight": 58}
80	69	4	\N	2024-12-23	19:31	Gynaecologist consultation Dr. Divya	Completed	BP: 133/85	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "133/85", "height": "171", "weight": 88}
81	70	4	\N	2024-12-26	18:30	Gynaecologist consultation Dr. Divya	Completed	BP: 123/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "123/80", "height": "165", "weight": 71.5}
82	71	4	\N	2024-12-26	19:45	Gynaecologist consultation Dr. Divya	Completed	BP: 100/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/60", "height": "162", "weight": 61}
83	72	4	\N	2024-12-27	19:36	Gynaecologist consultation Dr. Divya	Completed	BP: 115/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/60", "height": "159", "weight": 56.9}
84	73	4	\N	2024-12-29	20:05	Gynaecologist consultation Dr. Divya	Completed	BP: 110/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/75", "height": "165", "weight": 77.1}
86	48	4	\N	2025-01-02	20:06	Gynaecologist consultation Dr. Divya	Completed	BP: 115/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/70", "height": "162", "weight": 63.5}
87	75	4	\N	2025-01-02	20:40	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "170", "weight": 61.2}
88	76	4	\N	2025-01-03	19:40	Gynaecologist consultation Dr. Divya	Completed	BP: 130/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/90"}
89	77	4	\N	2025-01-04	19:44	Gynaecologist consultation Dr. Divya	Completed	BP: 140/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "140/90", "height": "168", "weight": 85.3}
90	78	4	\N	2025-01-08	20:28	Gynaecologist consultation Dr. Divya	Completed	BP: 90/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "90/70", "height": "170", "weight": 61}
91	79	4	\N	2025-01-08	20:37	Gynaecologist consultation Dr. Divya	Completed	BP: 115/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/70", "height": "173", "weight": 63}
92	40	4	\N	2025-01-08	20:47	Gynaecologist consultation Dr. Divya	Completed	BP: 130/85	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/85", "height": "150", "weight": 55}
93	80	4	\N	2025-01-08	20:52	Gynaecologist consultation Dr. Divya	Completed	BP: 130/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/90", "height": "166", "weight": 81}
94	81	4	\N	2025-01-09	19:36	Gynaecologist consultation Dr. Divya	Completed	BP: 130/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/90", "height": "153", "weight": 51}
95	82	4	\N	2025-01-10	19:25	Gynaecologist consultation Dr. Divya	Completed	BP: 100/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/70", "height": "165", "weight": 61.2}
96	83	4	\N	2025-01-10	19:45	Gynaecologist consultation Dr. Divya	Completed	BP: 90/50	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "90/50"}
97	84	4	\N	2025-01-10	19:55	Gynaecologist consultation Dr. Divya	Completed	BP: 100/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/70"}
98	85	4	\N	2025-01-14	21:02	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70"}
99	86	4	\N	2025-01-23	20:01	Gynaecologist consultation Dr. Divya	Completed	BP: 100/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/70", "height": "164", "weight": 54.7}
100	87	4	\N	2025-01-24	19:10	Gynaecologist consultation Dr. Divya	Completed	BP: 90/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "90/60"}
101	88	4	\N	2025-01-24	20:28	Gynaecologist consultation Dr. Divya	Completed	BP: 100/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/60", "height": "166"}
105	92	4	\N	2025-01-27	19:24	Gynaecologist consultation Dr. Divya	Completed	BP: 130/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/70", "height": "174", "weight": 64}
106	93	4	\N	2025-01-29	19:48	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
107	11	4	\N	2025-01-29	19:50	Gynaecologist consultation Dr. Divya	Completed	BP: 99/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "99/60"}
108	94	4	\N	2025-01-29	19:54	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
109	95	4	\N	2025-02-01	20:18	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70"}
111	97	4	\N	2025-02-05	19:27	Gynaecologist consultation Dr. Divya	Completed	BP: 80/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "80/60"}
112	98	4	\N	2025-02-05	19:41	Gynaecologist consultation Dr. Divya	Completed	BP: 90/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "90/60"}
113	99	4	\N	2025-02-05	19:50	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
114	35	4	\N	2025-02-05	20:02	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80"}
115	100	4	\N	2025-02-05	20:18	Gynaecologist consultation Dr. Divya	Completed	BP: 90/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "90/60"}
116	101	4	\N	2025-02-06	19:08	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
117	102	4	\N	2025-02-06	19:40	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
118	38	4	\N	2025-02-06	20:04	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
119	103	4	\N	2025-02-09	17:52	Gynaecologist consultation Dr. Divya	Completed	BP: 90/50	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "90/50"}
120	104	4	\N	2025-02-11	20:51	Gynaecologist consultation Dr. Divya	Completed	BP: 115/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/60"}
121	105	4	\N	2025-02-13	18:52	Gynaecologist consultation Dr. Divya	Completed	BP: 110/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/75"}
123	107	4	\N	2025-02-14	20:37	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70"}
124	85	4	\N	2025-02-15	20:02	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70"}
125	108	4	\N	2025-02-15	20:27	Gynaecologist consultation Dr. Divya	Completed	BP: 140/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "140/80"}
126	109	4	\N	2025-02-16	19:34	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70"}
127	110	4	\N	2025-02-18	20:12	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
128	93	4	\N	2025-02-18	20:40	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
130	112	4	\N	2025-02-21	17:51	Gynaecologist consultation Dr. Divya	Completed	BP: 110/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/80"}
131	113	4	\N	2025-02-21	19:22	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70"}
132	114	4	\N	2025-02-25	19:54	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70"}
133	115	4	\N	2025-02-25	20:04	Gynaecologist consultation Dr. Divya	Completed	BP: 90/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "90/60"}
135	95	4	\N	2025-02-25	20:40	Gynaecologist consultation Dr. Divya	Completed	BP: 115/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/70"}
136	117	4	\N	2025-02-25	21:06	Gynaecologist consultation Dr. Divya	Completed	BP: 115/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/70"}
137	118	4	\N	2025-02-27	19:32	Gynaecologist consultation Dr. Divya	Completed	BP: 110/65	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/65"}
138	119	4	\N	2025-02-27	19:38	Gynaecologist consultation Dr. Divya	Completed	BP: 100/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/70"}
139	120	4	\N	2025-02-28	20:00	Gynaecologist consultation Dr. Divya	Completed	BP: 90/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "90/60"}
140	121	4	\N	2025-03-01	18:47	Gynaecologist consultation Dr. Divya	Completed	BP: 80/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "80/60"}
142	123	4	\N	2025-03-07	19:18	Gynaecologist consultation Dr. Divya	Completed	BP: 100/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/60"}
143	124	4	\N	2025-03-09	12:51	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
144	125	4	\N	2025-03-09	12:51	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
145	113	4	\N	2025-03-09	18:46	Gynaecologist consultation Dr. Divya	Completed	BP: 115/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/75"}
147	126	4	\N	2025-03-16	13:48	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
148	127	4	\N	2025-03-20	18:34	Gynaecologist consultation Dr. Divya	Completed	BP: 110/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/75"}
149	128	4	\N	2025-03-20	18:36	Gynaecologist consultation Dr. Divya	Completed	BP: 90/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "90/60"}
150	129	4	\N	2025-03-22	10:16	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
151	130	4	\N	2025-03-22	18:41	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
152	36	4	\N	2025-03-22	19:18	Gynaecologist consultation Dr. Divya	Completed	BP: 115/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/80"}
153	131	4	\N	2025-03-22	19:36	Gynaecologist consultation Dr. Divya	Completed	BP: 90/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "90/60"}
154	132	4	\N	2025-03-24	15:28	Gynaecologist consultation Dr. Divya	Completed	BP: 125/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "125/70"}
201	171	4	\N	2025-05-07	19:31	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "154", "weight": 69.4}
155	133	4	\N	2025-03-25	09:35	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "149.5", "weight": 62.4}
156	134	4	\N	2025-03-29	10:18	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
157	135	4	\N	2025-03-29	10:22	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
158	136	4	\N	2025-03-29	10:23	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
159	137	4	\N	2025-03-30	23:34	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
160	138	4	\N	2025-04-01	19:46	Gynaecologist consultation Dr. Divya	Completed	BP: 90/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "90/60"}
161	139	4	\N	2025-04-01	20:05	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70"}
162	140	4	\N	2025-04-03	19:42	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "161", "weight": 87.14}
163	141	4	\N	2025-04-03	20:07	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
164	124	4	\N	2025-04-07	09:41	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
165	125	4	\N	2025-04-07	09:42	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
166	142	4	\N	2025-04-07	09:43	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
167	143	4	\N	2025-04-07	11:34	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
168	144	4	\N	2025-04-07	19:15	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
169	145	4	\N	2025-04-07	19:23	Gynaecologist consultation Dr. Divya	Completed	BP: 110/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/80"}
170	146	4	\N	2025-04-07	19:52	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
171	147	4	\N	2025-04-09	19:54	Gynaecologist consultation Dr. Divya	Completed	BP: 90/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "90/60"}
172	148	4	\N	2025-04-09	20:12	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
173	149	4	\N	2025-04-15	20:04	Gynaecologist consultation Dr. Divya	Completed	BP: 90/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "90/70"}
174	150	4	\N	2025-04-16	13:36	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
175	151	4	\N	2025-04-19	19:18	Gynaecologist consultation Dr. Divya	Completed	BP: 100/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/60"}
177	48	4	\N	2025-04-22	20:40	Gynaecologist consultation Dr. Divya	Completed	BP: 100/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/60"}
178	127	4	\N	2025-04-22	20:50	Gynaecologist consultation Dr. Divya	Completed	BP: 90/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "90/60"}
179	153	4	\N	2025-04-22	21:02	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70"}
180	154	4	\N	2025-04-22	21:23	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
181	155	4	\N	2025-04-23	16:50	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70"}
182	156	4	\N	2025-04-23	17:18	Gynaecologist consultation Dr. Divya	Completed	BP: 100/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/80"}
183	11	4	\N	2025-04-23	20:14	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
184	157	4	\N	2025-04-24	18:33	Gynaecologist consultation Dr. Divya	Completed	BP: 100/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/60"}
185	158	4	\N	2025-04-24	20:11	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
186	159	4	\N	2025-04-25	20:43	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
187	160	4	\N	2025-04-26	18:34	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
188	161	4	\N	2025-04-26	19:19	Gynaecologist consultation Dr. Divya	Completed	BP: 100/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/60"}
189	161	4	\N	2025-04-26	19:20	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
190	112	4	\N	2025-04-26	19:40	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
191	162	4	\N	2025-04-26	20:32	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
192	163	4	\N	2025-04-26	20:47	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
193	164	4	\N	2025-04-29	15:22	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "149", "weight": 47.5}
194	165	4	\N	2025-04-29	15:26	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "154", "weight": 62.7}
195	166	4	\N	2025-04-29	15:27	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "163", "weight": 75}
196	167	4	\N	2025-04-30	19:40	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "149", "weight": 43.9}
197	168	4	\N	2025-04-30	20:28	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "142", "weight": 52.5}
198	169	4	\N	2025-05-03	19:35	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "156", "weight": 65.2}
199	170	4	\N	2025-05-03	19:38	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "153", "weight": 48.3}
200	140	4	\N	2025-05-03	20:43	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "162", "weight": 85}
202	164	4	\N	2025-05-08	16:27	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "149", "weight": 47.5}
203	69	4	\N	2025-05-11	19:54	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "159", "weight": 75}
204	166	4	\N	2025-05-11	20:01	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "163", "weight": 75}
205	172	4	\N	2025-05-11	20:04	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "151", "weight": 61}
206	159	4	\N	2025-05-11	20:10	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "149", "weight": 43.6}
207	150	4	\N	2025-05-13	20:35	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "155", "weight": 51}
208	173	4	\N	2025-05-14	20:48	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "152", "weight": 52.2}
209	174	4	\N	2025-05-14	20:59	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "157.5", "weight": 63.2}
210	175	4	\N	2025-05-15	19:46	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "155", "weight": 68}
211	176	4	\N	2025-05-15	20:27	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "151", "weight": 55.9}
212	177	4	\N	2025-05-17	14:36	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "153.5", "weight": 69.9}
213	164	4	\N	2025-05-19	18:40	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "149.5", "weight": 46.3}
214	178	4	\N	2025-05-20	21:04	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "155.5", "weight": 87.4}
215	179	4	\N	2025-05-24	20:30	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "156", "weight": 66}
216	180	4	\N	2025-05-24	20:51	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "156", "weight": 72}
217	112	4	\N	2025-05-26	19:26	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "157", "weight": 69.4}
218	114	4	\N	2025-05-26	20:08	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "158", "weight": 58.9}
219	181	4	\N	2025-05-26	20:23	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "149", "weight": 62.9}
220	182	4	\N	2025-05-28	20:52	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "54.25", "weight": 138.5}
221	183	4	\N	2025-05-28	21:12	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "148", "weight": 42.9}
222	184	4	\N	2025-05-29	20:26	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "161.5", "weight": 68.9}
223	185	4	\N	2025-05-30	18:44	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "156", "weight": 83.6}
224	186	4	\N	2025-05-30	20:13	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "158", "weight": 67}
225	187	4	\N	2025-06-01	18:55	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "150", "weight": 67.2}
226	188	4	\N	2025-06-01	19:31	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "152", "weight": 52}
227	148	4	\N	2025-06-01	19:51	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "152", "weight": 61}
228	189	4	\N	2025-06-01	20:01	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "150", "weight": 68.6}
229	190	4	\N	2025-06-04	14:50	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "155", "weight": 51.7}
230	191	4	\N	2025-06-04	14:53	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "151", "weight": 46.2}
231	192	4	\N	2025-06-05	19:16	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
232	193	4	\N	2025-06-05	19:30	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "156", "weight": 43.2}
233	194	4	\N	2025-06-05	19:36	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "149", "weight": 50}
234	195	4	\N	2025-06-06	17:51	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "152", "weight": 50.6}
235	196	4	\N	2025-06-16	21:11	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "146", "weight": 56}
236	197	4	\N	2025-06-19	19:27	Gynaecologist consultation Dr. Divya	Completed	BP: 110/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/80", "height": "5.1", "weight": 54.7}
237	198	4	\N	2025-06-19	19:39	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "150", "weight": 62.7}
238	199	4	\N	2025-06-20	19:43	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "152", "weight": 52.5}
239	190	4	\N	2025-06-23	20:53	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	PCOS	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "158", "weight": 52.5}
240	200	4	\N	2025-06-25	20:19	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "148", "weight": 40.2}
241	201	4	\N	2025-06-28	19:35	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "156", "weight": 69}
242	202	4	\N	2025-06-28	19:48	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "156", "weight": 58.7}
243	203	4	\N	2025-06-29	21:46	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "00", "weight": 49}
244	204	4	\N	2025-06-30	20:09	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "150", "weight": 62}
245	205	4	\N	2025-06-30	20:33	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "156", "weight": 54}
246	61	4	\N	2025-07-01	18:02	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "156", "weight": 48}
247	206	4	\N	2025-07-01	20:45	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "149", "weight": 38}
248	207	4	\N	2025-07-03	16:00	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "159", "weight": 65.5}
249	164	4	\N	2025-07-03	19:31	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "149", "weight": 47.9}
250	208	4	\N	2025-07-03	20:25	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "152", "weight": 59}
251	209	4	\N	2025-07-04	19:23	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "166", "weight": 71.2}
252	210	4	\N	2025-07-05	20:12	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "146", "weight": 50.2}
253	211	4	\N	2025-07-06	19:23	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "156", "weight": 69}
254	212	4	\N	2025-07-06	20:06	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "9123829842", "weight": 54.4}
255	213	4	\N	2025-07-06	20:10	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "157", "weight": 62}
256	214	4	\N	2025-07-06	20:13	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "156", "weight": 78}
257	215	4	\N	2025-07-10	19:58	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "143", "weight": 54.5}
259	217	4	\N	2025-07-11	19:01	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
260	218	4	\N	2025-07-14	20:35	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "162", "weight": 57}
261	113	4	\N	2025-07-15	20:42	Gynaecologist consultation Dr. Divya	Completed	BP: 115/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/75", "height": "156", "weight": 69}
263	219	4	\N	2025-07-21	17:39	Gynaecologist consultation Dr. Divya	Completed	BP: 150/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "150/90", "height": "151", "weight": 66.4}
264	220	4	\N	2025-07-22	20:13	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "140", "weight": 50}
265	172	4	\N	2025-07-24	19:20	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "156", "weight": 61.3}
266	221	4	\N	2025-07-26	19:50	Gynaecologist consultation Dr. Divya	Completed	BP: 110/65	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/65", "height": "142", "weight": 61}
267	222	4	\N	2025-07-28	20:12	Gynaecologist consultation Dr. Divya	Completed	BP: 120/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/75", "height": "152", "weight": 81}
268	223	4	\N	2025-07-28	20:40	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "153", "weight": 56}
269	224	4	\N	2025-07-28	20:56	Gynaecologist consultation Dr. Divya	Completed	BP: 130/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/90", "height": "160", "weight": 82}
270	225	4	\N	2025-07-28	21:03	Gynaecologist consultation Dr. Divya	Completed	BP: 115/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/70", "height": "162", "weight": 86}
271	226	4	\N	2025-07-29	20:15	Gynaecologist consultation Dr. Divya	Completed	BP: 100/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/80", "height": "153", "weight": 73.3}
272	150	4	\N	2025-07-29	20:17	Gynaecologist consultation Dr. Divya	Completed	BP: 100/85	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/85", "height": "156", "weight": 59.4}
273	227	4	\N	2025-07-31	19:12	Gynaecologist consultation Dr. Divya	Completed	BP: 120/85	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/85", "height": "158", "weight": 41}
274	228	4	\N	2025-08-02	20:07	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "155", "weight": 55.4}
275	229	4	\N	2025-08-06	18:09	Gynaecologist consultation Dr. Divya	Completed	BP: 150/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "150/90", "height": "144", "weight": 46}
276	230	4	\N	2025-08-06	20:32	Gynaecologist consultation Dr. Divya	Completed	BP: 140/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "140/90", "height": "157", "weight": 64.3}
277	231	4	\N	2025-08-08	19:52	Gynaecologist consultation Dr. Divya	Completed	BP: 130/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/90", "height": "154", "weight": 76}
278	112	4	\N	2025-08-09	20:10	Gynaecologist consultation Dr. Divya	Completed	BP: 110/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/75", "height": "153", "weight": 73}
279	232	4	\N	2025-08-14	17:27	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "155", "weight": 40.6}
280	214	4	\N	2025-08-14	18:36	Gynaecologist consultation Dr. Divya	Completed	BP: 125/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "125/90", "height": "154", "weight": 77.4}
258	292	4	\N	2025-07-10	20:40	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "148", "weight": 58}
281	174	4	\N	2025-08-14	19:04	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "157", "weight": 60}
282	233	4	\N	2025-08-15	19:36	Gynaecologist consultation Dr. Divya	Completed	BP: 125/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "125/80", "height": "150", "weight": 61.5}
283	234	4	\N	2025-08-18	19:56	Gynaecologist consultation Dr. Divya	Completed	BP: 130/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/90", "height": "148", "weight": 65.2}
284	230	4	\N	2025-08-21	19:43	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "157", "weight": 62}
285	235	4	\N	2025-08-22	19:23	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "156", "weight": 52}
286	236	4	\N	2025-08-22	19:44	Gynaecologist consultation Dr. Divya	Completed	BP: 120/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/75", "height": "137", "weight": 37.6}
287	133	4	\N	2025-08-22	20:05	Gynaecologist consultation Dr. Divya	Completed	BP: 115/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/70", "height": "151", "weight": 64.7}
288	221	4	\N	2025-08-22	20:22	Gynaecologist consultation Dr. Divya	Completed	BP: 110/65	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/65", "height": "142", "weight": 64.2}
289	237	4	\N	2025-08-22	20:28	Gynaecologist consultation Dr. Divya	Completed	BP: 138/98	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "138/98", "height": "156", "weight": 58.3}
290	138	4	\N	2025-08-22	20:33	Gynaecologist consultation Dr. Divya	Completed	BP: 115/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/75", "height": "147", "weight": 51.7}
291	238	4	\N	2025-08-22	20:41	Gynaecologist consultation Dr. Divya	Completed	BP: 130/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/75", "height": "147", "weight": 61.3}
292	239	4	\N	2025-08-26	20:11	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"height": "5.5", "weight": 55}
293	240	4	\N	2025-08-27	20:25	Gynaecologist consultation Dr. Divya	Completed	BP: 115/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/75", "height": "145", "weight": 55.5}
294	241	4	\N	2025-08-30	20:33	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "156", "weight": 52.9}
295	242	4	\N	2025-09-02	20:28	Gynaecologist consultation Dr. Divya	Completed	BP: 110/65	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/65", "height": "156", "weight": 59.6}
296	243	4	\N	2025-09-02	20:37	Gynaecologist consultation Dr. Divya	Completed	BP: 115/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/75", "height": "148", "weight": 50}
297	150	4	\N	2025-09-04	18:39	Gynaecologist consultation Dr. Divya	Completed	BP: 105/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "105/70", "height": "149", "weight": 67.7}
298	244	4	\N	2025-09-04	18:52	Gynaecologist consultation Dr. Divya	Completed	BP: 105/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "105/60", "height": "148", "weight": 77}
299	206	4	\N	2025-09-04	19:54	Gynaecologist consultation Dr. Divya	Completed	BP: 100/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/60", "height": "147", "weight": 42.7}
300	133	4	\N	2025-09-05	19:26	Gynaecologist consultation Dr. Divya	Completed	BP: 150/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "150/70", "height": "156", "weight": 65}
301	245	4	\N	2025-09-06	19:50	Gynaecologist consultation Dr. Divya	Completed	BP: 100/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/60", "height": "158", "weight": 38.6}
302	246	4	\N	2025-09-06	19:54	Gynaecologist consultation Dr. Divya	Completed	BP: 115/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/70", "height": "160", "weight": 57}
303	247	4	\N	2025-09-07	11:36	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "141", "weight": 52}
304	248	4	\N	2025-09-07	12:43	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "157", "weight": 75}
305	76	4	\N	2025-09-07	19:19	Gynaecologist consultation Dr. Divya	Completed	BP: 140/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "140/80", "height": "156", "weight": 58}
307	125	4	\N	2025-09-10	20:41	Gynaecologist consultation Dr. Divya	Completed	BP: 140/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "140/80", "height": "156", "weight": 58.4}
308	250	4	\N	2025-09-10	20:44	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "147", "weight": 76}
309	150	4	\N	2025-09-11	19:41	Gynaecologist consultation Dr. Divya	Completed	BP: 100/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/60", "height": "158", "weight": 68.6}
310	251	4	\N	2025-09-11	20:09	Gynaecologist consultation Dr. Divya	Completed	BP: 125/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "125/80", "height": "125/80", "weight": 53.9}
311	252	4	\N	2025-09-11	20:21	Gynaecologist consultation Dr. Divya	Completed	BP: Reshma	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "Reshma", "height": "156", "weight": 73}
312	253	4	\N	2025-09-13	15:35	Gynaecologist consultation Dr. Divya	Completed	BP: 125/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "125/80", "height": "150", "weight": 61.8}
313	254	4	\N	2025-09-13	19:37	Gynaecologist consultation Dr. Divya	Completed	BP: 110/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/60", "height": "142", "weight": 42}
314	112	4	\N	2025-09-13	20:24	Gynaecologist consultation Dr. Divya	Completed	BP: 115/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/80", "height": "151", "weight": 75}
315	150	4	\N	2025-09-18	20:18	Gynaecologist consultation Dr. Divya	Completed	BP: 115/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/70", "height": "164", "weight": 68.6}
316	214	4	\N	2025-09-18	20:32	Gynaecologist consultation Dr. Divya	Completed	BP: 115/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/75", "height": "156", "weight": 79}
317	143	4	\N	2025-09-18	20:46	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "158", "weight": 69.9}
318	255	4	\N	2025-09-18	20:59	Gynaecologist consultation Dr. Divya	Completed	BP: 110/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/80", "height": "140", "weight": 54.8}
319	256	4	\N	2025-09-18	21:21	Gynaecologist consultation Dr. Divya	Completed	BP: 13070	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "13070", "height": "144", "weight": 58}
320	109	4	\N	2025-09-19	20:01	Gynaecologist consultation Dr. Divya	Completed	BP: 110/65	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/65", "height": "150", "weight": 52.9}
321	257	4	\N	2025-09-22	20:22	Gynaecologist consultation Dr. Divya	Completed	BP: 130/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/90", "height": "152", "weight": 75.6}
322	258	4	\N	2025-09-23	20:54	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "180", "weight": 80}
323	259	4	\N	2025-09-24	09:53	Gynaecologist consultation Dr. Divya	Completed	BP: 115/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/70", "height": "152", "weight": 68.1}
324	205	4	\N	2025-09-24	09:54	Gynaecologist consultation Dr. Divya	Completed	BP: 115/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/70", "height": "162", "weight": 55}
325	260	4	\N	2025-09-26	11:50	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "151", "weight": 53}
326	240	4	\N	2025-09-26	18:50	Gynaecologist consultation Dr. Divya	Completed	BP: 125/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "125/80", "height": "147", "weight": 57}
327	261	4	\N	2025-10-03	19:45	Gynaecologist consultation Dr. Divya	Completed	BP: 135/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "135/80", "height": "154", "weight": 83.8}
328	261	4	\N	2025-10-03	19:47	Gynaecologist consultation Dr. Divya	Completed	BP: 140/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "140/80", "height": "156", "weight": 75.8}
329	257	4	\N	2025-10-03	20:54	Gynaecologist consultation Dr. Divya	Completed	BP: 130/85	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/85", "height": "152", "weight": 56}
330	262	4	\N	2025-10-03	21:00	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "162", "weight": 49.9}
331	263	4	\N	2025-10-05	19:44	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "146", "weight": 56.8}
332	264	4	\N	2025-10-07	12:14	Gynaecologist consultation Dr. Divya	Completed	BP: 115/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/75", "height": "146", "weight": 54.5}
333	223	4	\N	2025-10-07	12:16	Gynaecologist consultation Dr. Divya	Completed	BP: 110/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/60", "height": "159", "weight": 60.9}
334	265	4	\N	2025-10-09	11:39	Gynaecologist consultation Dr. Divya	Completed	BP: 110/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/80", "height": "152", "weight": 62.9}
336	266	4	\N	2025-10-09	20:14	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "143", "weight": 47}
337	267	4	\N	2025-10-10	11:04	Gynaecologist consultation Dr. Divya	Completed	BP: 1130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "1130/80", "height": "148", "weight": 47.4}
338	268	4	\N	2025-10-10	19:00	Gynaecologist consultation Dr. Divya	Completed	BP: 120/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/75", "height": "147", "weight": 40.7}
339	204	4	\N	2025-10-10	19:49	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "151", "weight": 62.5}
340	269	4	\N	2025-10-11	17:52	Gynaecologist consultation Dr. Divya	Completed	BP: 125/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "125/75", "height": "145", "weight": 53.9}
341	270	4	\N	2025-10-13	20:14	Gynaecologist consultation Dr. Divya	Completed	BP: 130/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/90", "height": "145", "weight": 56}
342	271	4	\N	2025-10-16	17:14	Gynaecologist consultation Dr. Divya	Completed	BP: 120/85	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/85", "height": "154", "weight": 60.1}
343	109	4	\N	2025-10-17	19:52	Gynaecologist consultation Dr. Divya	Completed	BP: 12/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "12/80", "height": "151", "weight": 52}
344	272	4	\N	2025-10-18	19:53	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "153", "weight": 53.7}
345	273	4	\N	2025-10-19	18:09	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "150", "weight": 60.6}
346	131	4	\N	2025-10-22	20:45	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "140", "weight": 46.9}
347	274	4	\N	2025-10-22	21:06	Gynaecologist consultation Dr. Divya	Completed	BP: 130/85	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/85", "height": "149", "weight": 55.1}
348	130	4	\N	2025-10-23	19:23	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "156", "weight": 72}
349	223	4	\N	2025-10-24	19:39	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "158", "weight": 63.3}
350	275	4	\N	2025-10-25	19:37	Gynaecologist consultation Dr. Divya	Completed	BP: 120/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/75", "height": "1142", "weight": 32.8}
351	276	4	\N	2025-10-25	19:59	Gynaecologist consultation Dr. Divya	Completed	BP: 115/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/70", "height": "156", "weight": 62}
352	277	4	\N	2025-11-01	20:05	Gynaecologist consultation Dr. Divya	Completed	BP: 110/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/75", "height": "156", "weight": 52.2}
353	130	4	\N	2025-11-02	09:51	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "150", "weight": 70.1}
354	278	4	\N	2025-11-02	09:52	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "159", "weight": 70.5}
355	279	4	\N	2025-11-06	10:46	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "155", "weight": 71}
356	280	4	\N	2025-11-06	20:06	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "162", "weight": 76.1}
357	281	4	\N	2025-11-07	20:26	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "142", "weight": 38.4}
358	282	4	\N	2025-11-10	16:51	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "153", "weight": 78.2}
359	221	4	\N	2025-11-15	00:00	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "144", "weight": 70.8}
360	283	4	\N	2025-11-15	00:00	Gynaecologist consultation Dr. Divya	Completed	BP: 120/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/75", "height": "155", "weight": 61.6}
362	260	4	\N	2025-11-17	18:42	Gynaecologist consultation Dr. Divya	Completed	BP: 130/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/70", "height": "151", "weight": 55.7}
363	285	4	\N	2025-11-15	00:00	Gynaecologist consultation Dr. Divya	Completed	BP: 140/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "140/90", "height": "157", "weight": 100.7}
364	182	4	\N	2025-11-17	18:47	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "139", "weight": 61.5}
365	286	4	\N	2025-11-17	18:49	Gynaecologist consultation Dr. Divya	Completed	BP: 115/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/80", "height": "145", "weight": 61.9}
366	271	4	\N	2025-11-17	18:58	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "153", "weight": 61.9}
367	267	4	\N	2025-11-17	19:00	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "149", "weight": 50.2}
369	288	4	\N	2025-11-17	19:10	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "160", "weight": 69.5}
370	289	4	\N	2025-11-17	20:44	Gynaecologist consultation Dr. Divya	Completed	BP: 125/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "125/80", "height": "147", "weight": 55}
371	179	4	\N	2025-11-17	21:16	Gynaecologist consultation Dr. Divya	Completed	BP: 150/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "150/80", "height": "156", "weight": 71.9}
372	290	4	\N	2025-11-20	19:10	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "55.1", "weight": 156}
373	209	4	\N	2025-11-22	19:17	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "167", "weight": 70.2}
374	177	4	\N	2025-11-25	11:49	Gynaecologist consultation Dr. Divya	Completed	BP: 100/65	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "100/65", "height": "156", "weight": 60.5}
375	113	4	\N	2025-11-26	20:23	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "157", "weight": 68}
376	291	4	\N	2025-11-28	18:33	Gynaecologist consultation Dr. Divya	Completed	BP: 140/30	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "140/30", "height": "152", "weight": 60.2}
377	292	4	\N	2025-11-29	19:10	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "148", "weight": 61.1}
378	293	4	\N	2025-12-01	19:21	Gynaecologist consultation Dr. Divya	Completed	BP: 140/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "140/90", "height": "148", "weight": 51.6}
379	174	4	\N	2025-12-01	19:36	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "158", "weight": 74}
380	181	4	\N	2025-12-04	17:41	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "149", "weight": 62.9}
381	294	4	\N	2025-12-05	19:34	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "138", "weight": 50.7}
382	143	4	\N	2025-12-05	20:08	Gynaecologist consultation Dr. Divya	Completed	BP: 115/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/70", "height": "160", "weight": 71}
383	230	4	\N	2025-12-06	19:40	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "157", "weight": 60.7}
384	295	4	\N	2025-12-06	20:03	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	PCOS	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "160", "weight": 60}
385	296	4	\N	2025-12-06	20:15	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	PCOS	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "150", "weight": 39.3}
368	109	4	\N	2025-11-14	00:00	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "151", "weight": 52.9}
361	230	4	\N	2025-11-17	18:39	Gynaecologist consultation Dr. Divya	Completed	BP: 115/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/70", "height": "157", "weight": 59.1}
387	298	4	\N	2025-12-10	21:03	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "155", "weight": 51}
388	299	4	\N	2025-12-13	19:13	Gynaecologist consultation Dr. Divya	Completed	BP: 110/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/80", "height": "144", "weight": 74}
389	234	4	\N	2025-12-13	19:31	Gynaecologist consultation Dr. Divya	Completed	BP: 11080	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "11080", "height": "166", "weight": 57}
390	187	4	\N	2025-12-17	20:13	Gynaecologist consultation Dr. Divya	Completed	BP: 140/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "140/90", "height": "150", "weight": 67.2}
391	300	4	\N	2025-12-18	18:17	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "158", "weight": 53}
393	302	4	\N	2025-12-22	19:15	Gynaecologist consultation Dr. Divya	Completed	BP: 110/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/60", "height": "145", "weight": 44}
394	221	4	\N	2025-12-22	20:21	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "144", "weight": 67.2}
395	303	4	\N	2025-12-22	20:42	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "156", "weight": 61}
396	304	4	\N	2025-12-23	11:26	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "156", "weight": 70}
397	305	4	\N	2025-12-23	12:31	Gynaecologist consultation Dr. Divya	Completed	BP: 120/0	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/0", "height": "155", "weight": 80}
398	306	4	\N	2025-12-23	20:20	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "145", "weight": 52.5}
399	307	4	\N	2025-12-24	19:49	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	PCOS	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "153", "weight": 56.6}
400	295	4	\N	2025-12-24	19:54	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "156", "weight": 59}
401	295	4	\N	2025-12-26	19:37	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "156", "weight": 59}
402	182	4	\N	2025-12-26	19:57	Gynaecologist consultation Dr. Divya	Completed	BP: 150	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "150", "height": "144", "weight": 63}
403	308	4	\N	2025-12-31	16:48	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "146", "weight": 59.4}
404	308	4	\N	2025-12-31	17:07	Gynaecologist consultation Dr. Divya	Completed	BP: 130/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/90", "height": "52.7", "weight": 155}
405	309	4	\N	2026-01-02	16:40	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "143", "weight": 42.9}
406	109	4	\N	2026-01-02	16:56	Gynaecologist consultation Dr. Divya	Completed	BP: 95/65	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "95/65", "height": "151", "weight": 58.6}
407	294	4	\N	2026-01-02	17:12	Gynaecologist consultation Dr. Divya	Completed	BP: 110/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "110/70", "height": "138", "weight": 51.6}
408	256	4	\N	2026-01-02	17:37	Gynaecologist consultation Dr. Divya	Completed	BP: 120/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/75", "height": "146", "weight": 66.8}
409	298	4	\N	2026-01-03	17:34	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "155", "weight": 51.1}
411	311	4	\N	2026-01-03	18:31	Gynaecologist consultation Dr. Divya	Completed	BP: 125/75	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "125/75", "height": "159", "weight": 75.1}
412	312	4	\N	2026-01-04	18:55	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "157", "weight": 50.9}
413	313	4	\N	2026-01-06	20:00	Gynaecologist consultation Dr. Divya	Completed	BP: 120/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/90", "height": "159", "weight": 97}
414	314	4	\N	2026-01-06	20:24	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "155", "weight": 71.5}
415	315	4	\N	2026-01-07	19:08	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "165", "weight": 56}
416	316	4	\N	2026-01-07	19:11	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "156", "weight": 73.3}
417	317	4	\N	2026-01-09	10:55	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "156", "weight": 51.7}
418	61	4	\N	2026-01-10	17:05	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "149", "weight": 47.9}
420	319	4	\N	2026-01-24	18:37	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "155", "weight": 66.7}
421	273	4	\N	2026-02-04	11:48	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "151", "weight": 60.2}
419	303	4	\N	2026-01-10	17:45	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "156", "weight": 61}
410	223	4	\N	2026-01-03	17:54	Gynaecologist consultation Dr. Divya	Completed	BP: 130/90	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/90", "height": "159", "weight": 69.3}
422	320	4	\N	2026-02-04	12:01	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "159", "weight": 63.5}
423	321	4	\N	2026-02-04	19:50	Gynaecologist consultation Dr. Divya	Completed	BP: 130/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/80", "height": "153", "weight": 60}
424	306	4	\N	2026-02-05	12:12	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "149", "weight": 51.4}
425	322	4	\N	2026-02-06	12:42	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "151", "weight": 46}
426	143	4	\N	2026-02-06	12:58	Gynaecologist consultation Dr. Divya	Completed	BP: 130/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/70", "height": "158", "weight": 78}
427	198	4	\N	2026-02-07	12:02	Gynaecologist consultation Dr. Divya	Completed	BP: 120/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/70", "height": "156", "weight": 64.9}
428	323	4	\N	2026-02-07	12:12	Gynaecologist consultation Dr. Divya	Completed	BP: 130/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/70", "height": "151", "weight": 66}
429	324	4	\N	2026-02-07	19:44	Gynaecologist consultation Dr. Divya	Completed	BP: 115/60	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/60", "height": "158", "weight": 51.4}
430	240	4	\N	2026-02-09	11:24	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "145", "weight": 60.3}
431	325	4	\N	2026-02-09	11:33	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "146", "weight": 44.5}
432	261	4	\N	2026-02-09	11:40	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "156", "weight": 87.1}
433	256	4	\N	2026-02-09	11:49	Gynaecologist consultation Dr. Divya	Completed	BP: 130/70	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "130/70", "height": "146", "weight": 66.8}
434	327	4	\N	2026-02-09	19:30	Gynaecologist consultation Dr. Divya	Completed	BP: 115/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "115/80", "height": "154", "weight": 62.7}
435	289	4	\N	2025-04-18	00:00	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
436	326	4	\N	2025-04-18	00:00	Gynaecologist consultation Dr. Divya	Completed	\N	\N	\N	Gynaecologist consultation Dr. Divya	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
437	130	4	\N	2025-11-14	00:00	Gynaecologist consultation Dr. Divya	Completed	BP: 120/80	\N	\N	Gynaecologist consultation Dr. Divya	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"bp": "120/80", "height": "150", "weight": 70.1}
\.


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendance (id, employee_name, role, date, clock_in, clock_out, status, hours_worked, notes) FROM stdin;
1	Dr. Priya	clinician	2026-02-13	09:00	18:00	present	9	\N
2	Dr. Ramesh	clinician	2026-02-13	10:00	17:00	present	7	\N
3	Dr. Sai	clinician	2026-02-13	09:30	17:30	present	8	\N
4	Reception Staff	receptionist	2026-02-13	08:30	17:30	present	9	\N
5	Nurse	nurse	2026-02-13	08:00	16:00	present	8	\N
6	Nutritionist	nutritionist	2026-02-13	10:00	16:00	present	6	\N
7	Dr. Priya	clinician	2026-02-12	09:00	18:00	present	9	\N
8	Dr. Ramesh	clinician	2026-02-12	\N	\N	absent	0	\N
9	Dr. Sai	clinician	2026-02-12	09:30	17:30	present	8	\N
10	Reception Staff	receptionist	2026-02-12	08:30	17:30	present	9	\N
11	Nurse	nurse	2026-02-12	08:00	16:00	present	8	\N
12	Nutritionist	nutritionist	2026-02-12	\N	\N	leave	0	\N
13	Dr. Priya	clinician	2026-02-11	09:00	18:00	present	9	\N
14	Dr. Ramesh	clinician	2026-02-11	10:00	17:00	present	7	\N
15	Dr. Sai	clinician	2026-02-11	09:30	17:30	present	8	\N
16	Reception Staff	receptionist	2026-02-11	08:30	17:30	present	9	\N
17	Nurse	nurse	2026-02-11	08:00	16:00	present	8	\N
18	Nutritionist	nutritionist	2026-02-11	10:00	16:00	present	6	\N
19	Dr. Priya	clinician	2026-02-10	09:00	18:00	present	9	\N
20	Dr. Ramesh	clinician	2026-02-10	10:00	17:00	present	7	\N
21	Dr. Sai	clinician	2026-02-10	\N	\N	absent	0	\N
22	Reception Staff	receptionist	2026-02-10	08:30	13:00	half-day	4.5	\N
23	Nurse	nurse	2026-02-10	08:00	16:00	present	8	\N
24	Nutritionist	nutritionist	2026-02-10	10:00	16:00	present	6	\N
25	Dr. Priya	clinician	2026-02-09	09:00	14:00	present	5	\N
26	Dr. Ramesh	clinician	2026-02-09	10:00	14:00	present	4	\N
27	Dr. Sai	clinician	2026-02-09	09:30	14:00	present	4.5	\N
28	Reception Staff	receptionist	2026-02-09	08:30	14:00	present	5.5	\N
29	Nurse	nurse	2026-02-09	08:00	14:00	present	6	\N
30	Nutritionist	nutritionist	2026-02-09	10:00	14:00	present	4	\N
\.


--
-- Data for Name: billing_catalog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.billing_catalog (id, name, category, price, tax_rate, hsn_code, description, is_active) FROM stdin;
1	Initial Consultation	Consultation	800	0	9993	First visit consultation with clinician	t
2	Follow-up Consultation	Consultation	500	0	9993	Subsequent follow-up visit	t
3	Online Consultation	Consultation	600	0	9993	Video/phone consultation	t
4	Prenatal Check-up	Consultation	700	0	9993	Routine antenatal check-up	t
5	Postpartum Check-up	Consultation	600	0	9993	Post-delivery follow-up	t
6	Ultrasound (USG)	Imaging	1500	18	9993	Pelvic/obstetric ultrasound	t
7	NT Scan	Imaging	2500	18	9993	Nuchal translucency scan	t
8	Growth Scan	Imaging	1800	18	9993	Fetal growth scan	t
9	Anomaly Scan	Imaging	3000	18	9993	Detailed anomaly scan (Level 2)	t
10	Dating Scan	Imaging	1500	18	9993	Early pregnancy dating scan	t
11	Complete Blood Count (CBC)	Lab Test	350	5	9993	Full blood count panel	t
12	Thyroid Profile (TSH, T3, T4)	Lab Test	600	5	9993	Thyroid function tests	t
13	Antenatal Profile	Lab Test	2500	5	9993	Complete ANC blood panel	t
14	Dual Marker Test	Lab Test	1800	5	9993	First trimester screening	t
15	OGTT	Lab Test	500	5	9993	Oral glucose tolerance test	t
16	Urine Routine & Culture	Lab Test	450	5	9993	Urine analysis with culture	t
17	Pap Smear	Lab Test	800	5	9993	Cervical cancer screening	t
18	FSH & LH	Lab Test	700	5	9993	Fertility hormone panel	t
19	Anti CCP	Lab Test	1200	5	9993	Rheumatoid arthritis marker	t
20	Prolactin	Lab Test	400	5	9993	Prolactin level test	t
21	Nutritional Counseling	Wellness	1000	18	9993	Diet and nutrition session	t
22	Lifestyle Program (Monthly)	Wellness	3500	18	9993	Monthly wellness program	t
23	Weight Loss Program	Wellness	2500	18	9993	Structured weight management	t
24	Prenatal Yoga Session	Wellness	500	18	9993	Per session prenatal yoga	t
25	Psychological Counseling	Wellness	1200	18	9993	Mental health session	t
26	MTP Procedure	Procedure	5000	0	9993	Medical termination of pregnancy	t
27	IUD Insertion	Procedure	2000	0	9993	Intrauterine device placement	t
28	HPV Vaccination	Procedure	4000	5	9993	Per dose HPV vaccine	t
29	Iron Therapy (IV)	Procedure	1500	5	9993	Intravenous iron infusion	t
30	Depot Injection	Procedure	300	5	9993	Hormonal depot injection	t
\.


--
-- Data for Name: clinical_notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clinical_notes (id, patient_id, provider_id, date, type, title, content, tags, is_private) FROM stdin;
1	3	\N	2026-02-14	Prescription Upload	Test Rx	Test content	\N	\N
2	165	\N	2026-02-14	Prescription Upload	Prescription - Dr. Sai Dibyadarshini Bhuyan	Prescribed by: Dr. Sai Dibyadarshini Bhuyan\nDiagnosis: Unable to conceive, Known case of hypothyroidism\nNotes: Patient Age: 34, Sex: F, Weight: 62.7 kg.\nChief Complaint: Unable to conceive, trying since Dec 2023, married since Jan 2016, was on barrier contraception.\nMedical History: MH- 06/03/25, spotting 21st April, UPT negative 3 days ago.\nInvestigations:\n- 24/8/24: Sr. AmH = 13023, TSH = 2.510.\n- 29/3: HPLC-wmm\n- 6/9/24: HSG- TSC=120, M = 70%, Progressive = 50%.\nRecommended Investigations: USG LA + pelvis T & B/L ovarian volume.\nOn Examination (O/E): It CIAC, Duly well.\nInstructions: Just continue with exercise/diet. To see on Thursday evening.\nDoctor's signature: Dibya.\nClinic Appointments/Emergency contact: +91 81003 91119.	\N	\N
3	165	\N	2026-02-14	Prescription Upload	Prescription - Dr. Sai Dibyadarshini Bhuyan	Prescribed by: Dr. Sai Dibyadarshini Bhuyan\nChief Complaint: Unable to conceive, trying since 2023 Dec. Married since 2016 Jan. Was on barrier contraception.\nDiagnosis: Hypothyroid (known case)\nExamination: O/E: P/V CRAC (Per Vaginal Cervix Regular Anterior Closed). Patient doing well.\nMedications: Thyronorm, Tab Folvit / Macfolate\nInvestigations: UPT = negative (2025-04-25); Sr. AMH = 1.30 (2024-08-24); TSH = 2.510 (2024-08-24); HPLC = wm (within limits) (2024-03-29); HSG; Semen Analysis (TSC) = 120 (2024-09-06); Semen Analysis (Motility) = 70% (2024-09-06); Semen Analysis (Progressive Motility) = 50% (2024-09-06); USG VA transpelvic = ET & B/L ovarian volume\nAdvice: Just continue with exercise/diet.\nFollow-up: To see on Thursday evening.\nNotes: LMP: 2025-03-06. Spotting: 2025-04-21.\nPatient Age: 34, Sex: F, Weight: 62.7 Kg.\nEmergency/Appointment Contact: +91 81003 91119.	\N	\N
4	165	\N	2026-02-14	Prescription Upload	Prescription - Dr. Sai Dibyadarshini Bhuyan	Prescribed by: Dr. Sai Dibyadarshini Bhuyan\nChief Complaint: Unable to conceive, trying since 2023 Dec. Married since 2016 Jan. Was on barrier contraception. MH: 06/03/25. Spotting -> 21st April. UPT negative 3 days ago.\nDiagnosis: K/H/O hypothyroid c/n\nExamination: O/E: It CIAC, Doing well.\nMedications: Thyronorm, T. Folvit/macfolate\nInvestigations: Sr. AmH = 1.3023 (2024-08-24); TSH = 2.510 (2024-08-24); HPLC = wm (2025-03-29); HSG (2024-09-06); Semen Analysis Parameters = TSC=120, Motility=70%, Progressive=50% (2024-09-06); USG I/A Pelvis\nAdvice: Just Continue with exercise / Diet\nFollow-up: To see on Thursday evening.\nNotes: Age: 34, Sex: F, Wt: 62.7 Kg, Ht: Not specified	\N	\N
5	165	\N	2025-04-28	Prescription Upload	Prescription - Dr. Sai Dibyadarshini Bhuyan	Prescribed by: Dr. Sai Dibyadarshini Bhuyan\nChief Complaint: Unable to conceive, trying since December 2023. Married since January 2016. Was on barrier contraception. LMP: 2025-03-06. Spotting from April 21st.\nDiagnosis: K/C/O Hypothyroidism\nExamination: O/E: Clinically well (interpreted from 'It CIAC Diey well')\nMedications: Thyronorm, T. Folvit / Macfolate\nInvestigations: UPT = negative (3 days ago); Sr. AMH = 1.30 ng/mL (interpreted from 1.30.23) (2024-08-24); TSH = 2.510; HPLC (29/3); HSG (2024-09-06); Semen Analysis = TSC=120, Motility (M)=70%, Progressive=50% (2024-09-06)\nAdvice: Just continue with exercise/diet\nFollow-up: To see on Thursday evening\nNotes: Dr. Sai Dibyadarshini Bhuyan MBBS | DGO (Gold Medalist) | DNB (OBS & GYN) | Reg. No.: 29007 99285 (WBMC). SAIVIE Complete women care. Age: 34, Sex: F. Wt: 62.7M, Ht: (not specified).	\N	\N
6	165	\N	2025-12-08	Prescription Upload	Prescription - Dlage	Prescribed by: Dlage\nExamination: LMP = 27 | 11/25 (Last Menstrual Period: November 25th, cycle Day 27)\nMedications: T. Letrozole, T. Folvit, Macfolate, Inj HUCOG, T. Duphaston\nInvestigations: FSH = 7.014 (2025-12-08); LH = 5.93 (2025-12-08); AMH = 5.050 (2025-12-08); TSH = 1.005 (2025-12-08); FT4 = 1.12 (2025-12-08); HSG = left cornual block, Right tube patent & Spillage of Contrast into Peritoneal cavity (2025-12-08); Semen Analysis (HSA) = TSC = 120 million/m, Normal Forms = 70%, Rapid Progression = 50, Total motile = 75, Vitality = 75 (2024-09-06); Folliculometry (D10, D12/D14)\nAdvice: Nutritional Counselling; Exercise/Yoga/Swimming; To lose 5 kg in next 2 months (at least); Folliculometry on Day 10, Day 12/Day 14; If Dominant Follicle > 18 mm, Inj HUCOG 10,000 IU IM single dose\nFollow-up: To Review & repeat tests\nNotes: Doctor's initial/signature at bottom right is 'Dhm' or 'Dhn'.	\N	\N
7	11	\N	2026-01-21	USG/Scan Upload	USG/Scan - USG-FOLLICULARMETRY (Dr. Sayantan Roy)	Sonologist: Dr. Sayantan Roy\nScan Type: USG-FOLLICULARMETRY\nEndometrial Thickness: 8.1 mm\nFindings:\n  Uterus: Anteverted & normal in size with normal outline and echotexture. The endometrium is central and normal. The uterine cavity is empty. No focal myometrial SOL is seen. (8.0 x 3.3 x 4.3 cm) [Normal]\n  Endometrium: Central and normal. [Normal]\n  Cervix: Normal (2.7 cm). (2.7 cm) [Normal]\n  Cervix (Nabothian Cyst): A nabothian cyst seen in cervix. (9.6 x 7.0 mm) [Abnormal]\n  Ovaries (General): Both ovaries are bulky in size. Both ovaries show peripherally arranged follicles and echogenic stroma. [Abnormal]\n  Right Ovary: Size: 3.3 x 2.5 x 2.3 cm. Volume: 15 cc. (3.3 x 2.5 x 2.3 cm (Volume: 15 cc)) [Notable]\n  Left Ovary: Size: 3.3 x 2.7 x 3.7 cm. Volume: 17 cc. (3.3 x 2.7 x 3.7 cm (Volume: 17 cc)) [Notable]\nFollicles:\n  Right: 17 x 13 mm\n  Left: \nNotes: LMP: 09.01.2026. **Report relates to the sample received by the laboratory. **The results are strictly laboratory analysis result. Please correlate clinically. *** End Of Report ***	\N	\N
8	165	\N	2026-02-14	USG/Scan Upload	USG/Scan [Date to be confirmed]	⚠ Date to be confirmed\nNotes: Could not parse structured data from the document.	\N	\N
\.


--
-- Data for Name: consent_forms; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.consent_forms (id, patient_id, form_type, signed_date, signed_via, status, expiry_date, notes) FROM stdin;
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.conversations (id, title, created_at) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documents (id, patient_id, name, type, category, date, uploaded_by, description, metadata) FROM stdin;
1	309	TestReport_DHRITI MONI SHARMA_60191300002_82b1aac9-78de-4aad-b6a4-3ee2121db68f.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for DHRITI MONI SHARMA imported from Google Drive	{"fileSize": "2333080", "importedAt": "2026-02-09T19:24:27.649Z", "driveFileId": "1vkdE8uHZ6vTItK4qAdggLfGiWP4b5Mr_", "driveViewUrl": "https://drive.google.com/file/d/1vkdE8uHZ6vTItK4qAdggLfGiWP4b5Mr_/view", "originalFilename": "TestReport_DHRITI MONI SHARMA_60191300002_82b1aac9-78de-4aad-b6a4-3ee2121db68f.pdf", "extractedPatientName": "DHRITI MONI SHARMA"}
2	309	TestReport_DHRITI MONI SHARMA_60191300002_9804ed28-a6eb-490f-9b27-f834920485e5.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for DHRITI MONI SHARMA imported from Google Drive	{"fileSize": "1878102", "importedAt": "2026-02-09T19:24:28.088Z", "driveFileId": "14BwLFqvFf2qQROw_0lA31GisnxYgs05t", "driveViewUrl": "https://drive.google.com/file/d/14BwLFqvFf2qQROw_0lA31GisnxYgs05t/view", "originalFilename": "TestReport_DHRITI MONI SHARMA_60191300002_9804ed28-a6eb-490f-9b27-f834920485e5.pdf", "extractedPatientName": "DHRITI MONI SHARMA"}
3	317	TestReport_KARIMA KHATUN_60191300005_f0b1dee9-bd17-4b21-b580-86781d66cb7e.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for KARIMA KHATUN imported from Google Drive	{"fileSize": "1600923", "importedAt": "2026-02-09T19:24:28.113Z", "driveFileId": "1_HWSIrLE_LdG2A0qRxAvcd9ZADcoQOca", "driveViewUrl": "https://drive.google.com/file/d/1_HWSIrLE_LdG2A0qRxAvcd9ZADcoQOca/view", "originalFilename": "TestReport_KARIMA KHATUN_60191300005_f0b1dee9-bd17-4b21-b580-86781d66cb7e.pdf", "extractedPatientName": "KARIMA KHATUN"}
4	317	TestReport_KARIMA KHATUN_60191300005_7641a13d-631f-4fa9-bc6b-c85436c541c6.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for KARIMA KHATUN imported from Google Drive	{"fileSize": "1297553", "importedAt": "2026-02-09T19:24:28.119Z", "driveFileId": "1WtnCKH3ZxR0kUHm06-g66sN5FBhPi4Ae", "driveViewUrl": "https://drive.google.com/file/d/1WtnCKH3ZxR0kUHm06-g66sN5FBhPi4Ae/view", "originalFilename": "TestReport_KARIMA KHATUN_60191300005_7641a13d-631f-4fa9-bc6b-c85436c541c6.pdf", "extractedPatientName": "KARIMA KHATUN"}
7	48	TestReport_RICHA KUMARI_60191300006_af8e5d3b-e160-4e22-b301-90344cab00f2.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for RICHA KUMARI imported from Google Drive	{"fileSize": "1488898", "importedAt": "2026-02-09T19:24:28.133Z", "driveFileId": "1U-TmMIg_W6Sn_SD25VX70oX38EoQQbQH", "driveViewUrl": "https://drive.google.com/file/d/1U-TmMIg_W6Sn_SD25VX70oX38EoQQbQH/view", "originalFilename": "TestReport_RICHA KUMARI_60191300006_af8e5d3b-e160-4e22-b301-90344cab00f2.pdf", "extractedPatientName": "RICHA KUMARI"}
8	48	TestReport_RICHA KUMARI_60191300006_5fe71cc2-e0b6-494c-b512-d7fa49a89ba0.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for RICHA KUMARI imported from Google Drive	{"fileSize": "1185684", "importedAt": "2026-02-09T19:24:28.137Z", "driveFileId": "151y5D8mLXIzEOcmZGDNtkHnBUUG5YgKV", "driveViewUrl": "https://drive.google.com/file/d/151y5D8mLXIzEOcmZGDNtkHnBUUG5YgKV/view", "originalFilename": "TestReport_RICHA KUMARI_60191300006_5fe71cc2-e0b6-494c-b512-d7fa49a89ba0.pdf", "extractedPatientName": "RICHA KUMARI"}
9	289	TestReport_SATHI MONDAL_60191300007_3f600a5b-c6f3-430f-9504-a208d97ea3bb.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for SATHI MONDAL imported from Google Drive	{"fileSize": "341127", "importedAt": "2026-02-09T19:24:28.144Z", "driveFileId": "13MAvBEiJtBf8iigXCYjbcS74-4JrIn2G", "driveViewUrl": "https://drive.google.com/file/d/13MAvBEiJtBf8iigXCYjbcS74-4JrIn2G/view", "originalFilename": "TestReport_SATHI MONDAL_60191300007_3f600a5b-c6f3-430f-9504-a208d97ea3bb.pdf", "extractedPatientName": "SATHI MONDAL"}
10	289	TestReport_SATHI MONDAL_60191300007_906e887c-73b6-45b9-b0a9-05913359713a.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for SATHI MONDAL imported from Google Drive	{"fileSize": "341127", "importedAt": "2026-02-09T19:24:28.149Z", "driveFileId": "17Bh6kph_eLfZ2H4V1iJgIx0q94hW5KUa", "driveViewUrl": "https://drive.google.com/file/d/17Bh6kph_eLfZ2H4V1iJgIx0q94hW5KUa/view", "originalFilename": "TestReport_SATHI MONDAL_60191300007_906e887c-73b6-45b9-b0a9-05913359713a.pdf", "extractedPatientName": "SATHI MONDAL"}
11	249	TestReport_TAPOTI MONDAL_60191300011_250786aa-6d30-49da-b985-27dc1c920f3f.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for TAPOTI MONDAL imported from Google Drive	{"fileSize": "719421", "importedAt": "2026-02-09T19:24:28.362Z", "driveFileId": "1ql0CXXe4fJGr9r8wcPMlmTCR2eWnnpC_", "driveViewUrl": "https://drive.google.com/file/d/1ql0CXXe4fJGr9r8wcPMlmTCR2eWnnpC_/view", "originalFilename": "TestReport_TAPOTI MONDAL_60191300011_250786aa-6d30-49da-b985-27dc1c920f3f.pdf", "extractedPatientName": "TAPOTI MONDAL"}
12	249	TestReport_TAPOTI MONDAL_60191300011_62c117d3-f223-4177-94ea-3676d1e50eee.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for TAPOTI MONDAL imported from Google Drive	{"fileSize": "567815", "importedAt": "2026-02-09T19:24:28.367Z", "driveFileId": "1r8oPi7rr4h68UQYC86s78yDs9GRMQFw0", "driveViewUrl": "https://drive.google.com/file/d/1r8oPi7rr4h68UQYC86s78yDs9GRMQFw0/view", "originalFilename": "TestReport_TAPOTI MONDAL_60191300011_62c117d3-f223-4177-94ea-3676d1e50eee.pdf", "extractedPatientName": "TAPOTI MONDAL"}
13	306	TestReport_AYANKITA NASKAR_60191300010_45dbd639-66cb-408a-8c19-0d111042e114.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for AYANKITA NASKAR imported from Google Drive	{"fileSize": "9851704", "importedAt": "2026-02-09T19:24:28.371Z", "driveFileId": "1Cn_OLM60RfVEheA9sQOb1oHZYUWiUmwe", "driveViewUrl": "https://drive.google.com/file/d/1Cn_OLM60RfVEheA9sQOb1oHZYUWiUmwe/view", "originalFilename": "TestReport_AYANKITA NASKAR_60191300010_45dbd639-66cb-408a-8c19-0d111042e114.pdf", "extractedPatientName": "AYANKITA NASKAR"}
14	306	TestReport_AYANKITA NASKAR_60191300010_9de6fccc-4e98-4c0d-947e-3bd4fc6cfb80.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for AYANKITA NASKAR imported from Google Drive	{"fileSize": "7728576", "importedAt": "2026-02-09T19:24:28.374Z", "driveFileId": "1wJz3XEGmNZAMSzi4RV7qVjX_9SqcWYQ6", "driveViewUrl": "https://drive.google.com/file/d/1wJz3XEGmNZAMSzi4RV7qVjX_9SqcWYQ6/view", "originalFilename": "TestReport_AYANKITA NASKAR_60191300010_9de6fccc-4e98-4c0d-947e-3bd4fc6cfb80.pdf", "extractedPatientName": "AYANKITA NASKAR"}
15	294	TestReport_SOMA DOLUI_60291300002_69984eaa-509c-4f4c-8122-7dc8d46650a9.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for SOMA DOLUI imported from Google Drive	{"fileSize": "261826", "importedAt": "2026-02-09T19:24:28.379Z", "driveFileId": "18gbTAwRggakoKIIXFWreERrOEjcrv_k6", "driveViewUrl": "https://drive.google.com/file/d/18gbTAwRggakoKIIXFWreERrOEjcrv_k6/view", "originalFilename": "TestReport_SOMA DOLUI_60291300002_69984eaa-509c-4f4c-8122-7dc8d46650a9.pdf", "extractedPatientName": "SOMA DOLUI"}
16	294	TestReport_SOMA DOLUI_60291300002_199c6947-88e8-47d0-a8ac-f63da2346945.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for SOMA DOLUI imported from Google Drive	{"fileSize": "261826", "importedAt": "2026-02-09T19:24:28.382Z", "driveFileId": "1NmwYVi_yZUacXf9bDgcYtDxrGEqmRIDJ", "driveViewUrl": "https://drive.google.com/file/d/1NmwYVi_yZUacXf9bDgcYtDxrGEqmRIDJ/view", "originalFilename": "TestReport_SOMA DOLUI_60291300002_199c6947-88e8-47d0-a8ac-f63da2346945.pdf", "extractedPatientName": "SOMA DOLUI"}
5	314	TestReport_ANJALI KUMARI_60191300004_6207ddec-08dd-4ea9-b739-f527ad5533a3.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for ANJALI KUMARI imported from Google Drive	{"fileSize": "2486540", "importedAt": "2026-02-09T19:24:28.123Z", "driveFileId": "1X_tOJhxn2t0oOtpqMyVj0R8ClEpRfhDc", "driveViewUrl": "https://drive.google.com/file/d/1X_tOJhxn2t0oOtpqMyVj0R8ClEpRfhDc/view", "originalFilename": "TestReport_ANJALI KUMARI_60191300004_6207ddec-08dd-4ea9-b739-f527ad5533a3.pdf", "extractedPatientName": "ANJALI KUMARI"}
6	314	TestReport_ANJALI KUMARI_60191300004_0d558e1c-f436-4e8b-9a7d-276618592593.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for ANJALI KUMARI imported from Google Drive	{"fileSize": "1879999", "importedAt": "2026-02-09T19:24:28.128Z", "driveFileId": "1wvMrz6PRFi2_RZaxoyUohfBxjV3aXT50", "driveViewUrl": "https://drive.google.com/file/d/1wvMrz6PRFi2_RZaxoyUohfBxjV3aXT50/view", "originalFilename": "TestReport_ANJALI KUMARI_60191300004_0d558e1c-f436-4e8b-9a7d-276618592593.pdf", "extractedPatientName": "ANJALI KUMARI"}
17	314	TestReport_ANJALI KUMARI_60291300003_4d47377d-8cd7-4165-8f09-b941b167583a.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for ANJALI KUMARI imported from Google Drive	{"fileSize": "252138", "importedAt": "2026-02-09T19:24:28.389Z", "driveFileId": "1Qn8phupkMOefQ_469PqwRWcZyitOK1pG", "driveViewUrl": "https://drive.google.com/file/d/1Qn8phupkMOefQ_469PqwRWcZyitOK1pG/view", "originalFilename": "TestReport_ANJALI KUMARI_60291300003_4d47377d-8cd7-4165-8f09-b941b167583a.pdf", "extractedPatientName": "ANJALI KUMARI"}
18	314	TestReport_ANJALI KUMARI_60291300003_fdc78f93-b076-46c9-bb08-7d333141e055.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for ANJALI KUMARI imported from Google Drive	{"fileSize": "252138", "importedAt": "2026-02-09T19:24:28.393Z", "driveFileId": "1blhwolFxfNGeDa2ktSCQ31Cz_VnyvwU6", "driveViewUrl": "https://drive.google.com/file/d/1blhwolFxfNGeDa2ktSCQ31Cz_VnyvwU6/view", "originalFilename": "TestReport_ANJALI KUMARI_60291300003_fdc78f93-b076-46c9-bb08-7d333141e055.pdf", "extractedPatientName": "ANJALI KUMARI"}
19	223	TestReport_NURJAHAN BIBI_60291300005_8440ecec-57af-494f-9f9a-5a708d8fd124.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for NURJAHAN BIBI imported from Google Drive	{"fileSize": "4581244", "importedAt": "2026-02-09T19:36:11.281Z", "driveFileId": "1n_RaiaA_qGLen4B3xDa8hx4z2VN7DjeU", "driveViewUrl": "https://drive.google.com/file/d/1n_RaiaA_qGLen4B3xDa8hx4z2VN7DjeU/view", "originalFilename": "TestReport_NURJAHAN BIBI_60291300005_8440ecec-57af-494f-9f9a-5a708d8fd124.pdf", "extractedPatientName": "NURJAHAN BIBI"}
20	223	TestReport_NURJAHAN BIBI_60291300005_7fb07a31-97a5-4e00-8a16-787d3feac7b2.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for NURJAHAN BIBI imported from Google Drive	{"fileSize": "3671411", "importedAt": "2026-02-09T19:36:11.320Z", "driveFileId": "1BtW4W8wM-rK8mkZQyS4TAcsOBHv4SZRT", "driveViewUrl": "https://drive.google.com/file/d/1BtW4W8wM-rK8mkZQyS4TAcsOBHv4SZRT/view", "originalFilename": "TestReport_NURJAHAN BIBI_60291300005_7fb07a31-97a5-4e00-8a16-787d3feac7b2.pdf", "extractedPatientName": "NURJAHAN BIBI"}
21	223	TestReport_NURJAHAN BIBI_60291300006_f3ecf290-efe1-4ac7-bc06-da38fdeadfdc.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for NURJAHAN BIBI imported from Google Drive	{"fileSize": "1569693", "importedAt": "2026-02-09T19:36:11.334Z", "driveFileId": "1Bzj6GXH_80CPk0-5jviCibs6hys2y6KJ", "driveViewUrl": "https://drive.google.com/file/d/1Bzj6GXH_80CPk0-5jviCibs6hys2y6KJ/view", "originalFilename": "TestReport_NURJAHAN BIBI_60291300006_f3ecf290-efe1-4ac7-bc06-da38fdeadfdc.pdf", "extractedPatientName": "NURJAHAN BIBI"}
22	223	TestReport_NURJAHAN BIBI_60291300006_0cb08020-3cbc-41f3-9a2a-97f3b913b592.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for NURJAHAN BIBI imported from Google Drive	{"fileSize": "1266324", "importedAt": "2026-02-09T19:36:11.341Z", "driveFileId": "1KIewyKPHXx7XTJTw7g0eeFroJpWYoDNo", "driveViewUrl": "https://drive.google.com/file/d/1KIewyKPHXx7XTJTw7g0eeFroJpWYoDNo/view", "originalFilename": "TestReport_NURJAHAN BIBI_60291300006_0cb08020-3cbc-41f3-9a2a-97f3b913b592.pdf", "extractedPatientName": "NURJAHAN BIBI"}
23	328	TestReport_S BHULAXMI_60291300004_6e3da960-8f38-47d0-95db-5cab931c74ab.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for S BHULAXMI imported from Google Drive	{"fileSize": "1495709", "importedAt": "2026-02-09T19:37:16.021Z", "driveFileId": "14j8_1QshjYbOuHVPwuTDp1S9kWU1ftG7", "driveViewUrl": "https://drive.google.com/file/d/14j8_1QshjYbOuHVPwuTDp1S9kWU1ftG7/view", "originalFilename": "TestReport_S BHULAXMI_60291300004_6e3da960-8f38-47d0-95db-5cab931c74ab.pdf", "extractedPatientName": "S BHULAXMI"}
24	328	TestReport_S BHULAXMI_60291300004_56cdb108-3aa6-4fa8-a910-4da53be7e42c.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for S BHULAXMI imported from Google Drive	{"fileSize": "1192495", "importedAt": "2026-02-09T19:37:16.026Z", "driveFileId": "15SeckfF4spp0uJScBDyj0kKlth1NRCed", "driveViewUrl": "https://drive.google.com/file/d/15SeckfF4spp0uJScBDyj0kKlth1NRCed/view", "originalFilename": "TestReport_S BHULAXMI_60291300004_56cdb108-3aa6-4fa8-a910-4da53be7e42c.pdf", "extractedPatientName": "S BHULAXMI"}
25	11	WhatsApp Image 2026-02-10 at 10.41.17.jpeg	prescription	Prescription	2026-02-10	\N	Prescription uploaded for patient	{"fileSize": "127980", "uploadedAt": "2026-02-10T05:18:09.681Z", "originalFilename": "WhatsApp Image 2026-02-10 at 10.41.17.jpeg"}
26	11	WhatsApp Image 2026-02-10 at 10.41.17.jpeg	prescription	Prescription	2026-02-10	\N	Prescription uploaded for patient	{"fileSize": "127980", "uploadedAt": "2026-02-10T05:18:23.141Z", "originalFilename": "WhatsApp Image 2026-02-10 at 10.41.17.jpeg"}
27	11	WhatsApp Image 2026-02-10 at 10.41.17.jpeg	prescription	Prescription	2026-02-10	\N	AI-extracted prescription: 4 medication(s) found	{"uploadedAt": "2026-02-10T05:22:06.067Z", "extractedMeds": 4, "skippedDuplicates": 0}
28	314	WhatsApp Image 2026-02-10 at 10.41.17.jpeg	prescription	Prescription	2026-02-10	\N	AI-extracted prescription: 4 medication(s) found	{"uploadedAt": "2026-02-10T05:56:57.477Z", "extractedMeds": 4, "skippedDuplicates": 0}
29	339	TestReport_DR SAI DIBYADARSHINI BHUYAN_51291300001_ed52a2b9-2027-4642-aa48-b5957fa8315b.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for DR SAI DIBYADARSHINI BHUYAN imported from Google Drive	{"fileSize": "6059619", "importedAt": "2026-02-10T09:50:12.652Z", "driveFileId": "1A_6zh_du56K8z8vFJ2ISa505Ze0gPvZe", "driveViewUrl": "https://drive.google.com/file/d/1A_6zh_du56K8z8vFJ2ISa505Ze0gPvZe/view", "originalFilename": "TestReport_DR SAI DIBYADARSHINI BHUYAN_51291300001_ed52a2b9-2027-4642-aa48-b5957fa8315b.pdf", "extractedPatientName": "DR SAI DIBYADARSHINI BHUYAN"}
30	339	TestReport_DR SAI DIBYADARSHINI BHUYAN_51291300001_ab1d0d65-f595-4cb4-a49b-c68a686b442f.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for DR SAI DIBYADARSHINI BHUYAN imported from Google Drive	{"fileSize": "4846578", "importedAt": "2026-02-10T09:50:12.660Z", "driveFileId": "1yyaRwI1LRKWEVa3Zlad7gVvQFry7vkwm", "driveViewUrl": "https://drive.google.com/file/d/1yyaRwI1LRKWEVa3Zlad7gVvQFry7vkwm/view", "originalFilename": "TestReport_DR SAI DIBYADARSHINI BHUYAN_51291300001_ab1d0d65-f595-4cb4-a49b-c68a686b442f.pdf", "extractedPatientName": "DR SAI DIBYADARSHINI BHUYAN"}
31	340	TestReport_SHIVANI SARMA_60191300003_b95204d2-f9ac-4595-81ff-03612cf07793.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for SHIVANI SARMA imported from Google Drive	{"fileSize": "868942", "importedAt": "2026-02-10T09:50:12.663Z", "driveFileId": "1i2BLYnPpLAPn7753vmyDqJEyNmRF_tum", "driveViewUrl": "https://drive.google.com/file/d/1i2BLYnPpLAPn7753vmyDqJEyNmRF_tum/view", "originalFilename": "TestReport_SHIVANI SARMA_60191300003_b95204d2-f9ac-4595-81ff-03612cf07793.pdf", "extractedPatientName": "SHIVANI SARMA"}
32	340	TestReport_SHIVANI SARMA_60191300003_9598aaa8-af8d-4c02-9b91-8749eaf6cbbd.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for SHIVANI SARMA imported from Google Drive	{"fileSize": "717178", "importedAt": "2026-02-10T09:50:12.667Z", "driveFileId": "1BUWZ7kpmdpf-dZV2Ob4QctGGT6ThiCg-", "driveViewUrl": "https://drive.google.com/file/d/1BUWZ7kpmdpf-dZV2Ob4QctGGT6ThiCg-/view", "originalFilename": "TestReport_SHIVANI SARMA_60191300003_9598aaa8-af8d-4c02-9b91-8749eaf6cbbd.pdf", "extractedPatientName": "SHIVANI SARMA"}
33	341	TestReport_ARPITA NASKAR_60191300008_c155ebbc-8287-40b8-931b-d961ffe5b681.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for ARPITA NASKAR imported from Google Drive	{"fileSize": "9019623", "importedAt": "2026-02-10T09:50:12.671Z", "driveFileId": "1KoFaoqKx3nB7yg32VdQY9AYKqQHk-dH8", "driveViewUrl": "https://drive.google.com/file/d/1KoFaoqKx3nB7yg32VdQY9AYKqQHk-dH8/view", "originalFilename": "TestReport_ARPITA NASKAR_60191300008_c155ebbc-8287-40b8-931b-d961ffe5b681.pdf", "extractedPatientName": "ARPITA NASKAR"}
34	341	TestReport_ARPITA NASKAR_60191300008_c1f9f8e6-09d0-42dd-8eef-df61b5f6a6a9.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for ARPITA NASKAR imported from Google Drive	{"fileSize": "7048106", "importedAt": "2026-02-10T09:50:12.675Z", "driveFileId": "1XyezEAlR6ub6G0VVoHzNCz44VwWHiJeZ", "driveViewUrl": "https://drive.google.com/file/d/1XyezEAlR6ub6G0VVoHzNCz44VwWHiJeZ/view", "originalFilename": "TestReport_ARPITA NASKAR_60191300008_c1f9f8e6-09d0-42dd-8eef-df61b5f6a6a9.pdf", "extractedPatientName": "ARPITA NASKAR"}
35	342	TestReport_TAPALI MONDAL_60191300009_dc41d805-852f-4a17-a2fe-fd3c552b8e8e.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for TAPALI MONDAL imported from Google Drive	{"fileSize": "3130225", "importedAt": "2026-02-10T09:50:12.680Z", "driveFileId": "1bOJL1AsMV69TgBcMOZVM45NSrXkpLoXb", "driveViewUrl": "https://drive.google.com/file/d/1bOJL1AsMV69TgBcMOZVM45NSrXkpLoXb/view", "originalFilename": "TestReport_TAPALI MONDAL_60191300009_dc41d805-852f-4a17-a2fe-fd3c552b8e8e.pdf", "extractedPatientName": "TAPALI MONDAL"}
36	342	TestReport_TAPALI MONDAL_60191300009_680a2c98-389e-4566-9db2-82e29a943ed5.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for TAPALI MONDAL imported from Google Drive	{"fileSize": "2523461", "importedAt": "2026-02-10T09:50:12.684Z", "driveFileId": "1gpp9RESpM8hFA-ckF1s2DjmcjhnnKsoa", "driveViewUrl": "https://drive.google.com/file/d/1gpp9RESpM8hFA-ckF1s2DjmcjhnnKsoa/view", "originalFilename": "TestReport_TAPALI MONDAL_60191300009_680a2c98-389e-4566-9db2-82e29a943ed5.pdf", "extractedPatientName": "TAPALI MONDAL"}
37	343	TestReport_MUNMUN MONDAL_60191300012_06fc095d-9c8a-4fd4-945f-ef1a9279df19.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for MUNMUN MONDAL imported from Google Drive	{"fileSize": "720518", "importedAt": "2026-02-10T09:50:12.689Z", "driveFileId": "1n8zTU9FzUy8CmEs-EJ1Bc2om5E4H3gXC", "driveViewUrl": "https://drive.google.com/file/d/1n8zTU9FzUy8CmEs-EJ1Bc2om5E4H3gXC/view", "originalFilename": "TestReport_MUNMUN MONDAL_60191300012_06fc095d-9c8a-4fd4-945f-ef1a9279df19.pdf", "extractedPatientName": "MUNMUN MONDAL"}
38	343	TestReport_MUNMUN MONDAL_60191300012_4b1a20d6-7829-405a-a710-d7e89016d4c8.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for MUNMUN MONDAL imported from Google Drive	{"fileSize": "568912", "importedAt": "2026-02-10T09:50:12.693Z", "driveFileId": "1FP37GaruIUiV1UIX0YbqVG_37zEsgQ-i", "driveViewUrl": "https://drive.google.com/file/d/1FP37GaruIUiV1UIX0YbqVG_37zEsgQ-i/view", "originalFilename": "TestReport_MUNMUN MONDAL_60191300012_4b1a20d6-7829-405a-a710-d7e89016d4c8.pdf", "extractedPatientName": "MUNMUN MONDAL"}
39	344	TestReport_ANASUYA DAS_60291300001_f1a9927d-fea4-4c02-ab98-5c253b528e37.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for ANASUYA DAS imported from Google Drive	{"fileSize": "2333204", "importedAt": "2026-02-10T09:50:12.697Z", "driveFileId": "1oavUZDr9OBUtdP6G7NkDIIlGtVusWIXx", "driveViewUrl": "https://drive.google.com/file/d/1oavUZDr9OBUtdP6G7NkDIIlGtVusWIXx/view", "originalFilename": "TestReport_ANASUYA DAS_60291300001_f1a9927d-fea4-4c02-ab98-5c253b528e37.pdf", "extractedPatientName": "ANASUYA DAS"}
40	344	TestReport_ANASUYA DAS_60291300001_84601eb9-24e3-4ae3-b732-442e8886d26c.pdf	lab_report	Lab Report	2026-02-09	\N	Lab report for ANASUYA DAS imported from Google Drive	{"fileSize": "1878226", "importedAt": "2026-02-10T09:50:12.702Z", "driveFileId": "1vlTfkYUASjGrPjRu-56WzJoeIhDtSqlt", "driveViewUrl": "https://drive.google.com/file/d/1vlTfkYUASjGrPjRu-56WzJoeIhDtSqlt/view", "originalFilename": "TestReport_ANASUYA DAS_60291300001_84601eb9-24e3-4ae3-b732-442e8886d26c.pdf", "extractedPatientName": "ANASUYA DAS"}
41	3	Test Rx	Prescription	prescription	2026-02-14	\N	test	\N
44	165	Prescription - Dr. Sai Dibyadarshini Bhuyan	Prescription	prescription	2026-02-14	\N	\N	{"fileName": "WhatsApp Image 2026-02-14 at 21.39.25.jpeg", "fileSize": "898.5 KB", "ocrSummary": {"date": "2025-04-28", "diagnosis": "Hypothyroid (known case)", "confidence": "high", "doctorName": "Dr. Sai Dibyadarshini Bhuyan", "patientName": "Sudechchha Basu", "medicationCount": 2}, "savedMedications": ["Thyronorm", "Tab Folvit / Macfolate"]}
45	165	Prescription - Dr. Sai Dibyadarshini Bhuyan	Prescription	prescription	2026-02-14	\N	\N	{"fileName": "WhatsApp Image 2026-02-14 at 21.39.25.jpeg", "fileSize": "898.5 KB", "ocrSummary": {"date": "2025-04-28", "diagnosis": "K/H/O hypothyroid c/n", "confidence": "medium", "doctorName": "Dr. Sai Dibyadarshini Bhuyan", "patientName": "Sudechchha Basu", "medicationCount": 2}, "savedMedications": ["Thyronorm", "T. Folvit/macfolate"]}
46	165	Prescription - Dr. Sai Dibyadarshini Bhuyan (2025-04-28)	Prescription	prescription	2025-04-28	\N	\N	{"fileName": "WhatsApp Image 2026-02-14 at 21.39.25.jpeg", "fileSize": "898.5 KB", "ocrSummary": {"date": "2025-04-28", "diagnosis": "K/C/O Hypothyroidism", "confidence": "high", "doctorName": "Dr. Sai Dibyadarshini Bhuyan", "patientName": "Sudechchha Basu", "medicationCount": 2}, "dateConfirmed": true, "savedMedications": ["Thyronorm", "T. Folvit / Macfolate"], "contentFingerprint": "dr.saidibyadarshinibhuyanmbbs|dgo(goldmedalist)|dnb(obs&gyn)|reg.no.:2900799285(wbmc)name:sudechchhabasusaivietcompretéwomencarechiefcomplaintuncletocomeinetryupsince2023decmarriedsince2016janwasansar"}
47	165	Prescription - Dlage (2025-12-08)	Prescription	prescription	2025-12-08	\N	\N	{"fileName": "WhatsApp Image 2026-02-14 at 23.06.47.jpeg", "fileSize": "92.0 KB", "ocrSummary": {"date": "2025-12-08", "diagnosis": null, "confidence": "high", "doctorName": "Dlage", "patientName": null, "medicationCount": 5}, "dateConfirmed": true, "savedMedications": ["T. Letrozole", "T. Folvit", "Macfolate", "Inj HUCOG", "T. Duphaston"], "contentFingerprint": "d₂fsh,lh.✓sr.amh.✓sr.tsh,ft4.hsgond10ofmenses.nutritionalcounselling↓exercin/yoga/swimmingto↓5kginnext2months(atleast)toreview&repst.dlage8/12/25hsg(6/12)-leftcornualblockrighttubepatent&spillageofcon"}
48	165	USG/Scan - WhatsApp Image 2026-02-14 at 23.06.47 (1).jpeg (2026-02-14)	USG Report	usg	2026-02-14	\N	\N	{"fileName": "WhatsApp Image 2026-02-14 at 23.06.47 (1).jpeg", "fileSize": "126.2 KB", "ocrSummary": null, "dateConfirmed": null, "savedMedications": [], "contentFingerprint": "WhatsApp Image 2026-02-14 at 23.06.47 (1).jpeg126.2 KB"}
49	11	USG/Scan - WhatsApp Image 2026-02-14 at 23.06.47 (1).jpeg (2026-01-21)	USG Report	usg	2026-01-21	\N	\N	{"fileName": "WhatsApp Image 2026-02-14 at 23.06.47 (1).jpeg", "fileSize": "126.2 KB", "ocrSummary": {"date": "2026-01-21", "diagnosis": null, "confidence": "high", "doctorName": "Dr. Sayantan Roy", "patientName": "Mrs. SUDECHCHHA BASU", "medicationCount": 0}, "dateConfirmed": true, "savedMedications": [], "contentFingerprint": "spdiagnosticsbarcode:us003243collectedon:20/jan/202607:22pmpatientname:mrs.sudechchhabasureceivedon:20/jan/202607:22pmpatientid:042601200025reportedon:21/jan/202606:42pmage/gender:35y2d/femalesampleso"}
50	165	USG/Scan - WhatsApp Image 2026-02-14 at 23.06.47 (1).jpeg (2026-02-14)	USG Report	usg	2026-02-14	\N	\N	{"fileName": "WhatsApp Image 2026-02-14 at 23.06.47 (1).jpeg", "fileSize": "126.2 KB", "ocrSummary": {"date": null, "diagnosis": null, "confidence": "low", "doctorName": null, "patientName": null, "medicationCount": 0}, "dateConfirmed": null, "savedMedications": [], "contentFingerprint": "{\\"doctorname\\":\\"dr.sayantanroy\\",\\"patientname\\":\\"mrs.sudechchhabasu\\",\\"date\\":\\"2026-01-20\\",\\"reporttype\\":\\"usg-folliculometry\\",\\"gestationalage\\":null,\\"edd\\":null,\\"findings\\":[{\\"organ\\":\\"uterus\\",\\"measurement\\":\\"8."}
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expenses (id, date, category, description, amount, vendor, payment_method, approved_by, notes) FROM stdin;
1	2026-02-13	Medical Supplies	Syringes and gloves	3500	MedSupply Co	Bank Transfer	\N	\N
2	2026-02-13	Lab Reagents	Thyroid test kits	8200	LabChem India	Bank Transfer	\N	\N
3	2026-02-12	Utilities	Electricity bill	4500	CESC	Online	\N	\N
4	2026-02-12	Rent	Clinic rent Feb	45000	Landlord	Bank Transfer	\N	\N
5	2026-02-11	Medical Supplies	Ultrasound gel	1200	MedSupply Co	Cash	\N	\N
6	2026-02-11	Salary	Staff nurse salary	22000	Payroll	Bank Transfer	\N	\N
7	2026-02-10	Salary	Receptionist salary	18000	Payroll	Bank Transfer	\N	\N
8	2026-02-10	Medical Equipment	BP monitor calibration	2800	MediTech	Online	\N	\N
9	2026-02-09	Salary	Nutritionist salary	25000	Payroll	Bank Transfer	\N	\N
10	2026-02-09	Maintenance	AC servicing	3500	CoolAir Services	Cash	\N	\N
11	2026-02-08	Medical Supplies	Cotton and bandages	1500	MedSupply Co	Cash	\N	\N
12	2026-02-07	Utilities	Internet bill	2000	Airtel	Online	\N	\N
13	2026-02-07	Lab Reagents	Blood test kits	12000	LabChem India	Bank Transfer	\N	\N
14	2026-02-06	Salary	Dr. Priya salary	80000	Payroll	Bank Transfer	\N	\N
15	2026-02-06	Salary	Dr. Ramesh salary	60000	Payroll	Bank Transfer	\N	\N
16	2026-02-05	Medical Equipment	Stethoscope replacement	4500	MediTech	Online	\N	\N
17	2026-02-04	Utilities	Water bill	800	KMC Water	Cash	\N	\N
18	2026-02-03	Office Supplies	Printer paper and toner	2200	Stationery Hub	Cash	\N	\N
19	2026-02-02	Maintenance	Plumbing repair	1800	Local Plumber	Cash	\N	\N
20	2026-02-01	Medical Supplies	Disposable masks	900	MedSupply Co	Cash	\N	\N
\.


--
-- Data for Name: follicle_data; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.follicle_data (id, patient_id, day, "left", "right", endometrium) FROM stdin;
1	4	3	5	4	4
2	4	7	8	6	5.5
3	4	10	14	9	7.2
4	4	12	18	11	9.1
\.


--
-- Data for Name: follow_up_calls; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.follow_up_calls (id, patient_id, patient_name, phone, patient_type, consultation_date, planned_date, actual_date, lmp, notes, feeling, got_medicines, concerns, cross_sell, next_visit, next_milestone, didnt_pick_call_time, follow_up, follow_up_date, status, created_by) FROM stdin;
1	243	Dichen	7085114254	Missed Period	\N	18-Oct-2024	18-Oct-2024	\N	Feeling alright,  her problem has solved, will let us know further	Good	Yes	yes	NA	\N	\N	\N	\N	\N	completed	\N
2	\N	Ruksad	7305639064	Pregnant	\N	23-Oct-2024	23-Oct-2024	\N	had some confusion about Medicines but solved now	Good	Yes	yes	NA	\N	\N	\N	\N	\N	completed	\N
3	204	Bindu kumari	7488098179	Irrerugular period	\N	23-Oct-2024	23-Oct-2024	\N	As advised by doctor she will wait for 1 month then will see	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
4	221	Chandi Prasad	9874528377	Pregnant	\N	23-Oct-2024	23-Oct-2024	\N	After doing fetal echo she will come	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
5	269	Antara Das	7001050712	Irrerugular period	\N	23-Oct-2024	23-Oct-2024	\N	doing alright now got all the reports waiting for D2 once thatcomes will let me know	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
6	265	Sarah	8910618573	Weightloss	\N	24-Oct-2024	24-Oct-2024	\N	She is in Mumbai now once come back will let us know	Good	Yes	yes	na	Will let us know once she come back	\N	\N	\N	\N	completed	\N
7	\N	Sundari	7605816257	Pregnant	\N	24-Oct-2024	24-Oct-2024	\N	Having constipation and weakness while long standing an sitting	Good	Yes	Yes	na	11-Sep	\N	\N	\N	\N	completed	\N
8	267	priti Naskar	9330068425	Pregnant	\N	24-Oct-2024	24-Oct-2024	\N	has finished medications brought them otherwise doing alright	Good	Yes	yes	na	10-Nov	\N	\N	\N	\N	completed	\N
9	\N	Priyanka	8901085371	others	\N	24-Oct-2024	24-Oct-2024	\N	doing all right,  the consultation fee is bit high so will discuss with her husband then let us know	Good	Yes	yes	na	Will discuss with husband	\N	\N	\N	\N	completed	\N
10	34	Aparna Dash	8910953723	UTI	\N	24-Oct-2024	24-Oct-2024	\N	waiting for her urine reports once it comes will come , will call once again on Saturday to know the status	Good	Yes	yes	na	11-Nov	\N	\N	\N	\N	completed	\N
11	\N	Deepika	9330215304	Pregnant	\N	25-Oct-2024	25-Oct-2024	\N	She at home now for chat Puja,  having a little blackish stool	Good	Yes	yes	na	After coming back	\N	\N	\N	\N	completed	\N
12	205	Dolly Satapathy	7992412698	others, Endometriosis	\N	25-Oct-2024	25-Oct-2024	\N	She is at home now for chat Puja, her bleeding has stopped,  will comeback on sunday	Good	Yes	yes	na	Bleeding further Bleeding and she is doing alright , so if require further will us know	\N	\N	\N	\N	completed	\N
13	150	Priyanka	9801085371	Post Partum	\N	25-Oct-2024	25-Oct-2024	\N	At home now, will come back after 15 days then will start Postpartum Exercise	Good	Yes	yes	na	15-Nov	\N	\N	\N	\N	completed	\N
14	105	Rimpa	9163921461	Post Partum	\N	25-Oct-2024	25-Oct-2024	\N	went home now after coming back will start with postpartum Exercises	Good	Yes	yes	na	13-Nov	\N	\N	\N	\N	completed	\N
15	207	Kalpana	9525042035	MTP	\N	26-Oct-2024	26-Oct-2024	\N	went home and had abortion there	Good	Yes	yes	na	Not required any appointment now ,if further will let us know	\N	\N	\N	\N	completed	\N
16	\N	Monisri Mukherjee	7045023628	Weightloss	\N	26-Oct-2024	26-Oct-2024	\N	Had to go out of station, otherwise she's doing alright	Good	Yes	yes	na	Will contact once comeback, may be November last	\N	\N	\N	\N	completed	\N
17	125	Naser Khatun	8420069309	others	\N	26-Oct-2024	26-Oct-2024	\N	rejecting calls	\N	\N	\N	na	\N	\N	\N	\N	\N	completed	\N
18	133	Nazrana	9854017265	Pregnant, MTP	\N	26-Oct-2024	26-Oct-2024	\N	had a miscarriage	Good	Yes	yes	na	Will let me further	\N	\N	\N	\N	completed	\N
19	246	Pollobi	9123964046	Pregnant	\N	27-Oct-2024	27-Oct-2024	\N	Having a digestion issues, otherwise doing well	Good	Yes	yes	na	after 2 weeks,  at Lifecare	\N	\N	\N	\N	completed	\N
20	242	Manisha pal	9800149728	others	\N	27-Oct-2024	27-Oct-2024	\N	\N	\N	Yes	yes	na	\N	\N	\N	\N	\N	pending	\N
21	\N	priti Pandey	9566355747	MTP	\N	27-Oct-2024	27-Oct-2024	\N	Had medicine but didn't get periods yet , asked to visit again	Good	Yes	yes	na	2-Nov	\N	\N	\N	\N	completed	\N
22	214	Priyanka Daftary	7232015962	infertility	\N	27-Oct-2024	27-Oct-2024	\N	Doing alright	Good	Yes	yes	na	Will let me know	\N	\N	\N	\N	completed	\N
23	\N	Priyanka Sah	8084615634	Post Partum	\N	28-Oct-2024	28-Oct-2024	\N	last trimester, doing fine	Good	Yes	yes	na	11-Nov	\N	\N	\N	\N	completed	\N
24	240	Ranjina Khatun	9083053146	Pregnant	\N	28-Oct-2024	28-Oct-2024	\N	missed dual marker, asked to do triple marker will come and talk to mam then will decide	Good	Yes	yes	na	1-Nov	\N	\N	\N	\N	completed	\N
25	253	Rawsonara Khatun	9933562076	others	\N	28-Oct-2024	28-Oct-2024	\N	doing alright	Good	Yes	yes	na	Will let me know	\N	\N	\N	\N	completed	\N
26	252	Reshma	9674591525	others	\N	28-Oct-2024	28-Oct-2024	\N	\N	Good	Yes	yes	na	Will let me know	\N	\N	\N	\N	pending	\N
27	130	Tuhina Bibi	9883201260	postpartum	\N	6-Oct-2025	6-Oct-2025	\N	Doing well	Good	Yes	yes	na	6-Oct	\N	\N	\N	\N	completed	\N
28	249	Tapoti Mondal	9836926133	Weightloss	\N	6-Oct-2025	6-Oct-2025	\N	Will come this month end	Good	Yes	yes	na	this month end	\N	\N	\N	\N	completed	\N
29	259	Sushila devi	8902754940	Hypo Thyroid	\N	6-Oct-2025	6-Oct-2025	\N	Shifting home now so now she's quite busy, asked her to let me know if anything or wants me to talk to doctor	Good	Yes	Yes	na	\N	\N	\N	\N	\N	completed	\N
30	76	Sunita Devi	7250150565	others	\N	6-Oct-2025	6-Oct-2025	\N	She is alright now the problem has solved , will let us know anything further	Good	Yes	yes	na	Will let us know	\N	\N	\N	\N	completed	\N
31	182	Sundari Mandal	89064768166	Pregnant	\N	6-Oct-2025	7-Oct-2025	\N	Doing well gained healthy weight will come for the appointment tomorrow	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
32	261	Sonia Khatun	8250711024	PCOS	\N	6-Oct-2025	7-Oct-2025	\N	doing fine	Good	Yes	yes	na	Will let us know	\N	\N	\N	\N	completed	\N
33	261	Sohana Khatun	8250711024	Pregnant	\N	6-Oct-2025	7-Oct-2025	\N	might continue in Lifecare	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
34	241	Sneha Soma	8119930990	others	\N	6-Oct-2025	7-Oct-2025	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	pending	\N
35	262	Sneha Patwari	9830568749	Regular Checkup	\N	6-Oct-2025	7-Oct-2025	\N	will see 2-3 weeks how it's going then connect again	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
36	255	Shweta Gupta	9122956442	Pregnant	\N	6-Oct-2025	8-Oct-2025	\N	They came from lifecare , they will visit  lifecare from next visit	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
37	174	Shilpa Mondal	8240681481	Pregnant	\N	6-Oct-2025	8-Oct-2025	\N	EDD 8/01/26	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
38	254	Shibani Sarkar	9641867484	others	\N	6-Oct-2025	8-Oct-2025	\N	switch off	\N	\N	\N	\N	\N	\N	\N	\N	\N	completed	\N
39	248	Shalini Barman	8210902406	others	\N	6-Oct-2025	8-Oct-2025	\N	Went home	\N	\N	\N	na	\N	\N	\N	\N	\N	completed	\N
40	251	Sayanti Roy	7004836820	others	\N	6-Oct-2025	8-Oct-2025	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	pending	\N
41	240	Ranjina	9083053146	Pregnant	\N	28-Oct-2024	1-Nov-2025	\N	Called the and booked appointment	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
42	\N	Priti Pandey	9566355747	MTP	\N	1-Nov-2025	2-Nov-2025	\N	had the blood tests	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
43	34	Aparna Das	8910953723	UTI, PCOS	\N	1-Nov-2025	2-Nov-2025	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	pending	\N
44	221	Chandni Prasad	9874528377	Pregnant	\N	2-Nov-2025	3-Nov-2025	\N	Will dothe usg in the command then will let us know	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
45	\N	Ruksad	7305639064	Pregnant	\N	2-Nov-2025	3-Nov-2025	\N	she will come this week	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
46	\N	Deepika	9330215304	Pregnant	\N	2-Nov-2025	3-Nov-2025	\N	Is in bihar now, will let us know once come	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
47	34	Aparna	8910953723	UTI	\N	3-Nov-2025	3-Nov-2025	\N	Talked and book the appointment on Nov 3	Good	Yes	yes	na	3-Nov	\N	\N	\N	\N	completed	\N
48	\N	Priyanka	7439637001	Irrerugular period	\N	3-Nov-2025	3-Nov-2025	Aug-14	Talked and book appointment on Nov 3	Good	Yes	yes	na	3-Nov	\N	\N	\N	\N	completed	\N
49	254	Shibani sarkar	9641867482	Missed Period	\N	3-Nov-2025	4-Nov-2025	\N	wrong number	\N	\N	\N	\N	\N	\N	\N	\N	\N	completed	\N
50	261	Sohana	8250711024	Pregnant	\N	3-Nov-2025	4-Nov-2025	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	pending	\N
51	251	Sayanti Roy	7004836820	Missed Period	\N	3-Nov-2025	4-Nov-2025	\N	She is doing alright if anything will let us know	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
52	269	Antara	7001050712	Irrerugular period	\N	3-Nov-2025	4-Nov-2025	26- Sep	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	pending	\N
53	265	Sarah	8910618573	Weightloss	\N	4-Nov-2025	4-Nov-2025	\N	Had an accident is in the hospital	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
54	19	Pallavi	9366214891	Post Partum	\N	4-Nov-2025	4-Nov-2025	\N	talked about postpartum yoga	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
55	277	khyati	9305998039	Itching	\N	5-Nov-2025	6-Nov-2025	\N	Having a little itching , taking medicine will come on 8 nov	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
56	\N	Tuhina	9051858717	Pregnant	\N	7-Nov-2025	7-Nov-2025	\N	talked, they will come around 14 nov	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
57	53	Priti	9330068425	Pregnant	\N	7-Nov-2025	7-Nov-2025	\N	Talked about her condition,  about the stretch marks	Good	Yes	yes	na	10-Nov	\N	\N	\N	\N	completed	\N
58	254	Shibani Sarkar	96418674827908629688	Irrerugular period	13-Sep	7-Nov-2025	7-Nov-2025	\N	Talked she will visit jaligachi	Good	Yes	yes	na	\N	\N	\N	\N	13-Sep-2025	completed	\N
59	\N	Ruksad	7305639064	Pregnant	\N	4-Nov-2025	5-Nov-2025	\N	Blood test and appointment	Good	Yes	yes	na	8-Nov	\N	\N	\N	\N	completed	\N
60	182	Sundari Mandal	7605816257	Pregnant	\N	1-Nov-2025	9-Nov-2025	\N	talked and confirm the appointment	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
61	267	Priti Naskar	9330068425	Pregnant	\N	1-Nov-2025	10-Nov-2025	\N	had come for the prenatal check up	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
62	\N	Priyanka Sah	8084615634	Post Partum	\N	1-Nov-2025	11-Nov-2025	\N	Had talked about the postpartum yoga	Good	Yes	yes	na	\N	Complimentary postpartum not yet done	\N	\N	\N	completed	\N
63	250	Rimpa	9330127429	Post Partum	\N	1-Nov-2024	13-Nov-2025	\N	not responding	Good	Yes	yes	na	\N	Complimentary postpartum done.\nWaiting for the  on buying postpartum package	\N	\N	\N	completed	\N
64	150	Priyanka Kumari	8901085371	Post Partum	\N	11-Nov-2024	15-Nov-2025	\N	is in native now, have to talk to her husband for further information	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
65	174	Shilpa	8240681481	Pregnant	6-Nov	7-Nov-2025	19-Nov-2025	\N	Had come for the appointment	Good	Yes	yes	na	\N	\N	\N	14	20-Nov-2025	completed	\N
66	279	Soumya Mohanty	9875515706	Irrerugular period	5-Nov	7-Nov-2025	20-Nov-2025	\N	blood tests done	Good	Yes	yes	na	\N	\N	\N	14	19-Nov-2025	completed	\N
67	250	Rima mandal	9330127429	Post Partum	\N	4-Nov-2025	30-Nov-2025	\N	Doing fine, baby had fever, will plan to join for yoga after someday	Good	Yes	yes	na	Will let us once things get better	Complimentary postpartum done.\nWaiting for the  on buying postpartum package	\N	\N	\N	completed	\N
68	\N	Priyanka	7439637001	Irrerugular period	Nov6	7-Nov-2025	3-Feb-2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	90	4-Feb-2026	pending	\N
69	273	Rachayita Debnath	83406062848961414753	High Prolactin	\N	7-Nov-2025	7-Nov-2025	\N	Secreting milk from breast at young age,\nsend Exercise lists	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
70	153	Riya Mandal	7044142306	Pregnant	7-Nov	7-Nov-2025	7-Nov-2025	\N	got the cream,  need to follow up and see after 28 days about the result	Good	Yes	yes	na	\N	\N	\N	28	6-Dec-2025	completed	\N
71	\N	Gupta	\N	MTP	7-Nov	7-Nov-2025	7-Nov-2025	\N	had mtp	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
72	\N	Ruksad	7305639064	Pregnant	\N	7-Nov-2025	8-Nov-2025	\N	had the blood test, will come for the appointment on 8 nov	Good	Yes	yes	na	8-Nov	\N	\N	\N	30-Dec-1899	completed	\N
73	285	Dr Anupama	7007749299	Pregnant	\N	7-Nov-2025	8-Nov-2025	\N	Outside of Kolkata now will comeback by 9nov, will an appointment on 9 nov	Good	Yes	yes	na	9-Nov	\N	\N	\N	30-Dec-1899	completed	\N
74	\N	Pranav da	9903610284	Blood Test	\N	\N	\N	\N	Done	\N	\N	\N	\N	\N	\N	\N	\N	30-Dec-1899	completed	\N
75	265	Sarah	8910618573	Weightloss	\N	8-Nov-2025	8-Nov-2025	\N	still in Mumbai, had an accident to so is in hospital now	Good	Yes	yes	na	\N	\N	\N	\N	30-Dec-1899	completed	\N
76	213	Ladli parveen	9066345894	infertility	7-Nov	8-Nov-2025	9-Nov-2025	\N	had the usg	Good	Yes	yes	na	\N	\N	\N	2	9-Nov-2025	completed	\N
77	281	khusboo Kumari	7604005568	Vaginal Itching	7-Nov	8-Nov-2025	9-Nov-2025	\N	not  responding after visit	Good	Yes	yes	NA	\N	\N	\N	2	9-Nov-2025	completed	\N
78	143	Ramya Kiran	7989805700	Pregnant	\N	8-Nov-2025	9-Nov-2025	\N	blood tests done	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
79	277	Khyati	9305998039	Vaginal Itching	1-Nov	8-Nov-2025	9-Nov-2025	\N	is busy now will visit once get free	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
80	\N	Ruksad	7305639064	Pregnant	8-Nov	8-Nov-2025	6-Dec-2025	\N	Had ogtt test showed the report	Good	Yes	yes	Na	\N	\N	\N	28	6-Dec-2025	completed	\N
81	260	Rupali khatun	9735494964	Pregnant	8-Nov	\N	\N	\N	\N	Good	Yes	yes	na	\N	\N	\N	20	6-Dec-2025	pending	\N
82	213	Ladli parveen	9066345894	infertility	9-Nov	10-Nov-2025	11-Nov-2025	\N	she will come	Good	Yes	yes	na	\N	\N	\N	2	11-Nov-2025	completed	\N
83	267	Priti Naskar	9330068425	Pregnant	10-Nov	\N	\N	\N	NT scan (01/11/25), Dual marker	Good	Yes	yes	na	\N	\N	\N	28	\N	completed	\N
84	\N	Paramita Das	7439308039	Weightloss	9-Nov	\N	\N	\N	Blood test done.Diet chart has given	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
85	263	Priti pandey	9566255747	MTP	9-Nov	\N	\N	\N	Blood test done.will go to life care for MTP	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
86	286	Neha singh	7903239186	infertility	11-Nov	\N	\N	\N	Life style modification	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
87	288	Baishali	7626890462	Vaginal Itching	11-Nov	12-Nov-2025	25-Nov-2025	\N	next visit after 14 days	Good	Yes	yes	na	\N	\N	\N	14	25-Nov-2025	completed	\N
88	258	ishita pattnaik	9748724705	Others	\N	\N	\N	\N	will come for vaccination.she said she  is busy and will contact us.	Good	Yes	yes	na	\N	\N	\N	\N	8-Nov-2025	completed	\N
89	279	Soumya Mohanty	9875515706	Irrerugular period	\N	12-Nov-2025	13-Nov-2025	\N	She is taking the medicine will let us know on her next cycle	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
90	285	Dr Anupama	7007749299	Pregnant	\N	13-Nov-2025	13-Nov-2025	\N	Visited for prenatal check up	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
91	182	Sundari Mandal	7605816257	Pregnant	\N	13-Nov-2025	14-Nov-2025	\N	have talked about the parenting workshop will let us know after discussing with her husband	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
92	271	Riyanka luza	7003100366	Pregnant	13-Nov	\N	\N	\N	dual marker and NT scan (will do it in native)	Good	Yes	yes	na	\N	\N	\N	\N	4th December	completed	\N
93	72	Monoroma das	7029696732	Others	13-Nov	\N	\N	\N	weakness and joint pain	Good	Yes	yes	na	\N	\N	\N	\N	21-Nov-2025	completed	\N
94	109	Pritika mondal	8442938605	Pregnant	14-Nov	\N	\N	\N	need to remind for NT scan and dual markar	Good	Yes	yes	na	\N	\N	\N	14	27-Nov-2025	completed	\N
95	105	Rimpa	9163921461	Post Partum	\N	\N	15-Nov-2025	\N	Didn't respond	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
96	\N	Priyanka shah	8084615634	Post Partum	\N	\N	15-Nov-2025	\N	Will come for the postpartum yoga	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
97	331	Juhi Yasmin	9473037605	generalized weakness	15-Nov	\N	\N	\N	Problem has solved will inform further	Good	Yes	yes	na	\N	\N	\N	3 days	\N	completed	\N
98	221	Chandni Prasad	9874528377	Pregnant	15-Nov	\N	\N	\N	prenatal check up	Good	Yes	yes	na	\N	\N	\N	14	29-Nov-2025	completed	\N
99	285	Dr Anupama	7007749299	Pregnant	15-Nov	\N	\N	\N	Pre natal check up	Good	Yes	yes	na	\N	\N	\N	14	29-Nov-2025	completed	\N
100	\N	Deeba	9199373644	MTP	\N	17-Nov-2025	17-Nov-2025	\N	is busy now will come by their own once get time	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
101	286	Neha singh	7903239186	infertility	16-Nov	17-Nov-2025	17-Nov-2025	\N	Will start the diet from tomorrow	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
102	286	Neha singh	7903239186	infertility	16-Nov	17-Nov-2025	26-Nov-2025	\N	Will come in January	Good	Yes	yes	na	\N	\N	\N	\N	26-Nov-2025	completed	\N
103	\N	Paramita	7699094811	Weightloss	16-Nov	17-Nov-2025	17-Nov-2025	\N	Talked about the diet, she will come in 2-3 days.	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
104	277	Khyati	9305998039	Vaginal Itching	16-Nov	17-Nov-2025	17-Nov-2025	\N	is busy now will connect once get time	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
105	282	Moumita	9739021391	Pregnant	16-Nov	17-Nov-2025	26-Nov-2025	\N	talked about parenting workshop	Good	Yes	yes	na	\N	\N	\N	\N	27-Nov-2025	completed	\N
106	\N	Sathi	9800136341	Pregnant	17-Nov	\N	17-Nov-2025	\N	usg (30/11) blood test(01/12)	Good	Yes	yes	na	\N	\N	\N	\N	30-Nov-2025	completed	\N
107	179	Farhana	9874343961	Pregnant	17-Nov	\N	17-Nov-2025	\N	20th usg 1/12/25 next visit	Good	Yes	yes	na	\N	\N	\N	\N	1-Dec-2025	completed	\N
108	\N	Sudechchha	8792114964	Hypo Thyroid	17-Nov	\N	17-Nov-2025	\N	planning for pregnancy,  blood tests on D2 and D10	Good	Yes	yes	na	\N	\N	\N	28	15-Dec-2025	completed	\N
109	174	Shilpa	8240681481	Pregnant	18-Nov	\N	18-Nov-2025	\N	Prenatal check up	Good	Yes	yes	\N	\N	\N	\N	15	1-Dec-2025	completed	\N
110	140	Cinderella	8272966533	PCOS	17-Nov	18-Nov-2025	18-Nov-2025	\N	\N	Good	Yes	yes	\N	\N	\N	\N	\N	\N	pending	\N
111	225	Yogmaya	7978204752	Weightloss	\N	\N	\N	\N	\N	Good	Yes	yes	\N	\N	\N	\N	\N	\N	pending	\N
112	197	Shweta	8159021022	White Dicharge	18-Jul	\N	\N	\N	White discharge problem has solved, hadonly once	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
113	214	Priyanka Debrathi	7232015962	Weightloss	6-Jun	\N	\N	\N	last follow up by subhra mam on 18th june	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
114	170	Shruti	8797304535	weight gain	24-Jul	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	pending	\N
115	\N	Beauty Majumdar	98047570646289078986	Weightloss	24-Jul	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	pending	\N
116	\N	Rinku Jana	98831026907047495360	Pregnant	25-Jul	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	pending	\N
117	231	Shovna Samantray	8104684883	Weightloss	8-Aug	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	pending	\N
118	\N	Aratrika Dutta	\N	Irrerugular period	9-Nov	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	pending	\N
119	215	Soma Biswas	9883346261	Pregnant	10-Jun	18-Nov-2025	19-Nov-2025	\N	Is going to RG Kar now, have talked about parenting workshop and postpartum yoga, said don't have time now will see	Good	Yes	yes	NA	\N	\N	\N	\N	19-Nov-2025	completed	\N
120	150	Priyanka kumari	9801085371	Post Partum	19-Nov	19-Nov-2025	20-Nov-2025	\N	Talked to her husband regarding postpartum check up and exercise and also about parenting workshop	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
121	290	Momi Morang	99543234907099543012	Vaginal Itching	19-Nov	20-Nov-2025	20-Nov-2025	\N	Usg and skin appointment	\N	\N	\N	\N	\N	\N	\N	\N	\N	completed	\N
122	337	Noorjahan	7980011048	Pregnant	20-Nov	\N	21-Nov-2025	\N	Talked about stretch marks and parenting workshop will let us know,is busy because of some contractions work	Good	Yes	yes	na	\N	\N	\N	\N	\N	completed	\N
123	\N	Priyanka Sah	8084615634	Post Partum	23-Nov	\N	24-Nov-2025	\N	\N	Good	Yes	yes	\N	\N	\N	\N	\N	25-Nov-2025	pending	\N
124	\N	Priyanka PS	8050135716	Blood Test	22-Oct	\N	22-Nov-2025	\N	Done	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
125	\N	Akhil	8050135716	Blood Test	22-Nov	\N	22-Nov-2025	\N	done	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
126	\N	Momi	7099543012	MTP	22-Nov	\N	22-Nov-2025	\N	Explained the mtp process,  papsmear has taken	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
127	209	Runu Sen	9731890291	Pregnant	22-Nov	\N	22-Nov-2025	\N	Had done usg , then will decide whether to continue the pregnancy or not	Good	Yes	yes	\N	\N	\N	\N	\N	1-Dec-2025	completed	\N
128	240	Ranjina Khatun	9083053146	Pregnant	24-Nov	\N	24-Nov-2025	\N	prenatal check up	Good	Yes	yes	\N	\N	\N	\N	28	15-Dec-2025	completed	\N
129	290	Momi Morang	7099543012	MTP	25-Nov	25-Nov-2025	25-Nov-2025	\N	She is Appling the ointment doc has given now itching is gone, once the report comes will come to visit	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
130	286	Neha singh	7903239186	PCOS	11-Nov	25-Nov-2025	25-Nov-2025	\N	is traveling now will contact once get back	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
131	\N	Paramita	7699094811	PCOS	9-Nov	25-Nov-2025	25-Nov-2025	\N	She is following her diet well, having period now once it's over will	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
132	182	Sundari Mandal	7605816257	Pregnant	24-Nov	\N	24-Nov-2025	\N	Has taken the stretch marks cream today need to follow up after 28 days	Good	Yes	yes	\N	\N	\N	\N	28	15-Dec-2025	completed	\N
133	343	Munmun mondal	9382284763	Weightloss	26-Nov	\N	26-Nov-2025	\N	they have been trying to conceive for 1 year now, her weight is 108kg so doctor advice to loose weight first then will think further,, she has taken deit plan and yoga session aswell	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
134	113	Puja kumari	7004727901	Pregnant	26-Nov	\N	26-Nov-2025	\N	prenatal check up	Good	Yes	yes	\N	\N	\N	\N	28	13-Dec-2025	completed	\N
135	165	Sudechchha Basu	8792114964	Weightloss	27-Nov	\N	28-Nov-2025	\N	blood test	Good	Yes	yes	\N	\N	\N	\N	\N	6-Dec-2025	completed	\N
136	291	Ragni kumari	7481917932	Others	28-Nov	\N	28-Nov-2025	\N	Was having spotting, doc said it's normal nothing to worry and if further happens she will connect	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
137	\N	priti pandey	8369584668	gen weakness	28-Nov	\N	28-Nov-2025	\N	Had MTP, came for a follow up check up , Didn't advice anything new, will come if anything happens further	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
138	292	Sahnaz Sultana	7003539091	Irrerugular period	29-Nov	\N	29-Nov-2025	\N	Explain the Intercourse process	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
139	320	Proggya Chaudhuri	7439903351	Pregnant	29-Nov	\N	29-Nov-2025	\N	TSH and FT4 done	Good	Yes	yes	\N	\N	\N	\N	28	20-Dec-2025	completed	\N
140	\N	Deeba	9193373644	MTP	\N	\N	30-Nov-2025	\N	didn't respond send messages	Good	Yes	yes	\N	\N	\N	no	\N	\N	completed	\N
141	293	Babita kumari	7542997234	Others	1-Dec	\N	30-Nov-2025	\N	Pain in the lower abdomen,  mam had suggested to diet and lifestyle modification but refused to take	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
142	174	Shilpa mondal	8240681481	Pregnant	1-Dec	\N	1-Dec-2025	\N	Has usg on 14 dec	Good	Yes	yes	\N	\N	\N	\N	\N	14-Dec-2025	completed	\N
143	343	Munmun mondal	9382284763	Weightloss	1-Dec	\N	1-Dec-2025	\N	D2 LH and FSH and D10 HSG...... 3 days of assistance HSA	Good	Yes	yes	\N	\N	\N	\N	\N	4-Dec-2025 hsa	completed	\N
144	209	Runu sen	9731890291	Pregnant	1-Dec	1-Dec-2025	2-Dec-2025	\N	Continuing the pregnancy	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
145	343	Munmun mondal	9382284763	Weightloss	1-Dec	3-Dec-2025	3-Dec-2025	\N	Started diet, didn't get the ingredients for morning detox once get will start that aswell	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
146	179	Farhana	9874343961	Pregnant	3-Dec	3-Dec-2025	3-Dec-2025	\N	They can't afford the fees so they are seeing a local doctor in their area	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
147	\N	Archana	7679913447	UTI	3-Dec	\N	3-Dec-2025	\N	Having uncontrolled urine, advised urine tests	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
148	\N	Pinki Singh	7980154421	Pregnant	3-Dec	\N	3-Dec-2025	\N	usg done	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
149	\N	Sima Mitra	8777253352	Post Partum	4-Dec	4-Dec-2025	4-Dec-2025	\N	explained lactation,	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
150	181	Najma Bibi	9836229358	Missed Period	4-Dec	\N	4-Dec-2025	\N	given blood tests, they will do their own	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
151	294	Soma Dolui	8116382095	Pregnant	5-Dec	\N	5-Dec-2025	\N	planning not to continue the pregnancy	Good	Yes	yes	\N	\N	\N	\N	28	2-Jan-2026	completed	\N
152	143	Ramya Kiran	7989805700	Pregnant	5-Dec	\N	5-Dec-2025	\N	parental counseling done with genetic counseling	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
153	\N	Aaratika Brahmachari	6289006358	Others	5-Dec	\N	5-Dec-2025	\N	Psychological counseling done	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
154	230	Ruksad Parveen	8342039064	Pregnant	6-Dec	\N	6-Dec-2025	\N	Td1 on 20th December	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
155	282	Moumita Kar	9740900330	Pregnant	6-Dec	\N	6-Dec-2025	\N	Tdap to be taken in 1-2 weeks, they will confirm the day	Good	Yes	yes	\N	\N	\N	\N	28	3-Jan-2026	completed	\N
156	295	Swati Singh	9351126153	Others	6-Dec	\N	6-Dec-2025	\N	Wants Contraception	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
157	296	Sathi Ghosh	9564416261	White Dicharge	6-Dec	\N	6-Dec-2025	\N	Pain in the abdomen, white discharge	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
158	335	Erika De	8092144716	Others	6-Dec	\N	6-Dec-2025	\N	Upt positive but doesn't want to continue	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
159	\N	Sima Mitra	8777253352	Post Partum	7-Dec	\N	7-Dec-2025	\N	Doing the message mam has shown	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
160	343	Munmun mondal	9382284763	Weightloss	\N	\N	8-Dec-2025	\N	Following the diet, waiting for the yoga session	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
161	\N	Forida	7908303057	Pregnant	7-Dec	\N	8-Dec-2025	\N	Talked about the antenatal blood tests waiting for her husband to call	Good	Yes	yes	\N	\N	\N	\N	28	4-Jan-2026	completed	\N
162	182	Sundari Mandal	7605816257	Pregnant	8-Dec	\N	8-Dec-2025	\N	Need to remind for usg on 22 dec	Good	Yes	yes	\N	\N	\N	\N	28	5-Jan-2026	completed	\N
163	165	Sudechchha Basu	8792114964	Weightloss	8-Dec	\N	8-Dec-2025	\N	D3 to D7 of period has to remind for Letrizlezole	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
164	335	Erika De	8092144716	MTP	9-Dec	\N	9-Dec-2025	\N	explained mtp process	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
165	337	noorjahan	7980011048	Pregnant	9-Dec	\N	9-Dec-2025	\N	Usg on 23th December	Good	Yes	yes	\N	\N	\N	\N	28	6-Jan-2026	completed	\N
166	267	Priti Naskar	9330068425	Pregnant	10-Dec	\N	10-Dec-2025	\N	she is at her mother house, seeing a doctor there, once come back will contact	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
167	320	Proggya Chaudhary	7439903351	Pregnant	12-Dec	12-Dec-2025	13-Dec-2025	\N	blood tests has to be done (tsh and ft4)	Good	Yes	yes	\N	\N	\N	\N	28	9-Jan-2026	completed	\N
168	174	Shilpa mondal	8240681481	Pregnant	13-Dec	13-Dec-2025	14-Dec-2025	\N	Usg has to be done	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
169	\N	Sathi	9800136341	Pregnant	11-Dec	11-Dec-2025	11-Dec-2025	\N	\N	Good	Yes	yes	\N	\N	\N	\N	\N	\N	pending	\N
170	298	Rubaina Khanqm	8100122301	Pregnant	10-Dec	\N	10-Dec-2025	\N	Antenal check up	Good	Yes	yes	\N	\N	\N	\N	28	7-Jan-2026	completed	\N
171	\N	pinki singh	7980154421	MTP	11-Dec	\N	11-Dec-2025	\N	explained mtp process	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
172	334	Pritika Mondal	6289482889	Pregnant	11-Dec	\N	11-Dec-2025	\N	prenatal check up	Good	Yes	yes	\N	\N	\N	\N	28	8-Jan-2026	completed	\N
173	\N	Mousumi Mondal Acharya	9332660689	Pregnant	11-Dec	\N	11-Dec-2025	\N	prenatal check up	Good	Yes	yes	\N	\N	\N	\N	28	8-Jan-2026	completed	\N
174	165	Sudechchha Basu	8792114964	Weightloss	13-Dec	\N	13-Dec-2025	\N	Need to call and ask to come for the diet Review	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
175	\N	Kalpana Naskar	9804719223	Irrerugular period	13-Dec	\N	13-Dec-2025	\N	High bp, heavy blood flow	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
176	299	Anushuya Mukherjee	8617304704	Pregnant	13-Dec	\N	13-Dec-2025	\N	upt positive but planning to terminate the pregnancy	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
177	234	Nargish	9518347448	White Dicharge	13-Dec	\N	13-Dec-2025	\N	White discharge and itching	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
178	\N	Priti Pandey	8369584668	MTP	15-Dec	\N	15-Dec-2025	\N	had taken copper T	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
179	289	Sathi Mandal	9800136341	Pregnant	15-Dec	11-Jan-2026	15-Dec-2025	\N	Dual marker and NT scan on 11-15 January	Good	Yes	yes	\N	\N	\N	\N	28	12-Jan-2026	completed	\N
180	142	Susmita Mandal	6297608932	Pregnant	17-Dec	28-Dec-2025	17-Dec-2025	\N	Growth scan 28th December	Good	Yes	yes	\N	\N	\N	\N	\N	14-Jan-2026	completed	\N
181	165	Sudechchha Basu	8792114964	Weightloss	\N	\N	17-Dec-2025	\N	She is having cold and fever so couldn't follow the diet for 2/3 days	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
182	209	Runu sen	9731890291	Pregnant	\N	\N	16-Dec-2025	\N	She is in native now, and planning to be in there, will contact once come back	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
183	187	Priyanka Sarkar	7864949228	Irrerugular period	17-Dec	\N	17-Dec-2025	\N	Wants to concive, need to remind for lifestyle program in jan	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
184	300	Nisha Rani	7864400763	Others	18-Dec	\N	18-Dec-2025	\N	Wants to concive, has lifestyle and dietary modification will come next month last	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
185	230	Ruksad Parveen	8342039064	Pregnant	6-Dec	\N	20-Dec-2025	\N	Patient had Td 1 vaccine today, will come tomorrow	Good	Yes	yes	\N	\N	\N	\N	\N	27-Dec-2025	completed	\N
186	\N	Tapoti Mondal	6291200291	Weightloss	20-Dec	\N	20-Dec-2025	\N	because of her son's exam and timing couldn't continue the yoga lately n couldn't come for the diet Review,  will come on coming Frida	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
187	302	Hrishita Debnath	8927956564	Pregnant	20-Dec	\N	20-Dec-2025	\N	Anomaly scan on 26 January	Good	Yes	yes	\N	\N	\N	\N	\N	17-Jan-2026	completed	\N
188	\N	Paramita	7699094811	Weightloss	\N	\N	21-Dec-2025	\N	not responding to call send messages still not replying	\N	\N	\N	\N	\N	\N	\N	\N	\N	completed	\N
189	\N	Munmun	6294650918	Weightloss	22-Dec	22-Dec-2025	22-Dec-2025	\N	Having fever and cold will come on 23 dec	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
190	221	Chandni Prasad	9874528377	Post Partum	22-Dec	22-Dec-2025	22-Dec-2025	\N	postpartum check up	Good	Yes	yes	hpv vaccine	\N	\N	\N	\N	\N	completed	\N
191	338	Manjulika	7439349370	Pregnant	22-Dec	22-Dec-2025	22-Dec-2025	\N	Antenatal check up and blood test	Good	Yes	yes	\N	\N	\N	\N	\N	19-Jan-2026	completed	\N
192	305	Nisha	8630259708	Pregnant	23-Dec	23-Dec-2025	23-Dec-2025	\N	wants to avoid the pregnancy	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
193	\N	Munmun	6294650918	Weightloss	23-Dec	23-Dec-2025	23-Dec-2025	\N	Diet Review	Good	Yes	yes	\N	\N	\N	\N	\N	30-Dec-2025	completed	\N
194	306	Ayantika Naskar	7980885673	Others	23-Dec	23-Dec-2025	23-Dec-2025	\N	Have been trying to concive for 5 months , yoga	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
195	294	Soma Dolui	8116382095	Others	5-Dec	24-Dec-2025	24-Dec-2025	\N	taking the medicine, will come on 2 jan	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
196	307	Suraiya Yesmin	9609708336	Others	24-Dec	24-Dec-2025	24-Dec-2025	\N	Pain in valva need to ask after one week she is doing	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
197	295	Swati Singh	9351126153	MTP	24-Dec	24-Dec-2025	24-Dec-2025	\N	Is pregnant but want contraception after doing usg will go for mtp	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
198	274	Koyal mondal	8910961291	Irrerugular period	24-Dec	\N	24-Dec-2025	\N	irregular period	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
199	295	Swati Singh	9351126153	MTP	26-Dec	\N	26-Dec-2025	\N	explained mtp process	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
200	182	Sundari Mandal	7605816257	Pregnant	26-Dec	\N	26-Dec-2025	\N	Prenatal check up	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
201	61	Shifa Hasan	9330072475	Others	28-Dec	\N	28-Dec-2025	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	pending	\N
202	\N	Juhi	8820927127	Others	28-Dec	\N	28-Dec-2025	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	pending	\N
203	282	Moumita Kar	9739021391	Pregnant	\N	\N	29-Dec-2025	\N	Wants Online consultation	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
204	320	proggya	7439903351	Pregnant	30-Dec	\N	30-Dec-2025	\N	prenatal check up	Good	Yes	yes	\N	\N	\N	\N	28	\N	completed	\N
205	308	Shibani Mondal	8420757590	Others	31-Dec	\N	31-Dec-2025	\N	Pain in the abdomen	Good	Yes	yes	\N	\N	\N	\N	\N	27-Jan-2026	completed	\N
206	\N	Rusana Parvin	8617539134	White Dicharge	31-Dec	\N	31-Dec-2025	\N	White discharge and pain in the abdomen	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
207	309	Dhriti Moni	8972335111	Hypo Thyroid	2-Jan	\N	2-Jan-2026	\N	hypothyroidism	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
208	109	Pritika Mondal	8442938605	Pregnant	2-Jan	29-Jan-2026	2-Jan-2026	\N	prenatal check up (usg appointment )	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
209	256	Arpita Naskar	8910207970	Pregnant	2-Jan	\N	2-Jan-2026	\N	Antenatal profile and usg	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
210	294	Soma Dolui	8116382095	Pregnant	2-Jan	\N	2-Jan-2026	\N	usg for viability scan	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
211	298	Rubaina khanam	8100122301	Pregnant	3-Jan	\N	3-Jan-2026	\N	prenatal check up	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
212	337	Noorjahan khatun	7980011048	Pregnant	3-Jan	24-Jan-2026	3-Jan-2026	\N	growth scan on 24 jan	Good	Yes	yes	\N	\N	\N	\N	14	17-Jan-2026	completed	\N
213	311	priti Singh	7384835157	Irrerugular period	3-Jan	\N	3-Jan-2026	\N	T Deviry need to follow up after 14 days	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
214	\N	suneeti Kumari	7256896422	White Dicharge	4-Jan	\N	4-Jan-2026	\N	Have done papsmear waiting for the result then will decide should take the vaccine or not	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
215	294	Soma dolui	8116382095	Pregnant	4-Jan	1-Feb-2026	4-Jan-2026	\N	Nt sacn and dual marker fab 1-5	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
216	312	Shivani Sharma	9599136283	Others	4-Jan	\N	4-Jan-2026	\N	Usg for dating scan	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
217	309	Dhriti moni	8972335111	MTP	5-Jan	\N	5-Jan-2026	\N	explained the mtp process	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
218	343	Munmun mondal	6294650918	Weightloss	6-Jan	\N	6-Jan-2026	\N	Diet Review	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
219	306	Ayankita	7980885673	Weightloss	6-Jan	\N	6-Jan-2026	\N	Diet Review	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
220	313	Sanjana	8754447715	UTI	6-Jan	\N	6-Jan-2026	\N	Urine cs, will do once come back	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
221	314	Anjali Kumari	9031217131	Pregnant	6-Jan	\N	6-Jan-2026	\N	anc profile	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
222	315	Nafisa sultana	6291151901	Post Partum	7-Jan	\N	7-Jan-2026	\N	postnatal check up from lifecare	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
223	316	Beauty Mojumder	9804757064	Others	7-Jan	\N	7-Jan-2026	\N	overweight mam ask for lifestyle program but refused to take now	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
224	317	Karima Khatun	6291354368	Pregnant	9-Jan	\N	9-Jan-2026	\N	prenatal check up from lifecare	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
225	61	Shifa Hasan	9330072475	MTP	10-Jan	\N	10-Jan-2026	\N	Antenatal profile and nutritional counseling	Good	Yes	yes	\N	\N	\N	\N	28	14-Feb-2026	completed	\N
226	182	Sundari Mandal	7605816257	Post Partum	10-Jan	\N	10-Jan-2026	\N	postpartum visit	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
227	338	Manjulika	7439349370	Pregnant	10-Jan	21-Feb-2026	10-Jan-2026	\N	21-22 Feb NT scan and dual marker	Good	Yes	yes	\N	\N	\N	\N	28	14-Feb-2026	completed	\N
228	\N	Sudechchha	8792114964	Weightloss	12-Jan	\N	12-Jan-2026	\N	diet Review	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
229	306	Ayankita	7980885673	Weightloss	12-Jan	\N	12-Jan-2026	\N	Diet Review	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
230	289	Sathi Mandal	9007702341	Pregnant	12-Jan	\N	12-Jan-2026	\N	duel marker and NT scan	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
231	\N	Munmun	6294650918	Weightloss	12-Jan	\N	12-Jan-2026	\N	Diet Review	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
232	256	Arpita Naskar	8910207970	Pregnant	13-Jan	\N	13-Jan-2026	\N	ANC profile done	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
233	\N	Ayankita	798006781	Pregnant	28-Jan	\N	\N	\N	anc profile	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
234	319	Supriya mondal	9883175516	Pregnant	24-Jan	\N	24-Jan-2026	\N	Antenatal check up will come after 2 weeks	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
235	\N	Munmun	6294650918	Blood Test	29-Jan	\N	\N	\N	fsh and lh	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
236	\N	Tapoli mondal	8017108171	Blood Test	29-Jan	\N	29-Jan-2026	\N	anti ccp	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
237	\N	Pritika	6289482889	Blood Test	30-Jan	\N	30-Jan-2026	\N	\N	Good	Yes	yes	\N	\N	\N	\N	\N	\N	pending	\N
238	\N	Anasuya	7081781839	Others	31-Jan	\N	31-Jan-2026	\N	blood and and consultation	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
239	294	Soma Dolui	6289367369	Blood Test	2-Feb	\N	2-Feb-2026	\N	dual marker	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
240	320	proggya Choudhuri	7439903351	Pregnant	4-Feb	\N	4-Feb-2026	\N	blood tests need to be done	Good	Yes	yes	\N	\N	\N	\N	28	11-Mar-2026	completed	\N
241	273	Rachayita Debnath	8961414753	PCOS	4-Feb	\N	4-Feb-2026	\N	Usg	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
242	321	Rimika Roy	8617046536	MTP	4-Feb	\N	4-Feb-2026	\N	explained mtp process	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
243	314	Anjali	9031217131	Blood Test	5-Feb	\N	5-Feb-2026	\N	dual marker	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
244	306	Ayankita	7980885673	Pregnant	5-Feb	\N	5-Feb-2026	\N	prenatal check up, usg in 2 weeks	Good	Yes	yes	\N	\N	\N	\N	28	12-Mar-2026	completed	\N
245	328	S Bhulaxmi	9679415532	Blood Test	6-Feb	\N	6-Feb-2026	\N	Tsh, ft4, prolactin	Good	Yes	\N	\N	\N	\N	\N	\N	\N	completed	\N
246	322	Tania Parvin	6291688031	Pregnant	6-Feb	\N	6-Feb-2026	\N	Antenatal check up	Good	Yes	yes	\N	\N	\N	\N	28	13-Mar-2026	completed	\N
247	143	Ramya Kiran	7989805700	Pregnant	6-Feb	\N	6-Feb-2026	\N	Ogtt next week	Good	Yes	yes	\N	\N	\N	\N	28	13-Mar-2026	completed	\N
248	198	Tamanna parvin	7450804486	Pregnant	7-Feb	\N	7-Feb-2026	\N	antenatal check up	Good	Yes	yes	\N	\N	\N	\N	28	14-Mar-2026	completed	\N
249	198	Sanjura Khatun	7450804486	Pregnant	7-Feb	\N	7-Feb-2026	\N	antenatal check up,  growth scan	Good	Yes	yes	\N	\N	\N	\N	28	14-Mar-2026	completed	\N
250	324	Diya Mondal	6295609739	Others	7-Feb	\N	7-Feb-2026	\N	Vaginal infection	Good	Yes	yes	\N	\N	\N	\N	14	21-Feb-2026	completed	\N
251	\N	Nurjahan bibi	9749479032	Blood Test	9-Feb	\N	9-Feb-2026	\N	blood tests	\N	\N	\N	\N	\N	\N	\N	\N	\N	completed	\N
252	240	Ranjina Khatun	9083053146	Pregnant	9-Feb	\N	9-Feb-2026	\N	Growth scan	Good	Yes	yes	\N	\N	\N	\N	14	23-Feb-2026	completed	\N
253	240	Sonali Sarkar	9083053146	Irrerugular period	9-Feb	\N	9-Feb-2026	\N	Irregular menses	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
254	261	Sohana Khatun	8250711024	Pregnant	9-Feb	\N	9-Feb-2026	\N	antenatal check up	Good	Yes	yes	\N	\N	\N	\N	28	16-Mar-2026	completed	\N
255	256	Arpita Naskar	8910207970	Pregnant	9-Feb	\N	9-Feb-2026	\N	antenatal check up (NT scan and dual marker )	Good	Yes	yes	\N	\N	\N	\N	28	23-Mar-2026	completed	\N
256	273	Rachayita Debnath	8961414753	Others	9-Feb	\N	9-Feb-2026	\N	Need to reduce 10km in 3 months	Good	Yes	yes	\N	\N	\N	\N	90	10-May-2026	completed	\N
257	327	Suman Karfa	9614692321	Others	9-Feb	\N	9-Feb-2026	\N	Urine Cs and routine	Good	Yes	\N	\N	\N	\N	\N	\N	\N	completed	\N
258	298	Rubaina Khanam	8100122301	Pregnant	10-Feb	\N	10-Feb-2026	\N	antenatal check up,  anomaly scan	Good	Yes	yes	\N	\N	\N	\N	28	31-Mar-2026	completed	\N
259	314	Anjali Kumari	9031217131	Pregnant	10-Feb	\N	10-Feb-2026	\N	antenatal check up,  need to continue depot one more month	Good	Yes	yes	\N	\N	\N	\N	28	31-Mar-2026	completed	\N
260	273	Rachayita Debnath	8961414753	Weightloss	11-Feb	\N	11-Feb-2026	\N	Weightloss diet	Good	Yes	yes	\N	\N	\N	\N	7	18-Feb-2026	completed	\N
261	\N	Dipa Mondal	6291174781	Pregnant	12-Feb	\N	12-Feb-2026	\N	Doesn't want to continue the pregnancy	Good	Yes	yes	\N	\N	\N	\N	\N	\N	completed	\N
262	109	Pritika Mondal	8442938605	Pregnant	12-Feb	\N	12-Feb-2026	\N	antenatal check up	Good	Yes	yes	\N	\N	\N	\N	28	5-Mar-2026	completed	\N
263	\N	Anuska Chakraborty	9002642345	Others	13-Feb	\N	13-Feb-2026	\N	Burning sensation,  urine re,cs	\N	\N	\N	\N	\N	\N	\N	\N	\N	completed	\N
\.


--
-- Data for Name: hormone_readings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hormone_readings (id, patient_id, day, estrogen, progesterone, lh, fsh, symptoms) FROM stdin;
1	1	1	20	5	5	10	2
2	1	5	30	5	6	8	1
3	1	10	60	6	8	6	3
4	1	14	90	8	40	15	2
5	1	16	50	20	10	6	5
6	1	20	40	60	5	4	7
7	1	25	30	40	4	4	8
8	1	28	25	10	4	8	4
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoices (id, patient_id, appointment_id, date, items, subtotal, tax, total, payment_method, payment_status, insurance_claim_id, notes) FROM stdin;
\.


--
-- Data for Name: lab_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_results (id, patient_id, lab_task_id, test_name, category, date, results, unit, value, reference_min, reference_max, status, notes) FROM stdin;
34	314	\N	Glucose (Fasting) Plasma	Biochemistry	2026-01-09	\N	mg/dL	92.3	\N	100	Normal	Extracted from Drive file: 1X_tOJhxn2t0oOtpqMyVj0R8ClEpRfhDc
35	314	\N	Glucose (Post Prandial), Plasma	Biochemistry	2026-01-09	\N	mg/dL	120.8	\N	140	Normal	Extracted from Drive file: 1X_tOJhxn2t0oOtpqMyVj0R8ClEpRfhDc
36	314	\N	HbA1c By HPLC	Biochemistry	2026-01-09	\N	%	5.8	\N	5.7	High	Extracted from Drive file: 1X_tOJhxn2t0oOtpqMyVj0R8ClEpRfhDc
37	314	\N	Estimated Average Glucose(eAG)	Biochemistry	2026-01-09	\N	mg/dL	119.38	70	126	Normal	Extracted from Drive file: 1X_tOJhxn2t0oOtpqMyVj0R8ClEpRfhDc
38	314	\N	HbA1c By HPLC, EDTA Blood	Hematology	2026-01-09	\N	%	5.8	5.7	6.5	Borderline	Extracted from Drive file: 1wvMrz6PRFi2_RZaxoyUohfBxjV3aXT50
39	314	\N	HbA1c(IFCC)	Hematology	2026-01-09	\N	mmol/mol	39.6	\N	\N	\N	Extracted from Drive file: 1wvMrz6PRFi2_RZaxoyUohfBxjV3aXT50
40	314	\N	HbA1c(NGSP)	Hematology	2026-01-09	\N	%	5.8	5.7	6.5	Borderline	Extracted from Drive file: 1wvMrz6PRFi2_RZaxoyUohfBxjV3aXT50
41	314	\N	eAG(ADA)	Biochemistry	2026-01-09	\N	mg/dl	118.9	70	126	Normal	Extracted from Drive file: 1wvMrz6PRFi2_RZaxoyUohfBxjV3aXT50
42	314	\N	PAPP-A	Biochemistry	2026-02-05	\N	mU/L	2850	\N	\N	Normal	Extracted from Drive file: 1Qn8phupkMOefQ_469PqwRWcZyitOK1pG
43	314	\N	FBHCG	Biochemistry	2026-02-05	\N	ng/mL	39.88	\N	\N	Normal	Extracted from Drive file: 1Qn8phupkMOefQ_469PqwRWcZyitOK1pG
44	314	\N	NT	Screening Marker	2026-02-05	\N	mm	1.5	\N	\N	Normal	Extracted from Drive file: 1Qn8phupkMOefQ_469PqwRWcZyitOK1pG
45	314	\N	Down Syndrome (T21) Final Risk	Genetic Screening	2026-02-05	\N	\N	29036	1001	\N	Low	Extracted from Drive file: 1Qn8phupkMOefQ_469PqwRWcZyitOK1pG
46	314	\N	Down Syndrome (T21) Biochemical Risk	Genetic Screening	2026-02-05	\N	\N	3471	1001	\N	Low	Extracted from Drive file: 1Qn8phupkMOefQ_469PqwRWcZyitOK1pG
47	314	\N	Down Syndrome (T21) Age Risk	Genetic Screening	2026-02-05	\N	\N	1109	1001	\N	Low	Extracted from Drive file: 1Qn8phupkMOefQ_469PqwRWcZyitOK1pG
48	314	\N	Edward Syndrome (T18) Final Risk	Genetic Screening	2026-02-05	\N	\N	100000	\N	\N	Low	Extracted from Drive file: 1Qn8phupkMOefQ_469PqwRWcZyitOK1pG
49	314	\N	Edward Syndrome (T18) Age Risk	Genetic Screening	2026-02-05	\N	\N	9973	\N	\N	Low	Extracted from Drive file: 1Qn8phupkMOefQ_469PqwRWcZyitOK1pG
50	314	\N	Patau Syndrome (T13) Final Risk	Genetic Screening	2026-02-05	\N	\N	100000	\N	\N	Low	Extracted from Drive file: 1Qn8phupkMOefQ_469PqwRWcZyitOK1pG
51	314	\N	Patau Syndrome (T13) Age Risk	Genetic Screening	2026-02-05	\N	\N	29949	\N	\N	Low	Extracted from Drive file: 1Qn8phupkMOefQ_469PqwRWcZyitOK1pG
52	314	\N	Down Syndrome (T21) Risk	Genetic Risk Assessment	2026-02-05	\N	\N	\N	\N	\N	Low	Extracted from Drive file: 1blhwolFxfNGeDa2ktSCQ31Cz_VnyvwU6
53	314	\N	Edward Syndrome (T18) Risk	Genetic Risk Assessment	2026-02-05	\N	\N	\N	\N	\N	Low	Extracted from Drive file: 1blhwolFxfNGeDa2ktSCQ31Cz_VnyvwU6
54	314	\N	Patau Syndrome (T13) Risk	Genetic Risk Assessment	2026-02-05	\N	\N	\N	\N	\N	Low	Extracted from Drive file: 1blhwolFxfNGeDa2ktSCQ31Cz_VnyvwU6
\.


--
-- Data for Name: lab_tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_tasks (id, patient_id, test, due, status) FROM stdin;
1	1	Serum Progesterone	Today	Pending
2	2	OGTT (75g)	Tomorrow	Scheduled
3	5	Hormone Panel	Overdue	Delayed
\.


--
-- Data for Name: medications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medications (id, patient_id, name, dose, frequency, route, start_date, end_date, prescribed_by, status, notes) FROM stdin;
1	11	Au-9	\N	Once daily	Oral	2026-01-06	\N	\N	Active	Duration: Continue
2	11	Dydrosure	10 mg	Twice daily	Oral	2026-01-06	\N	\N	Active	Duration: Continue
3	11	Proluton depot	500 iu	Weekly	Intramuscular	2026-01-06	\N	\N	Active	Duration: Continue
4	11	Uprise P3	60,000	Weekly	Oral	2026-01-06	\N	\N	Active	\N
6	314	Dydrosure	10 mg	Twice daily	Oral	2026-01-06	\N	\N	Active	\N
8	314	Uprise D3	60,000 IU	Weekly	Oral	2026-01-06	\N	\N	Active	\N
7	314	Proluton Depot Injection	250mg/ml	Weekly	Intramuscular	2026-01-06	\N	\N	Active	Continue
9	314	orofer xt		once daily	\N	2026-02-11	\N	\N	Active	
10	314	shelcal hd		twice daily	\N	2026-02-11	\N	\N	Active	
12	165	Thyronorm	37.5 mcg	OD	oral	2026-02-14	\N	\N	active	Duration: continue. ac (before meals)
13	165	Tab Folvit / Macfolate	not specified	OD	oral	2026-02-14	\N	\N	active	Duration: continue
16	165	Thyronorm	37.5mcg	OD	\N	2025-04-28	\N	\N	active	\N
17	165	T. Folvit / Macfolate	\N	OD	\N	2025-04-28	\N	\N	active	Duration: Continue
18	165	T. Letrozole	2.5 mg	OD	Oral	2025-12-08	\N	\N	active	Duration: D3 - D7. From Day 3 to Day 7 of cycle
19	165	T. Folvit	\N	\N	Oral	2025-12-08	\N	\N	active	\N
20	165	Macfolate	\N	\N	Oral	2025-12-08	\N	\N	active	\N
21	165	Inj HUCOG	10,000 IU	Single dose	IM	2025-12-08	\N	\N	active	Duration: Single dose. If Dominant Follicle > 18 mm
22	165	T. Duphaston	10 mg	\N	Oral	2025-12-08	\N	\N	active	Duration: D16 - D25. From Day 16 to Day 25 of cycle
\.


--
-- Data for Name: medicine_catalog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medicine_catalog (id, name, generic_name, default_dose, dose_options, default_frequency, route, category, is_active) FROM stdin;
1	Folic Acid	Folic Acid	5 mg	{"1 mg","5 mg"}	Once daily	Oral	Supplement	t
2	Iron + Folic Acid	Ferrous Ascorbate + Folic Acid	100 mg + 1.5 mg	{"100 mg + 1.5 mg"}	Once daily	Oral	Supplement	t
3	Calcium + Vitamin D3	Calcium Carbonate + Cholecalciferol	500 mg + 250 IU	{"500 mg + 250 IU","1000 mg + 500 IU"}	Once daily	Oral	Supplement	t
4	Progesterone	Micronized Progesterone	200 mg	{"100 mg","200 mg","400 mg"}	Twice daily	Vaginal	Hormone	t
5	Letrozole	Letrozole	2.5 mg	{"2.5 mg","5 mg","7.5 mg"}	Once daily (CD 2-6)	Oral	Fertility	t
6	Clomiphene Citrate	Clomiphene	50 mg	{"25 mg","50 mg","100 mg"}	Once daily (CD 2-6)	Oral	Fertility	t
7	Metformin	Metformin HCl	500 mg	{"250 mg","500 mg","850 mg","1000 mg"}	Twice daily	Oral	Metabolic	t
8	HCG Trigger	Human Chorionic Gonadotropin	5000 IU	{"5000 IU","10000 IU"}	Single injection	Intramuscular	Fertility	t
9	Gonadotropin (FSH)	Follitropin Alfa	75 IU	{"37.5 IU","75 IU","150 IU","225 IU"}	Once daily	Subcutaneous	Fertility	t
10	GnRH Agonist	Leuprolide Acetate	0.5 mg	{"0.5 mg","1 mg"}	Once daily	Subcutaneous	Fertility	t
11	GnRH Antagonist	Cetrorelix / Ganirelix	0.25 mg	{"0.25 mg"}	Once daily	Subcutaneous	Fertility	t
12	Estradiol Valerate	Estradiol	2 mg	{"1 mg","2 mg","4 mg","6 mg"}	Twice daily	Oral	Hormone	t
13	Dydrogesterone	Dydrogesterone	10 mg	{"10 mg","20 mg"}	Twice daily	Oral	Hormone	t
14	Aspirin	Aspirin (Low Dose)	75 mg	{"75 mg","150 mg"}	Once daily	Oral	Anticoagulant	t
15	Duphaston	Dydrogesterone	10 mg	{"10 mg"}	Twice daily	Oral	Hormone	t
16	Cabergoline	Cabergoline	0.5 mg	{"0.25 mg","0.5 mg"}	Twice a week	Oral	Hormone	t
17	Myo-Inositol	Myo-Inositol + D-Chiro-Inositol	2000 mg	{"1000 mg","2000 mg","4000 mg"}	Twice daily	Oral	Supplement	t
18	DHA / Omega-3	Docosahexaenoic Acid	200 mg	{"200 mg","300 mg"}	Once daily	Oral	Supplement	t
19	Vitamin D3	Cholecalciferol	60000 IU	{"1000 IU","2000 IU","60000 IU"}	Weekly / Once daily	Oral	Supplement	t
20	Methylcobalamin	Vitamin B12	1500 mcg	{"500 mcg","1500 mcg"}	Once daily	Oral	Supplement	t
21	Hydroxyprogesterone	Hydroxyprogesterone Caproate	250 mg	{"250 mg","500 mg"}	Weekly	Intramuscular	Hormone	t
22	Levothyroxine	Levothyroxine Sodium	50 mcg	{"25 mcg","50 mcg","75 mcg","100 mcg"}	Once daily (empty stomach)	Oral	Thyroid	t
23	Prednisolone	Prednisolone	5 mg	{"5 mg","10 mg","20 mg"}	Once daily	Oral	Steroid	t
24	Enoxaparin	Enoxaparin Sodium	40 mg	{"20 mg","40 mg","60 mg"}	Once daily	Subcutaneous	Anticoagulant	t
25	Utrogestan	Micronized Progesterone	200 mg	{"100 mg","200 mg"}	Twice daily	Vaginal	Hormone	t
26	Susten	Natural Micronized Progesterone	200 mg	{"100 mg","200 mg","400 mg"}	Twice daily	Vaginal	Hormone	t
27	Pantoprazole	Pantoprazole	40 mg	{"20 mg","40 mg"}	Once daily (before breakfast)	Oral	GI	t
28	Ondansetron	Ondansetron	4 mg	{"4 mg","8 mg"}	As needed	Oral	Antiemetic	t
29	Doxylamine + B6	Doxylamine + Pyridoxine	10 mg + 10 mg	{"10 mg + 10 mg"}	At bedtime	Oral	Antiemetic	t
30	Isoxsuprine	Isoxsuprine HCl	10 mg	{"10 mg","20 mg"}	Three times daily	Oral	Tocolytic	t
31	All 9	Methylcobalamin, L-Methylfolate Calcium & Pyridoxal-5-Phosphate	\N	\N	\N	Oral	\N	t
32	Proluton Depot Injection	Hydroxyprogesterone	250mg/ml	\N	\N	Intramuscular	\N	t
33	Vivamom	\N	\N	\N	\N	Oral	Protien powder	t
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, conversation_id, role, content, created_at) FROM stdin;
\.


--
-- Data for Name: nutrition_plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nutrition_plans (id, name, tags, assigned_to) FROM stdin;
1	Ovulation Support	{"High Protein","Low GI"}	12
2	GDM Management	{"Sugar Control",Balanced}	5
3	Postpartum Healing	{Galactogogues,"Iron Rich"}	8
\.


--
-- Data for Name: patient_protocols; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.patient_protocols (id, patient_id, primary_goal, dietary_strategy, weekly_plan, notes, saved_by, saved_at) FROM stdin;
1	1	inflammation	anti-inflammatory	{"Monday": [{"id": 1, "qty": "1 bowl", "item": "Oatmeal with Flax & Berries", "name": "Breakfast", "time": "08:00", "macros": "550kcal, 12g P"}, {"id": 2, "qty": "5-6 pcs", "item": "Walnuts (Soaked)", "name": "Morning Snack", "time": "11:00", "macros": "120kcal, 4g P"}, {"id": 3, "qty": "1 plate", "item": "Quinoa Salad with Chickpeas", "name": "Lunch", "time": "13:00", "macros": "450kcal, 18g P"}, {"id": 4, "qty": "1 cup", "item": "Green Tea + Apple", "name": "Afternoon Snack", "time": "16:00", "macros": "80kcal, 0g P"}, {"id": 5, "qty": "1 bowl", "item": "Lentil Soup + Steamed Veg", "name": "Dinner", "time": "19:30", "macros": "320kcal, 15g P"}], "Tuesday": [{"id": 6, "qty": "2 eggs", "item": "Scrambled Eggs (or Tofu) with Spinach", "name": "Breakfast", "time": "08:00", "macros": "320kcal, 18g P"}, {"id": 7, "qty": "10 pcs", "item": "Almonds", "name": "Morning Snack", "time": "11:00", "macros": "140kcal, 5g P"}, {"id": 8, "qty": "1 bowl", "item": "Grilled Chicken/Paneer Salad", "name": "Lunch", "time": "13:00", "macros": "400kcal, 25g P"}]}	\N	staff.nutritionist	2026-02-09T07:29:28.572Z
2	1	inflammation	anti-inflammatory	{"Monday": [{"id": 1, "qty": "1 bowl", "item": "Oatmeal with Flax & Berries", "name": "Breakfast", "time": "08:00", "macros": "650kcal, 12g P"}, {"id": 2, "qty": "5-6 pcs", "item": "Walnuts (Soaked)", "name": "Morning Snack", "time": "11:00", "macros": "120kcal, 4g P"}, {"id": 3, "qty": "1 plate", "item": "Quinoa Salad with Chickpeas", "name": "Lunch", "time": "13:00", "macros": "450kcal, 18g P"}, {"id": 4, "qty": "1 cup", "item": "Green Tea + Apple", "name": "Afternoon Snack", "time": "16:00", "macros": "80kcal, 0g P"}, {"id": 5, "qty": "1 bowl", "item": "Lentil Soup + Steamed Veg", "name": "Dinner", "time": "19:30", "macros": "320kcal, 15g P"}], "Tuesday": [{"id": 6, "qty": "2 eggs", "item": "Scrambled Eggs (or Tofu) with Spinach", "name": "Breakfast", "time": "08:00", "macros": "320kcal, 18g P"}, {"id": 7, "qty": "10 pcs", "item": "Almonds", "name": "Morning Snack", "time": "11:00", "macros": "140kcal, 5g P"}, {"id": 8, "qty": "1 bowl", "item": "Grilled Chicken/Paneer Salad", "name": "Lunch", "time": "13:00", "macros": "400kcal, 25g P"}]}	\N	staff.nutritionist	2026-02-09T07:31:46.206Z
3	1	inflammation	anti-inflammatory	{"Monday": [{"id": 1, "qty": "1 bowl", "item": "Oatmeal with Flax & Berries", "name": "Breakfast", "time": "08:00", "macros": "750kcal, 12g P"}, {"id": 2, "qty": "5-6 pcs", "item": "Walnuts (Soaked)", "name": "Morning Snack", "time": "11:00", "macros": "120kcal, 4g P"}, {"id": 3, "qty": "1 plate", "item": "Quinoa Salad with Chickpeas", "name": "Lunch", "time": "13:00", "macros": "450kcal, 18g P"}, {"id": 4, "qty": "1 cup", "item": "Green Tea + Apple", "name": "Afternoon Snack", "time": "16:00", "macros": "80kcal, 0g P"}, {"id": 5, "qty": "1 bowl", "item": "Lentil Soup + Steamed Veg", "name": "Dinner", "time": "19:30", "macros": "320kcal, 15g P"}], "Tuesday": [{"id": 6, "qty": "2 eggs", "item": "Scrambled Eggs (or Tofu) with Spinach", "name": "Breakfast", "time": "08:00", "macros": "320kcal, 18g P"}, {"id": 7, "qty": "10 pcs", "item": "Almonds", "name": "Morning Snack", "time": "11:00", "macros": "140kcal, 5g P"}, {"id": 8, "qty": "1 bowl", "item": "Grilled Chicken/Paneer Salad", "name": "Lunch", "time": "13:00", "macros": "400kcal, 25g P"}]}	\N	staff.nutritionist	2026-02-09T07:32:10.973Z
4	1	inflammation	anti-inflammatory	{"Monday": [{"id": 1, "qty": "1 bowl", "item": "Oatmeal with Flax & Berries", "name": "Breakfast", "time": "08:00", "macros": "450kcal, 12g P"}, {"id": 2, "qty": "5-6 pcs", "item": "Walnuts (Soaked)", "name": "Morning Snack", "time": "11:00", "macros": "120kcal, 4g P"}, {"id": 3, "qty": "1 plate", "item": "Quinoa Salad with Chickpeas", "name": "Lunch", "time": "13:00", "macros": "450kcal, 18g P"}, {"id": 4, "qty": "1 cup", "item": "Green Tea + Apple", "name": "Afternoon Snack", "time": "16:00", "macros": "80kcal, 0g P"}, {"id": 5, "qty": "1 bowl", "item": "Lentil Soup + Steamed Veg", "name": "Dinner", "time": "19:30", "macros": "320kcal, 15g P"}], "Tuesday": [{"id": 6, "qty": "2 eggs", "item": "Scrambled Eggs (or Tofu) with Spinach", "name": "Breakfast", "time": "08:00", "macros": "320kcal, 18g P"}, {"id": 7, "qty": "10 pcs", "item": "Almonds", "name": "Morning Snack", "time": "11:00", "macros": "140kcal, 5g P"}, {"id": 8, "qty": "1 bowl", "item": "Grilled Chicken/Paneer Salad", "name": "Lunch", "time": "13:00", "macros": "400kcal, 25g P"}]}	\N	staff.nutritionist	2026-02-09T07:33:12.507Z
5	1	inflammation	anti-inflammatory	{"Monday": [{"id": 1, "qty": "1 bowl", "item": "Oatmeal with Flax & Berries", "name": "Breakfast", "time": "08:00", "macros": "650kcal, 12g P"}, {"id": 2, "qty": "5-6 pcs", "item": "Walnuts (Soaked)", "name": "Morning Snack", "time": "11:00", "macros": "120kcal, 4g P"}, {"id": 3, "qty": "1 plate", "item": "Quinoa Salad with Chickpeas", "name": "Lunch", "time": "13:00", "macros": "450kcal, 18g P"}, {"id": 4, "qty": "1 cup", "item": "Green Tea + Apple", "name": "Afternoon Snack", "time": "16:00", "macros": "80kcal, 0g P"}, {"id": 5, "qty": "1 bowl", "item": "Lentil Soup + Steamed Veg", "name": "Dinner", "time": "19:30", "macros": "320kcal, 15g P"}], "Tuesday": [{"id": 6, "qty": "2 eggs", "item": "Scrambled Eggs (or Tofu) with Spinach", "name": "Breakfast", "time": "08:00", "macros": "320kcal, 18g P"}, {"id": 7, "qty": "10 pcs", "item": "Almonds", "name": "Morning Snack", "time": "11:00", "macros": "140kcal, 5g P"}, {"id": 8, "qty": "1 bowl", "item": "Grilled Chicken/Paneer Salad", "name": "Lunch", "time": "13:00", "macros": "400kcal, 25g P"}]}	\N	staff.nutritionist	2026-02-09T07:34:46.940Z
6	1	inflammation	anti-inflammatory	{"Monday": [{"id": 1, "qty": "1 bowl", "item": "Oatmeal with Flax & Berries", "name": "Breakfast", "time": "08:00", "macros": "750kcal, 12g P"}, {"id": 2, "qty": "5-6 pcs", "item": "Walnuts (Soaked)", "name": "Morning Snack", "time": "11:00", "macros": "120kcal, 4g P"}, {"id": 3, "qty": "1 plate", "item": "Quinoa Salad with Chickpeas", "name": "Lunch", "time": "13:00", "macros": "450kcal, 18g P"}, {"id": 4, "qty": "1 cup", "item": "Green Tea + Apple", "name": "Afternoon Snack", "time": "16:00", "macros": "80kcal, 0g P"}, {"id": 5, "qty": "1 bowl", "item": "Lentil Soup + Steamed Veg", "name": "Dinner", "time": "19:30", "macros": "320kcal, 15g P"}], "Tuesday": [{"id": 6, "qty": "2 eggs", "item": "Scrambled Eggs (or Tofu) with Spinach", "name": "Breakfast", "time": "08:00", "macros": "320kcal, 18g P"}, {"id": 7, "qty": "10 pcs", "item": "Almonds", "name": "Morning Snack", "time": "11:00", "macros": "140kcal, 5g P"}, {"id": 8, "qty": "1 bowl", "item": "Grilled Chicken/Paneer Salad", "name": "Lunch", "time": "13:00", "macros": "400kcal, 25g P"}]}	\N	staff.nutritionist	2026-02-09T08:19:05.963Z
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.patients (id, name, age, status, focus, last_visit, cycle_day, avatar, mode, referred_by, referred_to, vaccination, insurance, contraception, history, type, mood, weight, hb, genomics, functional, intervention, plan, next_review, clinician_note, condition, phone, email, address, lmp, height, bp, pregnancy_status, is_prime_member, prime_member_since) FROM stdin;
3	Sarah J.	31	Stable	Postpartum Wk 6	3 weeks ago	\N	SJ	postpartum	Dr. Khan (OBGYN)	Psychologist	Completed	Self-Pay	Discussing (IUD)	{"drug": ["Sertraline 50mg", "Vitamin D"], "medical": ["Postpartum Depression (Mild)", "Hypertension (Resolved)"], "surgical": ["Episiotomy (2025)"], "allergies": ["Latex"]}	Postpartum	Depressed	65	12	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
4	Elena R.	36	Active Cycle	IUI Cycle #2	Yesterday	11	ER	iui	Dr. Patel (Endo)	-	Up to Date	Private	None (TTC)	\N	Fertility	Stressed	62	12.5	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
5	Priya K.	28	Assessment	PCOS Mgmt	Today	21	PK	hormone_care	Dr. Lee (Derm)	Dietitian	HPV Due	Corporate	Oral Pill	\N	PCOS	Stable	78	11.8	{"mthfr": {"risk": "Low", "status": "Normal"}, "gluten": {"risk": "Low", "status": "Negative"}, "caffeine": {"risk": "Low", "status": "Fast Metabolizer"}, "estrogen": {"risk": "High", "status": "CYP1A1 Slow"}}	{"gut": {"score": 60, "status": "Leaky Gut"}, "hormone": {"focus": "Progesterone Support", "status": "Low"}, "nutrient": {"status": "Moderate", "deficiency": "Omega-3"}, "inflammation": {"value": "12", "marker": "Homocysteine", "status": "Borderline"}}	{"protocol": "Gut Healing Protocol (Week 4)", "dietPhase": "Reintroduction Phase"}	Low Histamine, High Omega-3	1 week	Referral: Dr. Reynolds. Confirmed Endo Stage II. Avoid inflammatory foods. Prioritize omega-3s for pain management.	Endometriosis Stage II	\N	\N	\N	\N	\N	\N	\N	f	\N
19	Mrspallavi pandey	0	active	Gynaecologist consultation Dr. Divya	2024-11-28	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	66.6	\N	\N	\N	\N	\N	\N	\N	\N	9366214891	\N	\N	10/8/2024	157 cm	\N	\N	f	\N
12	Rabiya Bibi	0	active	Gynaecologist consultation Dr. Divya	2024-10-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	6296741080	\N	\N	\N	\N	\N	\N	f	\N
2	Meera D.	34	Monitor	Pregnancy Wk 24	1 week ago	\N	MD	pregnancy	Self	Fetal Medicine	Flu Shot Due	Corporate	N/A	{"drug": ["Insulin", "Iron Supplements", "Calcium"], "medical": ["GDM (Gestational Diabetes)", "Anemia"], "surgical": ["C-Section (Previous Birth 2020)"], "allergies": ["None"]}	Pregnant	Stable	72	10.5	{"comt": {"risk": "Low", "status": "Val/Val (Warrior)"}, "carbs": {"risk": "High", "status": "TCF7L2 Variant"}, "mthfr": {"risk": "High", "status": "Homozygous"}, "caffeine": {"risk": "High", "status": "Slow Metabolizer"}}	{"gut": {"score": 85, "status": "Stable"}, "hormone": {"focus": "Insulin Sensitivity", "status": "Resistant"}, "nutrient": {"status": "Moderate", "deficiency": "Chromium"}, "inflammation": {"value": "18", "marker": "Insulin", "status": "High"}}	{"protocol": "Metabolic Reset (Day 5)", "dietPhase": "Low GI Strict"}	Low Glycemic Index, Methylated Folate	Tomorrow	Referral: Dr. Reynolds. GDM risk high. Strict sugar control needed. Monitor post-prandial spikes.	Gestational Diabetes Risk	\N	\N	\N	\N	\N	\N	\N	f	\N
26	Minara Khatoon	0	active	Gynaecologist consultation Dr. Divya	2024-11-28	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	64	\N	\N	\N	\N	\N	\N	\N	\N	6290107010	\N	\N	9/7/2024	153 cm	105/66	\N	f	\N
14	Tanusree Bhar	0	active	Gynaecologist consultation Dr. Divya	2024-10-15	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9681804899	\N	\N	\N	\N	\N	\N	f	\N
15	Sabina khatun	0	active	Gynaecologist consultation Dr. Divya	2024-10-15	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8388002536	\N	\N	\N	\N	\N	\N	f	\N
11	Suhana Shabnam	0	active	Gynaecologist consultation Dr. Divya	2025-04-23	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9732857902	\N	\N	5/29/2024	\N	99/60	\N	f	\N
16	Saima Bibi	0	active	Gynaecologist consultation Dr. Divya	2024-10-15	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9875523236	\N	\N	\N	\N	\N	\N	f	\N
18	Vidya Sen	0	active	General medicine Dr Antariksh	2024-10-17	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	6290104143	\N	\N	\N	\N	\N	\N	f	\N
8	Hafija Bibi	0	active	Gynaecologist consultation Dr. Divya	2024-10-05	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9734262896	\N	\N	\N	\N	\N	\N	f	\N
9	Anshu	0	active	Gynaecologist consultation Dr. Divya	2024-10-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7903897126	\N	\N	\N	\N	\N	\N	f	\N
20	Surbhi Shukla	0	active	Gynaecologist consultation Dr. Divya	2024-10-17	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	64	\N	\N	\N	\N	\N	\N	\N	\N	8756795931	\N	\N	12/6/2024	155	119/74	\N	f	\N
10	Radhika Agarwal	0	active	Gynaecologist consultation Dr. Divya	2024-10-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9088946494	\N	\N	\N	\N	\N	\N	f	\N
17	Sumana Karmakar	0	active	Gynaecologist consultation Dr. Divya	2024-10-17	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8900449494	\N	\N	\N	\N	\N	\N	f	\N
13	Anita	0	active	Gynaecologist consultation Dr. Divya	2024-10-19	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9811554236	\N	\N	\N	\N	\N	\N	f	\N
21	Subhra Roy	0	active	Gynaecologist consultation Dr. Divya	2024-10-19	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7003401774	\N	\N	\N	\N	\N	\N	f	\N
22	Pratima Das	0	active	Gynaecologist consultation Dr. Divya	2024-10-21	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7908850385	\N	\N	\N	\N	\N	\N	f	\N
23	Purnima Singh	0	active	Gynaecologist consultation Dr. Divya	2024-10-21	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7079101478	\N	\N	\N	\N	\N	\N	f	\N
25	Monika Singh	0	active	Gynaecologist consultation Dr. Divya	2024-10-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8707798241	\N	\N	\N	\N	\N	\N	f	\N
28	Priya sardar	0	active	Gynaecologist consultation Dr. Divya	2024-10-29	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8478003863	\N	\N	\N	\N	\N	\N	f	\N
34	Aparna Mishra	0	active	Gynaecologist consultation Dr. Divya	2024-11-03	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8910953723	\N	\N	\N	\N	\N	\N	f	\N
55	Selima Bibi	0	active	Gynaecologist consultation Dr. Divya	2024-11-25	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	44.9	\N	\N	\N	\N	\N	\N	\N	\N	6290565524	\N	\N	\N	140 cm	120/80	\N	f	\N
52	Shubhashree Sahoo	0	active	Gynaecologist consultation Dr. Divya	2024-11-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	71.2	\N	\N	\N	\N	\N	\N	\N	\N	9060302534	\N	\N	3/28/2024	156 cm	110/70	\N	f	\N
124	Bristi Mukherjee	0	active	Gynaecologist consultation Dr. Divya	2025-04-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9861304515	\N	\N	2/6/2025	\N	\N	\N	f	\N
42	Jayanti Biswas	0	active	Gynaecologist consultation Dr. Divya	2024-11-14	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	49.3	\N	\N	\N	\N	\N	\N	\N	\N	8240676368	\N	\N	\N	147 cm	110/80	\N	f	\N
57	Fatima Bibi	0	active	Gynaecologist consultation Dr. Divya	2024-11-28	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8017621696	\N	\N	\N	\N	\N	\N	f	\N
27	Heena Nishar	0	active	Gynaecologist consultation Dr. Divya	2024-11-28	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	53.4	\N	\N	\N	\N	\N	\N	\N	\N	9163460817	\N	\N	\N	5’2	110/72	completed	f	\N
123	Mamta Kumari	0	active	Gynaecologist consultation Dr. Divya	2025-03-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8010115781	\N	\N	1/27/2025	\N	100/60	\N	f	\N
41	Hirataj Bibi	0	active	Gynaecologist consultation Dr. Divya	2024-11-11	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	67.2	\N	\N	\N	\N	\N	\N	\N	\N	9163896629	\N	\N	\N	154 cm	90/60	\N	f	\N
68	Kamini Acharjo	0	active	Gynaecologist consultation Dr. Divya	2024-12-23	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	62.5	\N	\N	\N	\N	\N	\N	\N	\N	9748133884	\N	\N	\N	145	117/75	\N	f	\N
54	Saira Khatun	0	active	Gynaecologist consultation Dr. Divya	2024-11-25	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	56.7	\N	\N	\N	\N	\N	\N	\N	\N	6290854948	\N	\N	5/24/2024	145 cm	110/70	\N	f	\N
58	Devopriya chatterji	0	active	Gynaecologist consultation Dr. Divya	2024-12-05	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	64	\N	\N	\N	\N	\N	\N	\N	\N	8978283009	\N	\N	12/5/2024	152	142/87	\N	f	\N
59	Krishi	0	active	Gynaecologist consultation Dr. Divya	2024-12-08	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8210734699	\N	\N	10/27/2024	\N	\N	\N	f	\N
60	Ismat Khatun	0	active	Gynaecologist consultation Dr. Divya	2024-12-08	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1243567890	\N	\N	\N	\N	\N	\N	f	\N
61	Shamaila	0	active	Gynaecologist consultation Dr. Divya	2026-01-10	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	47.9	\N	\N	\N	\N	\N	\N	\N	\N	9330072475	\N	\N	11/19/0025	149	120/70	\N	f	\N
62	Momotaj bibi	0	active	Gynaecologist consultation Dr. Divya	2024-12-18	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	53	\N	\N	\N	\N	\N	\N	\N	\N	8372879060	\N	\N	12/18/2024	143	124/77	\N	f	\N
63	Mousumi Mondal	0	active	Gynaecologist consultation Dr. Divya	2024-12-19	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	50.9	\N	\N	\N	\N	\N	\N	\N	\N	7001779277	\N	\N	11/7/2024	155	115/70	\N	f	\N
64	Nashima khatun	0	active	Gynaecologist consultation Dr. Divya	2024-12-21	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	62.1	\N	\N	\N	\N	\N	\N	\N	\N	9382771075	\N	\N	12/20/2024	153	\N	\N	f	\N
39	Priyanka Nath	0	active	Gynaecologist consultation Dr. Divya	2024-11-09	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	77.2	\N	\N	\N	\N	\N	\N	\N	\N	9836443581	\N	\N	11/9/2024	155	\N	\N	f	\N
56	Deeksha Dibya	0	active	Gynaecologist consultation Dr. Divya	2024-11-25	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	52.9	\N	\N	\N	\N	\N	\N	\N	\N	6205184319	\N	\N	\N	145 cm	132/70	\N	f	\N
43	Moumita Dolui	0	active	Gynaecologist consultation Dr. Divya	2024-11-23	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	70.4	\N	\N	\N	\N	\N	\N	\N	\N	7685833649	\N	\N	\N	153	110/70	\N	f	\N
72	Monoroma Das	0	active	Gynaecologist consultation Dr. Divya	2024-12-27	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	56.9	\N	\N	\N	\N	\N	\N	\N	\N	7029696732	\N	\N	\N	159	115/60	\N	f	\N
40	Banashree Naskar	0	active	Gynaecologist consultation Dr. Divya	2025-01-08	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	55	\N	\N	\N	\N	\N	\N	\N	\N	9830555294	\N	\N	12/10/2024	150	130/85	\N	f	\N
53	Priti	0	active	Gynaecologist consultation Dr. Divya	2024-11-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	47.3	\N	\N	\N	\N	\N	\N	\N	\N	9625195855	\N	\N	\N	144cm	110/70	\N	f	\N
122	Suparna Mukherjee	0	active	Gynaecologist consultation Dr. Divya	2025-03-05	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9830215965	\N	\N	9/4/2024	\N	\N	\N	f	\N
69	Sahina Khatun	0	active	Gynaecologist consultation Dr. Divya	2025-05-11	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	75	\N	\N	\N	\N	\N	\N	\N	\N	9062282954	\N	\N	\N	159	133/85	\N	f	\N
70	Salma Bibi	0	active	Gynaecologist consultation Dr. Divya	2024-12-26	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	71.5	\N	\N	\N	\N	\N	\N	\N	\N	6290344259	\N	\N	\N	165	123/80	\N	f	\N
71	Bhaswoti Chanda	0	active	Gynaecologist consultation Dr. Divya	2024-12-26	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	61	\N	\N	\N	\N	\N	\N	\N	\N	7439972355	\N	\N	\N	162	100/60	\N	f	\N
38	Nasrin sultana	0	active	Gynaecologist consultation Dr. Divya	2025-02-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	71.7	\N	\N	\N	\N	\N	\N	\N	\N	7044294494	\N	\N	12/20/2024	\N	120/80	\N	f	\N
30	Rohini kumari	0	active	Gynaecologist consultation Dr. Divya	2024-10-30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7501790480	\N	\N	\N	\N	\N	\N	f	\N
31	Debarati Das	0	active	Gynaecologist consultation Dr. Divya	2024-11-01	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9700354434	\N	\N	\N	\N	\N	\N	f	\N
32	Mrs Shweta MD	0	active	Gynaecologist consultation Dr. Divya	2024-11-03	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9014251212	\N	\N	\N	\N	\N	\N	f	\N
33	Mrs Sonia Ghosh Patra	0	active	Gynaecologist consultation Dr. Divya	2024-11-03	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	6289050080	\N	\N	\N	\N	\N	\N	f	\N
65	Sukanya Banerjee	0	active	Gynaecologist consultation Dr. Divya	2024-12-21	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	74.2	\N	\N	\N	\N	\N	\N	\N	\N	9051785802	\N	\N	11/30/2024	151	\N	\N	f	\N
66	Saptadeepa b.sings	0	active	Gynaecologist consultation Dr. Divya	2024-12-21	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	92.7	\N	\N	\N	\N	\N	\N	\N	\N	8926188860	\N	\N	9/17/2024	150	\N	\N	f	\N
67	Payel Naskar	0	active	Gynaecologist consultation Dr. Divya	2024-12-21	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	51	\N	\N	\N	\N	\N	\N	\N	\N	9609281841	\N	\N	11/19/2024	155	\N	\N	f	\N
44	Soma Mondal	0	active	Gynaecologist consultation Dr. Divya	2024-12-23	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	58	\N	\N	\N	\N	\N	\N	\N	\N	9748429471	\N	\N	\N	161	129/85	\N	f	\N
45	Sanchaita biswas	0	active	Gynaecologist consultation Dr. Divya	2024-11-23	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	69.2	\N	\N	\N	\N	\N	\N	\N	\N	9681694851	\N	\N	\N	139 cm	120/80	\N	f	\N
46	Itu Debnath	0	active	Gynaecologist consultation Dr. Divya	2024-11-23	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	53.7	\N	\N	\N	\N	\N	\N	\N	\N	6290756004	\N	\N	\N	149 cm	120/70	\N	f	\N
47	Rumpa Parveen	0	active	Gynaecologist consultation Dr. Divya	2024-11-23	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	60	\N	\N	\N	\N	\N	\N	\N	\N	8167076830	\N	\N	\N	151	110/80	\N	f	\N
49	Puja Naskar	0	active	Gynaecologist consultation Dr. Divya	2024-11-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	58.1	\N	\N	\N	\N	\N	\N	\N	\N	8981951102	\N	\N	\N	148	\N	\N	f	\N
50	Janisa Parvin	0	active	Pediatrician Dr Debasis	2024-11-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	14.5	\N	\N	\N	\N	\N	\N	\N	\N	9093055630	\N	\N	\N	\N	\N	\N	f	\N
51	Nasrin Parveen	0	active	Gynaecologist consultation Dr. Divya	2024-11-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	45.3	\N	\N	\N	\N	\N	\N	\N	\N	8583893234	\N	\N	9/22/2024	144 cm	110/70	\N	f	\N
36	Miss RUKAIYA KHATUN	0	active	Gynaecologist consultation Dr. Divya	2025-03-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	47.5	\N	\N	\N	\N	\N	\N	\N	\N	9874783980	\N	\N	2/28/2025	148 centimetre	115/80	\N	f	\N
37	Archie Jaiswal	0	active	Dermatologist consultation Dr. Ismat	2024-11-08	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9810308032	\N	\N	\N	\N	\N	\N	f	\N
29	Harshada bhosle	0	active	Gynaecologist consultation Dr. Divya	2024-10-29	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9834047757	\N	\N	\N	\N	\N	\N	f	\N
35	Anjali Sinha	0	active	Gynaecologist consultation Dr. Divya	2025-02-05	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	68.3	\N	\N	\N	\N	\N	\N	\N	\N	9661867852	\N	\N	5/21/2024	\N	130/80	\N	f	\N
99	Shila Ghosh	0	active	Gynaecologist consultation Dr. Divya	2025-02-05	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9051844394	\N	\N	6/17/2024	\N	\N	\N	f	\N
114	Rupa Bibi	0	active	Gynaecologist consultation Dr. Divya	2025-05-26	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	58.9	\N	\N	\N	\N	\N	\N	\N	\N	9593950100	\N	\N	\N	158	110/70	\N	f	\N
105	Rimpa Adak	0	active	Gynaecologist consultation Dr. Divya	2025-02-13	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9163921461	\N	\N	1/4/2025	\N	110/75	\N	f	\N
100	Isma Khatoon	0	active	Gynaecologist consultation Dr. Divya	2025-02-05	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	6297671097	\N	\N	2/3/2025	\N	90/60	\N	f	\N
120	Chanchal Kumari	0	active	Gynaecologist consultation Dr. Divya	2025-02-28	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9517479473	\N	\N	\N	\N	90/60	\N	f	\N
103	Sulekha Mandal	0	active	Gynaecologist consultation Dr. Divya	2025-02-09	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9734519654	\N	\N	1/6/2025	\N	90/50	\N	f	\N
104	Rimpa Khatun	0	active	Gynaecologist consultation Dr. Divya	2025-02-11	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9832839187	\N	\N	10/25/2024	\N	115/60	\N	f	\N
79	Tiya Kumari	0	active	Gynaecologist consultation Dr. Divya	2025-01-08	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	63	\N	\N	\N	\N	\N	\N	\N	\N	8918391571	\N	\N	11/25/2024	173	115/70	\N	f	\N
81	Ujuwala Kumari	0	active	Gynaecologist consultation Dr. Divya	2025-01-09	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	51	\N	\N	\N	\N	\N	\N	\N	\N	8987230847	\N	\N	12/23/2024	153	130/90	\N	f	\N
95	Sumita Patwari	0	active	Gynaecologist consultation Dr. Divya	2025-02-25	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8389838332	\N	\N	\N	\N	115/70	\N	f	\N
118	Poonam Tamang	0	active	Gynaecologist consultation Dr. Divya	2025-02-27	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	6295843812	\N	\N	1/10/2025	\N	110/65	\N	f	\N
75	Ripa Islam	0	active	Gynaecologist consultation Dr. Divya	2025-01-02	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	61.2	\N	\N	\N	\N	\N	\N	\N	\N	9999116865	\N	\N	\N	170	110/70	\N	f	\N
87	Mallika Modal	0	active	Gynaecologist consultation Dr. Divya	2025-01-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9383643042	\N	\N	12/10/2024	\N	90/60	\N	f	\N
77	Sonam Kumari	0	active	Gynaecologist consultation Dr. Divya	2025-01-04	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	85.3	\N	\N	\N	\N	\N	\N	\N	\N	6203330169	\N	\N	12/5/2024	168	140/90	\N	f	\N
93	Susmita Paul	0	active	Gynaecologist consultation Dr. Divya	2025-02-18	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8906987934	\N	\N	12/15/2024	\N	\N	\N	f	\N
96	Chandan Jana	0	active	Dermatologist consultation Dr. Ismat	2025-02-04	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7823912352	\N	\N	\N	\N	\N	\N	f	\N
97	Safia Bibi	0	active	Gynaecologist consultation Dr. Divya	2025-02-05	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9681193902	\N	\N	12/28/2024	\N	80/60	\N	f	\N
98	Nisha Rai	0	active	Gynaecologist consultation Dr. Divya	2025-02-05	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9330648845	\N	\N	12/14/2024	\N	90/60	\N	f	\N
109	Pritika Mandal	0	active	Gynaecologist consultation Dr. Divya	2026-01-02	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	58.6	\N	\N	\N	\N	\N	\N	\N	\N	8442938605	\N	\N	9/4/2025	151	95/65	\N	f	\N
82	Jayanti Pramanik	0	active	Gynaecologist consultation Dr. Divya	2025-01-10	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	61.2	\N	\N	\N	\N	\N	\N	\N	\N	8001787610	\N	\N	12/18/2024	165	100/70	\N	f	\N
89	Manati Chanda	0	active	Psychologist Dr. Prasakha	2025-01-25	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9075539639	\N	\N	\N	\N	\N	\N	f	\N
112	Samiksha	0	active	Gynaecologist consultation Dr. Divya	2025-09-13	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	75	\N	\N	\N	\N	\N	\N	\N	\N	6204140670	\N	\N	4/6/2025	151	115/80	\N	f	\N
107	Sreeja Mukharjee	0	active	Gynaecologist consultation Dr. Divya	2025-02-14	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7439519383	\N	\N	1/24/2025	\N	120/70	\N	f	\N
113	Puja Kumari	0	active	Gynaecologist consultation Dr. Divya	2025-11-26	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	68	\N	\N	\N	\N	\N	\N	\N	\N	7004727901	\N	\N	9/24/0024	157	120/80	\N	f	\N
83	Aklima Khatun	0	active	Gynaecologist consultation Dr. Divya	2025-01-10	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8827277392	\N	\N	12/23/2024	\N	90/50	\N	f	\N
86	Jannatul Arzomond	0	active	Gynaecologist consultation Dr. Divya	2025-01-23	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	54.7	\N	\N	\N	\N	\N	\N	\N	\N	9167310667	\N	\N	\N	164	100/70	\N	f	\N
78	Juhi Jha	0	active	Gynaecologist consultation Dr. Divya	2025-01-08	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	61	\N	\N	\N	\N	\N	\N	\N	\N	7764056373	\N	\N	5/12/2024	170	90/70	\N	f	\N
85	Suchitra Kuiri	0	active	Gynaecologist consultation Dr. Divya	2025-02-15	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9641002029	\N	\N	\N	\N	110/70	\N	f	\N
108	Ruksha Bibi	0	active	Gynaecologist consultation Dr. Divya	2025-02-15	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7679542398	\N	\N	6/21/2024	\N	140/80	\N	f	\N
110	Subhashree Pradhan	0	active	Gynaecologist consultation Dr. Divya	2025-02-18	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7064385516	\N	\N	\N	\N	\N	\N	f	\N
90	Shailjah Gupta	0	active	Psychologist Dr. Prasakha	2025-01-25	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9874653161	\N	\N	\N	\N	\N	\N	f	\N
115	Mina Bibi	0	active	Gynaecologist consultation Dr. Divya	2025-02-25	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9064082190	\N	\N	\N	\N	90/60	\N	f	\N
91	Neha Maheshwari	0	active	Psychologist Dr. Prasakha	2025-01-25	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9883086735	\N	\N	\N	\N	\N	\N	f	\N
111	Ringing Bhutia	0	active	Gynaecologist consultation Dr. Divya	2025-02-19	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9932634667	\N	\N	2/1/2025	\N	\N	\N	f	\N
73	Deepmita Ray	0	active	Gynaecologist consultation Dr. Divya	2024-12-29	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	77.1	\N	\N	\N	\N	\N	\N	\N	\N	6371336060	\N	\N	11/29/2024	165	110/75	\N	f	\N
94	Rinku Halder	0	active	Gynaecologist consultation Dr. Divya	2025-01-29	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8981615714	\N	\N	1/16/2025	\N	\N	\N	f	\N
84	Trisha Naskar	0	active	Gynaecologist consultation Dr. Divya	2025-01-10	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9330272741	\N	\N	1/8/2025	\N	100/70	\N	f	\N
117	Afsana Parveen	0	active	Gynaecologist consultation Dr. Divya	2025-02-25	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8130765934	\N	\N	2/7/2025	\N	115/70	\N	f	\N
76	Sunita Devi	0	active	Gynaecologist consultation Dr. Divya	2025-09-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	58	\N	\N	\N	\N	\N	\N	\N	\N	7250150565	\N	\N	8/30/2025	156	140/80	\N	f	\N
119	Sahina Gazi	0	active	Gynaecologist consultation Dr. Divya	2025-02-27	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8927068306	\N	\N	1/15/2025	\N	100/70	\N	f	\N
121	Ananya Patel	0	active	Gynaecologist consultation Dr. Divya	2025-03-01	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9979689310	\N	\N	\N	\N	80/60	\N	f	\N
101	Piyali Mondal	0	active	Gynaecologist consultation Dr. Divya	2025-02-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9330809093	\N	\N	1/26/2025	\N	\N	\N	f	\N
88	Amrit Bharti	0	active	Psychologist Dr. Prasakha	2025-03-10	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9755730022	\N	\N	\N	166	100/60	\N	f	\N
80	Aklima Bibi	0	active	Gynaecologist consultation Dr. Divya	2025-01-08	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	81	\N	\N	\N	\N	\N	\N	\N	\N	7003513380	\N	\N	\N	166	130/90	\N	f	\N
102	Suchismita Panda	0	active	Gynaecologist consultation Dr. Divya	2025-02-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8763322514	\N	\N	12/8/2024	\N	\N	\N	f	\N
92	Shreja Jana	0	active	Gynaecologist consultation Dr. Divya	2025-01-27	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	64	\N	\N	\N	\N	\N	\N	\N	\N	8789534587	\N	\N	12/8/2024	174	130/70	\N	f	\N
133	Nazrana Siddique	0	active	Gynaecologist consultation Dr. Divya	2025-09-05	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	65	\N	\N	\N	\N	\N	\N	\N	\N	9854017265	\N	\N	6/25/2025	156	150/70	aborted	f	\N
150	Priyanka Kumari	0	active	Gynaecologist consultation Dr. Divya	2025-09-18	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	68.6	\N	\N	\N	\N	\N	\N	\N	\N	9801085371	\N	\N	12/23/2024	164	115/70	\N	f	\N
161	Devanshi Desna Sahu	0	active	Gynaecologist consultation Dr. Divya	2025-04-26	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8105525262	\N	\N	4/12/2025	\N	100/60	\N	f	\N
164	Latika Patra	27	active	Gynaecologist consultation Dr. Divya	2025-07-03	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	47.9	\N	\N	\N	\N	\N	\N	\N	\N	9337552273	\N	\N	6/9/2025	149	\N	\N	f	\N
155	Adity Manna	0	active	Gynaecologist consultation Dr. Divya	2025-04-23	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7439814049	\N	\N	4/1/2025	\N	110/70	\N	f	\N
143	Ramya Kiran	0	active	Gynaecologist consultation Dr. Divya	2026-02-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	78	\N	\N	\N	\N	\N	\N	\N	\N	7989805700	\N	\N	8/12/0025	158	130/70	\N	f	\N
169	Rozy Khatun	30	active	Gynaecologist consultation Dr. Divya	2025-05-03	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	65.2	\N	\N	\N	\N	\N	\N	\N	\N	7605813163	\N	\N	3/26/2025	156	\N	\N	f	\N
163	Puja Gupta	0	active	Gynaecologist consultation Dr. Divya	2025-04-26	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9382120964	\N	\N	4/13/2025	\N	\N	\N	f	\N
168	Ujjawala	26	active	Gynaecologist consultation Dr. Divya	2025-04-30	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	52.5	\N	\N	\N	\N	\N	\N	\N	\N	7209752130	\N	\N	1/23/2025	142	\N	\N	f	\N
139	Bhawani Adak	0	active	Gynaecologist consultation Dr. Divya	2025-04-01	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8478832663	\N	\N	\N	\N	110/70	\N	f	\N
148	Sakila Parvin	0	active	Gynaecologist consultation Dr. Divya	2025-06-01	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	61	\N	\N	\N	\N	\N	\N	\N	\N	7416937391	\N	\N	4/9/2025	152	\N	\N	f	\N
158	Sutapa Adak Jana	0	active	Gynaecologist consultation Dr. Divya	2025-04-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9679302552	\N	\N	10/29/2024	\N	\N	\N	f	\N
126	Indrani Mukherjee	0	active	Gynaecologist consultation Dr. Divya	2025-03-16	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7585055415	\N	\N	2/7/2025	\N	\N	\N	f	\N
135	Niharika	0	active	Gynaecologist consultation Dr. Divya	2025-03-29	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7086889638	\N	\N	2/24/2025	\N	\N	\N	f	\N
166	Kaniz Gupta	31	active	Gynaecologist consultation Dr. Divya	2025-05-11	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	75	\N	\N	\N	\N	\N	\N	\N	\N	9330784976	\N	\N	\N	163	\N	\N	f	\N
128	Payel Das	0	active	Gynaecologist consultation Dr. Divya	2025-03-20	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7059525807	\N	\N	3/13/2025	\N	90/60	\N	f	\N
130	Tuhina Bibi	0	active	Gynaecologist consultation Dr. Divya	2025-11-14	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	70.1	\N	\N	\N	\N	\N	\N	\N	\N	9734637313	\N	\N	4/20/2025	150	120/80	\N	f	\N
151	Shradhanjali Nayak	0	active	Gynaecologist consultation Dr. Divya	2025-04-19	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8144557938	\N	\N	4/19/2025	\N	100/60	\N	f	\N
127	Sneha Raj	0	active	Gynaecologist consultation Dr. Divya	2025-04-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7004427161	\N	\N	1/26/2025	\N	90/60	\N	f	\N
142	Susmita Mandal	0	active	Gynaecologist consultation Dr. Divya	2025-04-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8207080698	\N	\N	8/31/2024	\N	\N	\N	f	\N
149	Monoara Khatun	0	active	Gynaecologist consultation Dr. Divya	2025-04-15	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	6295597971	\N	\N	2/3/2025	\N	90/70	\N	f	\N
173	Jyoti Kumari	29	active	Gynaecologist consultation Dr. Divya	2025-05-14	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	52.2	\N	\N	\N	\N	\N	\N	\N	\N	77559883889	\N	\N	4/4/2025	152	\N	\N	f	\N
125	Naseera Khatun	0	active	Gynaecologist consultation Dr. Divya	2025-09-10	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	58.4	\N	\N	\N	\N	\N	\N	\N	\N	8420069309	\N	\N	1/20/2025	156	140/80	\N	f	\N
153	Riya Mandal	0	active	Gynaecologist consultation Dr. Divya	2025-04-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9831908937	\N	\N	\N	\N	120/70	\N	f	\N
165	Sudechchha Basu	34	active	Gynaecologist consultation Dr. Divya	2025-04-29	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	62.7	\N	\N	\N	\N	\N	\N	\N	\N	8971561144	\N	\N	\N	154	\N	\N	f	\N
129	Aashima Khan	0	active	Gynaecologist consultation Dr. Divya	2025-03-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9229554319	\N	\N	10/8/2024	\N	\N	\N	f	\N
134	Ashima Mandal	0	active	Gynaecologist consultation Dr. Divya	2025-03-29	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8100669698	\N	\N	2/2/2025	\N	\N	\N	f	\N
131	Champa Das	0	active	Gynaecologist consultation Dr. Divya	2025-10-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	46.9	\N	\N	\N	\N	\N	\N	\N	\N	9832884640	\N	\N	10/17/2025	140	110/70	\N	f	\N
136	Kavita Sharma	0	active	Gynaecologist consultation Dr. Divya	2025-03-29	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7977986456	\N	\N	\N	\N	\N	\N	f	\N
137	Swarnim Rai	0	active	Gynaecologist consultation Dr. Divya	2025-03-30	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	6291254728	\N	\N	2/17/2025	\N	\N	\N	f	\N
156	Manisha Minj	0	active	Gynaecologist consultation Dr. Divya	2025-04-23	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9073462938	\N	\N	\N	\N	100/80	\N	f	\N
132	Nikita Singh	0	active	Gynaecologist consultation Dr. Divya	2025-03-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8917291487	\N	\N	2/10/2025	\N	125/70	\N	f	\N
174	Shilpa Mandal	22	active	Gynaecologist consultation Dr. Divya	2025-12-01	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	74	\N	\N	\N	\N	\N	\N	\N	\N	8240681481	\N	\N	3/30/0025	158	130/80	\N	f	\N
175	Madhumitha Jana	26	active	Gynaecologist consultation Dr. Divya	2025-05-15	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	68	\N	\N	\N	\N	\N	\N	\N	\N	7407790569	\N	\N	4/20/2025	155	\N	\N	f	\N
172	Susmita Naskar	19	active	Gynaecologist consultation Dr. Divya	2025-07-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	61.3	\N	\N	\N	\N	\N	\N	\N	\N	8617770427	\N	\N	10/8/2024	156	\N	\N	f	\N
159	Susmita pal	0	active	Gynaecologist consultation Dr. Divya	2025-05-11	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	43.6	\N	\N	\N	\N	\N	\N	\N	\N	8372895348	\N	\N	1/28/2025	149	\N	\N	f	\N
160	Sakhi Bibi	0	active	Gynaecologist consultation Dr. Divya	2025-04-26	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9749201746	\N	\N	4/13/2025	\N	\N	\N	f	\N
162	Eshika Nandy	0	active	Gynaecologist consultation Dr. Divya	2025-04-26	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9832600140	\N	\N	2/13/2025	\N	\N	\N	f	\N
170	Sruti Singh	21	active	Gynaecologist consultation Dr. Divya	2025-05-03	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	48.3	\N	\N	\N	\N	\N	\N	\N	\N	8797304535	\N	\N	3/14/2025	153	\N	\N	f	\N
140	Cinderella	0	active	Gynaecologist consultation Dr. Divya	2025-05-03	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	85	\N	\N	\N	\N	\N	\N	\N	\N	8272966533	\N	\N	4/2/2025	162	\N	\N	f	\N
141	Sumedha Chakraborty	0	active	Gynaecologist consultation Dr. Divya	2025-04-03	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	6203137596	\N	\N	2/23/2025	\N	\N	\N	f	\N
171	Samima Sheikh	13	active	Gynaecologist consultation Dr. Divya	2025-05-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	69.4	\N	\N	\N	\N	\N	\N	\N	\N	7363866134	\N	\N	5/1/2025	154	\N	\N	f	\N
144	Minakshi Mandal	0	active	Gynaecologist consultation Dr. Divya	2025-04-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7980766577	\N	\N	2/22/2025	\N	\N	\N	f	\N
145	Payel Mandal	0	active	Gynaecologist consultation Dr. Divya	2025-04-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	700304013	\N	\N	\N	\N	110/80	\N	f	\N
146	Sabina Bibi	0	active	Gynaecologist consultation Dr. Divya	2025-04-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9382906246	\N	\N	\N	\N	\N	\N	f	\N
147	Shikha Saloni	0	active	Gynaecologist consultation Dr. Divya	2025-04-09	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7678620156	\N	\N	4/8/2025	\N	90/60	\N	f	\N
154	Hasiba Naz	0	active	Gynaecologist consultation Dr. Divya	2025-04-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7978186841	\N	\N	4/12/2025	\N	\N	\N	f	\N
157	Antara Mandal	0	active	Gynaecologist consultation Dr. Divya	2025-04-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9062844111	\N	\N	\N	\N	100/60	\N	f	\N
167	Hasina	24	active	Gynaecologist consultation Dr. Divya	2025-04-30	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	43.9	\N	\N	\N	\N	\N	\N	\N	\N	9051438032	\N	\N	\N	149	\N	\N	f	\N
197	Shweta Awasthii	40	active	Gynaecologist consultation Dr. Divya	2025-06-19	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	54.7	\N	\N	\N	\N	\N	\N	\N	\N	8159021022	\N	\N	\N	5.1	110/80	\N	f	\N
195	Jayashree Pradhan	31	active	Gynaecologist consultation Dr. Divya	2025-06-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	50.6	\N	\N	\N	\N	\N	\N	\N	\N	8777450587	\N	\N	5/18/2025	152	\N	\N	f	\N
211	Rohima Khatun	36	active	Gynaecologist consultation Dr. Divya	2025-07-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	69	\N	\N	\N	\N	\N	\N	\N	\N	7044184442	\N	\N	6/26/2025	156	\N	\N	f	\N
205	Dolly Satpathy	34	active	Gynaecologist consultation Dr. Divya	2025-09-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	55	\N	\N	\N	\N	\N	\N	\N	\N	7992412698	\N	\N	9/18/2025	162	115/70	\N	f	\N
178	Sweety Maity	25	active	Gynaecologist consultation Dr. Divya	2025-05-20	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	87.4	\N	\N	\N	\N	\N	\N	\N	\N	9051089795	\N	\N	\N	155.5	\N	\N	f	\N
221	Chandni Prasad	32	active	Gynaecologist consultation Dr. Divya	2025-12-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	67.2	\N	\N	\N	\N	\N	\N	\N	\N	9874528377	\N	\N	12/22/0025	144	120/70	\N	f	\N
194	Saida Khatun	25	active	Gynaecologist consultation Dr. Divya	2025-06-05	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	50	\N	\N	\N	\N	\N	\N	\N	\N	7865984018	\N	\N	\N	149	\N	\N	f	\N
200	Sampa Baidya	27	active	Gynaecologist consultation Dr. Divya	2025-06-25	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	40.2	\N	\N	\N	\N	\N	\N	\N	\N	9749016904	\N	\N	6/24/2025	148	\N	\N	f	\N
202	Dimple	28	active	Gynaecologist consultation Dr. Divya	2025-06-28	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	58.7	\N	\N	\N	\N	\N	\N	\N	\N	9813983210	\N	\N	12/18/2024	156	\N	\N	f	\N
183	Fuli Das	24	active	Gynaecologist consultation Dr. Divya	2025-05-28	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	42.9	\N	\N	\N	\N	\N	\N	\N	\N	9330520952	\N	\N	\N	148	\N	\N	f	\N
176	Semoli Mandal	32	active	Gynaecologist consultation Dr. Divya	2025-05-15	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	55.9	\N	\N	\N	\N	\N	\N	\N	\N	7001631483	\N	\N	\N	151	\N	\N	f	\N
204	Bindu	27	active	Gynaecologist consultation Dr. Divya	2025-10-10	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	62.5	\N	\N	\N	\N	\N	\N	\N	\N	7488098179	\N	\N	10/9/2025	151	120/80	\N	f	\N
223	Noorjahan Khatun	20	active	Gynaecologist consultation Dr. Divya	2025-10-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	63.3	\N	\N	\N	\N	\N	\N	\N	\N	7980022048	\N	\N	5/10/2025	158	120/70	\N	f	\N
185	Usha Mahato	32	active	Gynaecologist consultation Dr. Divya	2025-05-30	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	83.6	\N	\N	\N	\N	\N	\N	\N	\N	8582852477	\N	\N	1/24/2025	156	\N	\N	f	\N
222	Shrestha	33	active	Gynaecologist consultation Dr. Divya	2025-07-28	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	81	\N	\N	\N	\N	\N	\N	\N	\N	9654873364	\N	\N	7/17/2025	152	120/75	\N	f	\N
181	Najma Bibi	35	active	Gynaecologist consultation Dr. Divya	2025-12-04	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	62.9	\N	\N	\N	\N	\N	\N	\N	\N	9836229358	\N	\N	11/20/0025	149	130/80	\N	f	\N
203	Kanchan	0	active	Gynaecologist consultation Dr. Divya	2025-06-29	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	49	\N	\N	\N	\N	\N	\N	\N	\N	7903303683	\N	\N	6/27/2025	00	\N	\N	f	\N
198	Tamanna Parvin	20	active	Gynaecologist consultation Dr. Divya	2026-02-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	64.9	\N	\N	\N	\N	\N	\N	\N	\N	7450804486	\N	\N	10/19/0025	156	120/70	\N	f	\N
199	Juthika Sikhdar	28	active	Gynaecologist consultation Dr. Divya	2025-06-20	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	52.5	\N	\N	\N	\N	\N	\N	\N	\N	8100654525	\N	\N	\N	152	\N	\N	f	\N
190	Lipi Dey	29	active	Gynaecologist consultation Dr. Divya	2025-06-23	\N	\N	\N	\N	\N	\N	\N	\N	\N	PCOS	\N	52.5	\N	\N	\N	\N	\N	\N	\N	\N	9330955316	\N	\N	6/3/2025	158	\N	\N	f	\N
219	Anisha Parvin	23	active	Gynaecologist consultation Dr. Divya	2025-07-21	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	66.4	\N	\N	\N	\N	\N	\N	\N	\N	7980289787	\N	\N	\N	151	150/90	\N	f	\N
224	Akansha Bhojnagarwala	34	active	Gynaecologist consultation Dr. Divya	2025-07-28	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	82	\N	\N	\N	\N	\N	\N	\N	\N	8864927292	\N	\N	7/10/2025	160	130/90	\N	f	\N
179	Farhana bibi	28	active	Gynaecologist consultation Dr. Divya	2025-11-17	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	71.9	\N	\N	\N	\N	\N	\N	\N	\N	9874343961	\N	\N	5/11/2025	156	150/80	\N	f	\N
215	Soma Biswas	25	active	Gynaecologist consultation Dr. Divya	2025-07-10	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	54.5	\N	\N	\N	\N	\N	\N	\N	\N	9883346261	\N	\N	2/8/2025	143	\N	\N	f	\N
217	Asma Khatun	22	active	Gynaecologist consultation Dr. Divya	2025-07-11	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9382924712	\N	\N	\N	00	\N	\N	f	\N
218	Shreya Singh	23	active	Gynaecologist consultation Dr. Divya	2025-07-14	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	57	\N	\N	\N	\N	\N	\N	\N	\N	6288860622	\N	\N	5/21/2025	162	\N	\N	f	\N
184	Rojalin Dash	28	active	Gynaecologist consultation Dr. Divya	2025-05-29	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	68.9	\N	\N	\N	\N	\N	\N	\N	\N	9821270062	\N	\N	5/13/2025	161.5	\N	\N	f	\N
208	Sreyasri Mukherjee	34	active	Gynaecologist consultation Dr. Divya	2025-07-03	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	59	\N	\N	\N	\N	\N	\N	\N	\N	7003440956	\N	\N	6/4/2025	152	\N	\N	f	\N
177	Pragayi	30	active	Gynaecologist consultation Dr. Divya	2025-11-25	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	60.5	\N	\N	\N	\N	\N	\N	\N	\N	7991146405	\N	\N	10/31/2025	156	100/65	\N	f	\N
196	Sosowon	25	active	Gynaecologist consultation Dr. Divya	2025-06-16	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	56	\N	\N	\N	\N	\N	\N	\N	\N	6009593219	\N	\N	\N	146	\N	\N	f	\N
180	Alpona Mondal	42	active	Gynaecologist consultation Dr. Divya	2025-05-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	72	\N	\N	\N	\N	\N	\N	\N	\N	9064612156	\N	\N	\N	156	\N	\N	f	\N
187	Priyanka Sarkar	29	active	Gynaecologist consultation Dr. Divya	2025-12-17	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	67.2	\N	\N	\N	\N	\N	\N	\N	\N	7864949228	\N	\N	9/11/0025	150	140/90	\N	f	\N
188	Subhadra Chhetri	30	active	Gynaecologist consultation Dr. Divya	2025-06-01	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	52	\N	\N	\N	\N	\N	\N	\N	\N	8794855610	\N	\N	4/6/2025	152	\N	\N	f	\N
189	Sashanka Thrumuo	24	active	Gynaecologist consultation Dr. Divya	2025-06-01	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	68.6	\N	\N	\N	\N	\N	\N	\N	\N	7630802005	\N	\N	4/25/2025	150	\N	\N	f	\N
212	Isha Sen	23	active	Gynaecologist consultation Dr. Divya	2025-07-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	54.4	\N	\N	\N	\N	\N	\N	\N	\N	9123829842	\N	\N	6/25/2025	9123829842	\N	\N	f	\N
213	Ladli Parvin	31	active	Gynaecologist consultation Dr. Divya	2025-07-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	62	\N	\N	\N	\N	\N	\N	\N	\N	9066345894	\N	\N	6/30/2025	157	130/90	\N	f	\N
186	Debleena Karmakar	29	active	Gynaecologist consultation Dr. Divya	2025-05-30	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	67	\N	\N	\N	\N	\N	\N	\N	\N	7699798965	\N	\N	\N	158	\N	\N	f	\N
220	Marufa bibi	27	active	Gynaecologist consultation Dr. Divya	2025-07-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	50	\N	\N	\N	\N	\N	\N	\N	\N	6295861924	\N	\N	6/28/2025	140	110/70	\N	f	\N
201	Sruti	22	active	Gynaecologist consultation Dr. Divya	2025-06-28	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	69	\N	\N	\N	\N	\N	\N	\N	\N	8434684533	\N	\N	\N	156	\N	\N	f	\N
206	Dipika Kumari	22	active	Gynaecologist consultation Dr. Divya	2025-09-04	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	42.7	\N	\N	\N	\N	\N	\N	\N	\N	9241514465	\N	\N	4/26/2025	147	100/60	\N	f	\N
207	Kalpana Kumari	33	active	Gynaecologist consultation Dr. Divya	2025-07-03	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	65.5	\N	\N	\N	\N	\N	\N	\N	\N	9525042035	\N	\N	6/20/2025	159	\N	\N	f	\N
191	Barnali Mandal	26	active	Gynaecologist consultation Dr. Divya	2025-06-04	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	46.2	\N	\N	\N	\N	\N	\N	\N	\N	9330271399	\N	\N	3/16/2025	151	\N	\N	f	\N
192	Brihaspati Mondal	34	active	Gynaecologist consultation Dr. Divya	2025-06-05	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9836750195	\N	\N	\N	P0	\N	\N	f	\N
193	Priyanka Mandal	31	active	Gynaecologist consultation Dr. Divya	2025-06-05	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	43.2	\N	\N	\N	\N	\N	\N	\N	\N	7450889920	\N	\N	\N	156	\N	\N	f	\N
209	Runu Sen	34	active	Gynaecologist consultation Dr. Divya	2025-11-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	70.2	\N	\N	\N	\N	\N	\N	\N	\N	9731890291	\N	\N	9/26/2025	167	110/70	\N	f	\N
210	Sarbori chakraborti	2	active	Gynaecologist consultation Dr. Divya	2025-07-05	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	50.2	\N	\N	\N	\N	\N	\N	\N	\N	7477361879	\N	\N	5/25/2025	146	\N	\N	f	\N
241	Sneha Shome	30	active	Gynaecologist consultation Dr. Divya	2025-08-30	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	52.9	\N	\N	\N	\N	\N	\N	\N	\N	8119930990	\N	\N	8/22/2025	156	120/80	\N	f	\N
239	Karthika Ohalt	20	active	Gynaecologist consultation Dr. Divya	2025-08-26	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	55	\N	\N	\N	\N	\N	\N	\N	\N	947501116	\N	\N	7/15/2025	5.5	\N	\N	f	\N
234	Nargis Khatun	25	active	Gynaecologist consultation Dr. Divya	2025-12-13	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	57	\N	\N	\N	\N	\N	\N	\N	\N	9518347448	\N	\N	12/9/0025	166	11080	\N	f	\N
258	Ishita Pattanaik	33	active	Gynaecologist consultation Dr. Divya	2025-09-23	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	80	\N	\N	\N	\N	\N	\N	\N	\N	9748724705	\N	\N	\N	180	130/80	\N	f	\N
231	Shovna Samantaray	36	active	Gynaecologist consultation Dr. Divya	2025-08-08	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	76	\N	\N	\N	\N	\N	\N	\N	\N	8104684883	\N	\N	6/25/2025	154	130/90	\N	f	\N
242	Manisha Pal	29	active	Gynaecologist consultation Dr. Divya	2025-09-02	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	59.6	\N	\N	\N	\N	\N	\N	\N	\N	9800149728	\N	\N	7/5/2025	156	110/65	\N	f	\N
260	Rupali Khatun	22	active	Gynaecologist consultation Dr. Divya	2025-11-17	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	55.7	\N	\N	\N	\N	\N	\N	\N	\N	9735494964	\N	\N	8/8/2025	151	130/70	\N	f	\N
247	Astomi Buduk	18	active	Gynaecologist consultation Dr. Divya	2025-09-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	52	\N	\N	\N	\N	\N	\N	\N	\N	7679694103	\N	\N	7/11/2025	141	120/80	\N	f	\N
249	Tapoti mandal	43	active	Nutrition Subhra	2025-09-10	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	90	\N	\N	\N	\N	\N	\N	\N	\N	9836926133	\N	\N	\N	148	130/80	\N	f	\N
243	Dichen Bhutia	25	active	Gynaecologist consultation Dr. Divya	2025-09-02	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	50	\N	\N	\N	\N	\N	\N	\N	\N	7085114254	\N	\N	7/7/2025	148	115/75	\N	f	\N
265	Sarah shaw	24	active	Gynaecologist consultation Dr. Divya	2025-10-09	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	62.9	\N	\N	\N	\N	\N	\N	\N	\N	8910618573	\N	\N	10/1/2025	152	110/80	\N	f	\N
244	Darkshah Khatun	26	active	Gynaecologist consultation Dr. Divya	2025-09-04	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	77	\N	\N	\N	\N	\N	\N	\N	\N	9304528169	\N	\N	8/25/2025	148	105/60	\N	f	\N
245	Aleena sekh	11	active	Gynaecologist consultation Dr. Divya	2025-09-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	38.6	\N	\N	\N	\N	\N	\N	\N	\N	9547191851	\N	\N	\N	158	100/60	\N	f	\N
263	Priti Panday	33	active	Gynaecologist consultation Dr. Divya	2025-10-05	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	56.8	\N	\N	\N	\N	\N	\N	\N	\N	9566255747	\N	\N	10/1/2025	146	120/80	\N	f	\N
237	Nirupama Naskar	29	active	Gynaecologist consultation Dr. Divya	2025-08-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	58.3	\N	\N	\N	\N	\N	\N	\N	\N	9748968671	\N	\N	8/14/2025	156	138/98	\N	f	\N
257	Ankita Chandra	23	active	Gynaecologist consultation Dr. Divya	2025-10-03	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	56	\N	\N	\N	\N	\N	\N	\N	\N	9525522528	\N	\N	8/13/0025	152	130/85	\N	f	\N
229	Kakuli Mondal	37	active	Gynaecologist consultation Dr. Divya	2025-08-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	46	\N	\N	\N	\N	\N	\N	\N	\N	8250666762	\N	\N	7/10/2025	144	150/90	\N	f	\N
246	Pallabi Halder	25	active	Gynaecologist consultation Dr. Divya	2025-09-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	57	\N	\N	\N	\N	\N	\N	\N	\N	9123964046	\N	\N	7/2/2025	160	115/70	\N	f	\N
227	Anushka	24	active	Gynaecologist consultation Dr. Divya	2025-07-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	41	\N	\N	\N	\N	\N	\N	\N	\N	6207227931	\N	\N	7/6/2025	158	120/85	\N	f	\N
251	Sayanti Roy	27	active	Gynaecologist consultation Dr. Divya	2025-09-11	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	53.9	\N	\N	\N	\N	\N	\N	\N	\N	7004836820	\N	\N	\N	125/80	125/80	\N	f	\N
256	Ashima Naskar	46	active	Gynaecologist consultation Dr. Divya	2026-02-09	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	66.8	\N	\N	\N	\N	\N	\N	\N	\N	8910207970	\N	\N	11/7/0025	146	130/70	\N	f	\N
235	Muskan	18	active	Gynaecologist consultation Dr. Divya	2025-08-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	52	\N	\N	\N	\N	\N	\N	\N	\N	9051379160	\N	\N	8/4/2025	156	120/80	\N	f	\N
252	Reshma	25	active	Gynaecologist consultation Dr. Divya	2025-09-11	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	73	\N	\N	\N	\N	\N	\N	\N	\N	9674591525	\N	\N	8/29/2025	156	Reshma	\N	f	\N
214	Priyanka Deftary	36	active	Gynaecologist consultation Dr. Divya	2025-09-18	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	79	\N	\N	\N	\N	\N	\N	\N	\N	7232015962	\N	\N	8/9/0025	156	115/75	\N	f	\N
255	Shweta Gupta	26	active	Gynaecologist consultation Dr. Divya	2025-09-18	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	54.8	\N	\N	\N	\N	\N	\N	\N	\N	9122956442	\N	\N	6/25/0025	140	110/80	\N	f	\N
225	Yagomaya Mohapatra	28	active	Gynaecologist consultation Dr. Divya	2025-07-28	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	86	\N	\N	\N	\N	\N	\N	\N	\N	7978204752	\N	\N	6/17/2025	162	115/70	\N	f	\N
240	Ranjina Khatun	26	active	Gynaecologist consultation Dr. Divya	2026-02-09	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	60.3	\N	\N	\N	\N	\N	\N	\N	\N	9083053146	\N	\N	6/30/0025	145	120/80	\N	f	\N
228	Hildita Nandi	20	active	Gynaecologist consultation Dr. Divya	2025-08-02	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	55.4	\N	\N	\N	\N	\N	\N	\N	\N	8415093554	\N	\N	6/25/2025	155	120/80	\N	f	\N
266	Abhilipsha Sahoo	23	active	Gynaecologist consultation Dr. Divya	2025-10-09	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	47	\N	\N	\N	\N	\N	\N	\N	\N	7894347650	\N	\N	8/15/0025	143	120/70	\N	f	\N
238	Saharon Bibi	55	active	Gynaecologist consultation Dr. Divya	2025-08-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	61.3	\N	\N	\N	\N	\N	\N	\N	\N	8391047184	\N	\N	\N	147	130/75	\N	f	\N
259	Sushila	34	active	Gynaecologist consultation Dr. Divya	2025-09-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	68.1	\N	\N	\N	\N	\N	\N	\N	\N	8902754940	\N	\N	9/20/2025	152	115/70	\N	f	\N
264	Ankita sahu	29	active	Gynaecologist consultation Dr. Divya	2025-10-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	54.5	\N	\N	\N	\N	\N	\N	\N	\N	8910329811	\N	\N	8/19/0025	146	115/75	\N	f	\N
226	Utkalika Hota	31	active	Gynaecologist consultation Dr. Divya	2025-07-29	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	73.3	\N	\N	\N	\N	\N	\N	\N	\N	9108222825	\N	\N	\N	153	100/80	\N	f	\N
261	Sohana khatun	20	active	Gynaecologist consultation Dr. Divya	2026-02-09	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	87.1	\N	\N	\N	\N	\N	\N	\N	\N	8250711024	\N	\N	8/22/0025	156	120/80	\N	f	\N
262	Sneha Patwari	32	active	Gynaecologist consultation Dr. Divya	2025-10-03	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	49.9	\N	\N	\N	\N	\N	\N	\N	\N	9830568749	\N	\N	\N	162	110/70	\N	f	\N
230	Ruksad Parween	25	active	Gynaecologist consultation Dr. Divya	2025-12-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	60.7	\N	\N	\N	\N	\N	\N	\N	\N	8342039064	\N	\N	6/30/0025	157	130/80	\N	f	\N
253	Rawsana khatun bibi	33	active	Gynaecologist consultation Dr. Divya	2025-09-13	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	61.8	\N	\N	\N	\N	\N	\N	\N	\N	9933562076	\N	\N	9/13/0025	150	125/80	\N	f	\N
236	Sujata Ghosal	29	active	Gynaecologist consultation Dr. Divya	2025-08-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	37.6	\N	\N	\N	\N	\N	\N	\N	\N	7074557237	\N	\N	7/23/2025	137	120/75	\N	f	\N
232	Shimni Rongpharpi	20	active	Gynaecologist consultation Dr. Divya	2025-08-14	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	40.6	\N	\N	\N	\N	\N	\N	\N	\N	9854963596	\N	\N	8/4/2025	155	120/80	\N	f	\N
233	Jaide Khatoon	29	active	Gynaecologist consultation Dr. Divya	2025-08-15	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	61.5	\N	\N	\N	\N	\N	\N	\N	\N	8585928733	\N	\N	8/14/2025	150	125/80	\N	f	\N
248	Shalini Barman	32	active	Gynaecologist consultation Dr. Divya	2025-09-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	75	\N	\N	\N	\N	\N	\N	\N	\N	7678224330	\N	\N	8/4/2025	157	120/80	\N	f	\N
250	Rima Mandal	25	active	Gynaecologist consultation Dr. Divya	2025-09-10	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	76	\N	\N	\N	\N	\N	\N	\N	\N	9330127429	\N	\N	\N	147	120/80	\N	f	\N
254	Shibani sarkar	30	active	Gynaecologist consultation Dr. Divya	2025-09-13	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	42	\N	\N	\N	\N	\N	\N	\N	\N	9641867482	\N	\N	3/17/0025	142	110/60	\N	f	\N
302	Hrishita Debnath	28	active	Gynaecologist consultation Dr. Divya	2025-12-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	44	\N	\N	\N	\N	\N	\N	\N	\N	917908904358	\N	\N	9/7/2025	145	110/60	\N	f	\N
303	Manjulika Chakraborty	34	active	Gynaecologist consultation Dr. Divya	2025-12-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	61	\N	\N	\N	\N	\N	\N	\N	\N	917439349370	\N	\N	11/19/2025	156	120/70	\N	f	\N
272	Priyanka mondal	21	active	Gynaecologist consultation Dr. Divya	2025-10-18	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	53.7	\N	\N	\N	\N	\N	\N	\N	\N	9123011929	\N	\N	8/14/2025	153	120/80	\N	f	\N
307	Suraiya Yesmin	30	active	Gynaecologist consultation Dr. Divya	2025-12-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	PCOS	\N	56.6	\N	\N	\N	\N	\N	\N	\N	\N	9609708336	\N	\N	12/8/0025	153	120/70	\N	f	\N
296	Sathi Ghosh	18	active	Gynaecologist consultation Dr. Divya	2025-12-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	PCOS	\N	39.3	\N	\N	\N	\N	\N	\N	\N	\N	9564416261	\N	\N	11/16/0025	150	130/80	\N	f	\N
268	Tuhina Khatun	22	active	Gynaecologist consultation Dr. Divya	2025-10-10	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	40.7	\N	\N	\N	\N	\N	\N	\N	\N	9874630753	\N	\N	4/10/0025	147	120/75	\N	f	\N
280	Tayaba khatun	27	active	Gynaecologist consultation Dr. Divya	2025-11-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	76.1	\N	\N	\N	\N	\N	\N	\N	\N	9143917845	\N	\N	3/5/0025	162	120/80	\N	f	\N
182	Sundari Mandal	29	active	Gynaecologist consultation Dr. Divya	2025-12-26	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	63	\N	\N	\N	\N	\N	\N	\N	\N	9064768166	\N	\N	4/8/2025	144	150	\N	f	\N
285	Dr Anupama	37	active	Gynaecologist consultation Dr. Divya	2025-11-15	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	100.7	\N	\N	\N	\N	\N	\N	\N	\N	917007749299	\N	\N	4/16/2025	157	140/90	completed	f	\N
281	Khusboo Kumari	25	active	Gynaecologist consultation Dr. Divya	2025-11-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	38.4	\N	\N	\N	\N	\N	\N	\N	\N	7604005568	\N	\N	10/6/2025	142	120/80	\N	f	\N
304	Erika Dey	25	active	Gynaecologist consultation Dr. Divya	2025-12-23	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	70	\N	\N	\N	\N	\N	\N	\N	\N	918092144716	\N	\N	10/30/2025	156	120/70	\N	f	\N
286	Neha singh	31	active	Gynaecologist consultation Dr. Divya	2025-11-17	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	61.9	\N	\N	\N	\N	\N	\N	\N	\N	7903239186	\N	\N	\N	145	115/80	\N	f	\N
267	Priti Naskar	25	active	Gynaecologist consultation Dr. Divya	2025-11-17	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	50.2	\N	\N	\N	\N	\N	\N	\N	\N	919330068425	\N	\N	8/3/0025	149	120/80	\N	f	\N
306	Ayankita naskar	24	active	Gynaecologist consultation Dr. Divya	2026-02-05	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	51.4	\N	\N	\N	\N	\N	\N	\N	\N	7980885673	\N	\N	12/19/0025	149	120/70	\N	f	\N
298	Rubaina Khanam	26	active	Gynaecologist consultation Dr. Divya	2026-02-10	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	52.4	\N	\N	\N	\N	\N	\N	\N	\N	8100122301	\N	\N	7/16/0025	155	120/80	\N	f	\N
274	Koel Roy	21	active	Gynaecologist consultation Dr. Divya	2025-10-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	55.1	\N	\N	\N	\N	\N	\N	\N	\N	8910961291	\N	\N	10/11/2025	149	130/85	\N	f	\N
276	Sunanda Sardar	22	active	Gynaecologist consultation Dr. Divya	2025-10-25	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	62	\N	\N	\N	\N	\N	\N	\N	\N	9330674419	\N	\N	7/16/2025	156	115/70	\N	f	\N
288	Vaishali	22	active	Gynaecologist consultation Dr. Divya	2025-11-17	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	69.5	\N	\N	\N	\N	\N	\N	\N	\N	7626890462	\N	\N	\N	160	130/80	\N	f	\N
292	Sahnaz  sultana	31	active	Gynaecologist consultation Dr. Divya	2025-11-29	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	61.1	\N	\N	\N	\N	\N	\N	\N	\N	7003539091	\N	\N	11/24/0025	148	130/80	\N	f	\N
293	Babita kumari	30	active	Gynaecologist consultation Dr. Divya	2025-12-01	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	51.6	\N	\N	\N	\N	\N	\N	\N	\N	7542997234	\N	\N	11/15/0025	148	140/90	\N	f	\N
275	Fuljan Khatun	16	active	Gynaecologist consultation Dr. Divya	2025-10-25	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	32.8	\N	\N	\N	\N	\N	\N	\N	\N	8479025427	\N	\N	10/19/2025	1142	120/75	\N	f	\N
277	Khyati Bhartia	25	active	Gynaecologist consultation Dr. Divya	2025-11-01	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	52.2	\N	\N	\N	\N	\N	\N	\N	\N	9305998039	\N	\N	10/25/2025	156	110/75	\N	f	\N
295	Swati Singh	25	active	Gynaecologist consultation Dr. Divya	2025-12-26	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	59	\N	\N	\N	\N	\N	\N	\N	\N	9351126153	\N	\N	11/15/0025	156	120/80	\N	f	\N
311	Priti singh	23	active	Gynaecologist consultation Dr. Divya	2026-01-03	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	75.1	\N	\N	\N	\N	\N	\N	\N	\N	7384835157	\N	\N	9/7/0025	159	125/75	\N	f	\N
294	Soma Dolui	30	active	Gynaecologist consultation Dr. Divya	2026-02-15	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	54	\N	\N	\N	\N	\N	\N	\N	\N	8116382095	\N	\N	11/3/0025	139	110/70	\N	f	\N
278	Tania Naskar	27	active	Gynaecologist consultation Dr. Divya	2025-11-02	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	70.5	\N	\N	\N	\N	\N	\N	\N	\N	6296725151	\N	\N	\N	159	120/80	\N	f	\N
269	Antara Das	28	active	Gynaecologist consultation Dr. Divya	2025-10-11	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	53.9	\N	\N	\N	\N	\N	\N	\N	\N	7001050712	\N	\N	9/26/0025	145	125/75	\N	f	\N
289	Sathi Mandal	21	active	Gynaecologist consultation Dr. Divya	2025-04-18	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	55	\N	\N	\N	\N	\N	\N	\N	\N	9007702341	\N	\N	11/7/2024	147	125/80	\N	f	\N
279	Soumya Mohanty	30	active	Gynaecologist consultation Dr. Divya	2025-11-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	71	\N	\N	\N	\N	\N	\N	\N	\N	9875515706	\N	\N	8/28/2025	155	120/80	\N	f	\N
273	Rachayita Debnath	23	active	Gynaecologist consultation Dr. Divya	2026-02-04	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	60.2	\N	\N	\N	\N	\N	\N	\N	\N	8961414753	\N	\N	12/5/0025	151	120/70	\N	f	\N
270	Sonali Dhali	36	active	Gynaecologist consultation Dr. Divya	2025-10-13	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	56	\N	\N	\N	\N	\N	\N	\N	\N	6290743088	\N	\N	10/10/0025	145	130/90	\N	f	\N
305	Nisha ahlawal	36	active	Gynaecologist consultation Dr. Divya	2025-12-23	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	80	\N	\N	\N	\N	\N	\N	\N	\N	8630259708	\N	\N	11/10/0025	155	120/0	\N	f	\N
282	Moumita kar	34	active	Gynaecologist consultation Dr. Divya	2025-11-10	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	78.2	\N	\N	\N	\N	\N	\N	\N	\N	9739021391	\N	\N	5/13/0025	153	120/80	\N	f	\N
308	Shibani Mondal	25	active	Gynaecologist consultation Dr. Divya	2025-12-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	155	\N	\N	\N	\N	\N	\N	\N	\N	8420757590	\N	\N	12/2/0025	52.7	130/90	\N	f	\N
283	Juhi Yasmin	28	active	Gynaecologist consultation Dr. Divya	2025-11-15	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	61.6	\N	\N	\N	\N	\N	\N	\N	\N	919473037605	\N	\N	10/25/2025	155	120/75	\N	f	\N
299	Anushaya mukharjee	29	active	Gynaecologist consultation Dr. Divya	2025-12-13	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	74	\N	\N	\N	\N	\N	\N	\N	\N	8617304704	\N	\N	10/22/0025	144	110/80	\N	f	\N
300	Nisha Rani	28	active	Gynaecologist consultation Dr. Divya	2025-12-18	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	53	\N	\N	\N	\N	\N	\N	\N	\N	7864400763	\N	\N	12/6/0025	158	120/70	\N	f	\N
291	Ragni kumari	27	active	Gynaecologist consultation Dr. Divya	2025-11-28	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	60.2	\N	\N	\N	\N	\N	\N	\N	\N	7481917932	\N	\N	11/14/0025	152	140/30	\N	f	\N
309	Dhriti Moni Sharma	22	active	Gynaecologist consultation Dr. Divya	2026-01-02	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	42.9	\N	\N	\N	\N	\N	\N	\N	\N	8972335111	\N	\N	11/28/0025	143	120/70	\N	f	\N
271	Riyanka Luza	28	active	Gynaecologist consultation Dr. Divya	2025-11-17	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	61.9	\N	\N	\N	\N	\N	\N	\N	\N	918017779017	\N	\N	9/10/0025	153	120/80	\N	f	\N
48	Richa kumari	0	active	Gynaecologist consultation Dr. Divya	2025-04-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	63.5	\N	\N	\N	\N	\N	\N	\N	\N	7979011642	\N	\N	8/18/2024	162	100/60	\N	f	\N
332	Sahnaz Sultana	31	active	Gynaecologist consultation Dr. Divya	2025-07-10	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	58	\N	\N	\N	\N	\N	\N	\N	\N	700353909	\N	\N	\N	148	\N	\N	f	\N
324	Diya Mondal	23	active	Gynaecologist consultation Dr. Divya	2026-02-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	51.4	\N	\N	\N	\N	\N	\N	\N	\N	6295609739	\N	\N	1/18/0026	158	115/60	\N	f	\N
313	Sanjana Bishnu	32	active	Gynaecologist consultation Dr. Divya	2026-01-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	97	\N	\N	\N	\N	\N	\N	\N	\N	8754447715	\N	\N	12/12/0025	159	120/90	\N	f	\N
315	Nafisa Sultana	19	active	Gynaecologist consultation Dr. Divya	2026-01-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	56	\N	\N	\N	\N	\N	\N	\N	\N	6291151901	\N	\N	1/7/0026	165	120/70	\N	f	\N
325	Sonali Sarkar	28	active	Gynaecologist consultation Dr. Divya	2026-02-09	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	44.5	\N	\N	\N	\N	\N	\N	\N	\N	6297481977	\N	\N	1/29/0026	146	120/80	\N	f	\N
339	Sai Dibyadarshini Bhuyan	0	active	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
340	Shivani Sarma	0	active	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
341	Arpita Naskar	0	active	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
342	Tapali Mondal	0	active	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
316	Beauty Majumder	19	active	Gynaecologist consultation Dr. Divya	2026-01-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	73.3	\N	\N	\N	\N	\N	\N	\N	\N	9804757064	\N	\N	12/27/0025	156	120/80	\N	f	\N
327	Suman Karfa	19	active	Gynaecologist consultation Dr. Divya	2026-02-09	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	62.7	\N	\N	\N	\N	\N	\N	\N	\N	9614692321	\N	\N	1/16/0026	154	115/80	\N	f	\N
317	Karima Khatun	20	active	Gynaecologist consultation Dr. Divya	2026-01-09	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	51.7	\N	\N	\N	\N	\N	\N	\N	\N	6291354368	\N	\N	5/30/0025	156	120/70	\N	f	\N
338	Manjulika	34	active	Gynaecologist consultation Dr. Divya	2026-01-10	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	61	\N	\N	\N	\N	\N	\N	\N	\N	7439329370	\N	\N	11/19/0025	156	120/70	\N	f	\N
328	S Bhulaxmi	0	active	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
314	Anjali kumari	27	active	Gynaecologist consultation Dr. Divya	2026-02-15	\N	\N	pregnancy	\N	\N	\N	\N	\N	\N	Others	\N	48.9	\N	\N	\N	\N	\N	2026-03-11	\N	Pregnancy - First Trimester	8434433528	\N	\N	1/5/0026	158	120/80	\N	f	\N
343	Munmun Mondal	0	active	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
138	Basanti Sarkar	0	active	Gynaecologist consultation Dr. Divya	2025-08-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	51.7	\N	\N	\N	\N	\N	\N	\N	\N	9330198813	\N	\N	7/6/2025	147	115/75	\N	f	\N
345	Mrs. Surbhi Sukla	0	active	Gynaecologist consultation Dr. Divya	2024-10-04	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8149279228	\N	\N	\N	\N	\N	\N	f	\N
331	Juhi Yasmeen	0	active	Gynaecologist consultation Dr. Divya	2025-10-09	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	60.5	\N	\N	\N	\N	\N	\N	\N	\N	9473037605	\N	\N	9/26/2025	150	115/80	\N	f	\N
326	Pratima Talukdar	0	active	Gynaecologist consultation Dr. Divya	2025-04-18	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8420049574	\N	\N	6/3/25	\N	\N	\N	f	\N
333	Ruksad parveen	25	active	Gynaecologist consultation Dr. Divya	2025-11-17	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	59.1	\N	\N	\N	\N	\N	\N	\N	\N	917305639064	\N	\N	6/30/2025	157	115/70	\N	f	\N
334	Pritika Mondal	21	active	Gynaecologist consultation Dr. Divya	2025-11-14	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	52.9	\N	\N	\N	\N	\N	\N	\N	\N	916289482889	\N	\N	9/4/0025	151	120/80	\N	f	\N
24	Pratibha Sharma	0	active	Gynaecologist consultation Dr. Divya	2024-11-25	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	83.6	\N	\N	\N	\N	\N	\N	\N	\N	9953489028	\N	\N	\N	159 cm	130/80	\N	f	\N
319	Supriya Mondal	30	active	Gynaecologist consultation Dr. Divya	2026-01-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	66.7	\N	\N	\N	\N	\N	\N	\N	\N	9883175516	\N	\N	11/25/0025	155	120/80	\N	f	\N
320	Proggya Chaudhari	27	active	Gynaecologist consultation Dr. Divya	2026-02-04	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	63.5	\N	\N	\N	\N	\N	\N	\N	\N	7439903351	\N	\N	5/31/0025	159	130/80	\N	f	\N
290	Momi Morang	24	active	Gynaecologist consultation Dr. Divya	2025-11-20	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	156	\N	\N	\N	\N	\N	\N	\N	\N	9954323490	\N	\N	10/11/0025	55.1	110/70	\N	f	\N
344	Anasuya Das	0	active	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
335	Erika De	25	active	Gynaecologist consultation Dr. Divya	2025-12-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	701	\N	\N	\N	\N	\N	\N	\N	\N	8092144716	\N	\N	10/30/0025	156	130/80	\N	f	\N
336	Hishita Debnath	28	active	Gynaecologist consultation Dr. Divya	2025-12-20	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	44	\N	\N	\N	\N	\N	\N	\N	\N	7908904358	\N	\N	9/7/0025	145	110/70	\N	f	\N
321	Rimika Roy	25	active	Gynaecologist consultation Dr. Divya	2026-02-04	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	60	\N	\N	\N	\N	\N	\N	\N	\N	8617046536	\N	\N	12/23/0025	153	130/80	\N	f	\N
329	Shurbhi Shukla	0	active	Gynaecologist consultation Dr. Divya	2025-01-02	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	65	\N	\N	\N	\N	\N	\N	\N	\N	6396112708	\N	\N	1/24/2024	164	95/60	\N	f	\N
322	Tania Parvin	20	active	Gynaecologist consultation Dr. Divya	2026-02-06	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	46	\N	\N	\N	\N	\N	\N	\N	\N	6291688031	\N	\N	10/21/0025	151	120/70	\N	f	\N
330	Shampa Badiya	0	active	Gynaecologist consultation Dr. Divya	2025-02-14	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7980874132	\N	\N	\N	\N	130/80	\N	f	\N
323	Sanjura khatun	26	active	Gynaecologist consultation Dr. Divya	2026-02-07	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	66	\N	\N	\N	\N	\N	\N	\N	\N	8637324337	\N	\N	7/13/0025	151	130/70	\N	f	\N
337	Noorjahan bibi	20	active	Gynaecologist consultation Dr. Divya	2026-01-03	\N	\N	\N	\N	\N	\N	\N	\N	\N	Pregnant	\N	69.3	\N	\N	\N	\N	\N	\N	\N	\N	7980011048	\N	\N	5/10/0025	159	130/90	\N	f	\N
312	Shibani Sharma	20	active	Gynaecologist consultation Dr. Divya	2026-01-04	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	50.9	\N	\N	\N	\N	\N	\N	\N	\N	9599136283	\N	\N	11/15/0025	157	120/80	\N	f	\N
1	Ananya S.	29	High Risk	Natural Conception	2 days ago	14	AS	natural_conception	Dr. Sharma (GP)	Nutritionist	Up to Date	Private (Gold)	None (TTC)	{"drug": ["Metformin 500mg", "Levothyroxine 50mcg", "Multivitamin"], "medical": ["PCOS (diagnosed 2018)", "Hypothyroidism", "Mild Asthma"], "surgical": ["Appendectomy (2015)"], "allergies": ["Penicillin", "Peanuts"]}	Fertility	Anxious	68	11.2	{"comt": {"risk": "Medium", "status": "Met/Met (Worrier)"}, "mthfr": {"risk": "Medium", "status": "Heterozygous"}, "gluten": {"risk": "High", "status": "HLA-DQ2 Positive"}, "caffeine": {"risk": "High", "status": "Slow Metabolizer"}}	{"gut": {"score": 45, "status": "Dysbiosis"}, "hormone": {"focus": "Estrogen Dominance", "status": "Imbalanced"}, "nutrient": {"status": "Critical", "deficiency": "Vitamin D, Magnesium"}, "inflammation": {"value": "3.2", "marker": "hs-CRP", "status": "Elevated"}}	{"protocol": "Supplement Protocol (Active)", "dietPhase": "Elimination Diet (Week 2)"}	Anti-inflammatory, Gluten-Free	2 days	Referral: Dr. Reynolds. Patient struggles with insulin resistance. Focus on fiber intake and low glycemic load.	PCOS (Insulin Resistant)	\N	\N	\N	\N	\N	\N	\N	f	\N
6	Zara M.	31	Stable	Pregnancy Wk 20	2 weeks ago	\N	ZM	pregnancy	Self	-	Up to Date	Corporate	N/A	\N	Pregnant	Stable	64	11.5	{"comt": {"risk": "Low", "status": "Val/Met (Balanced)"}, "mthfr": {"risk": "Medium", "status": "Heterozygous"}, "gluten": {"risk": "Low", "status": "Negative"}, "caffeine": {"risk": "Low", "status": "Fast Metabolizer"}}	{"gut": {"score": 90, "status": "Good"}, "hormone": {"focus": "Thyroid Support", "status": "Stable"}, "nutrient": {"status": "Mild", "deficiency": "Iron"}, "inflammation": {"value": "0.8", "marker": "hs-CRP", "status": "Optimal"}}	{"protocol": "Prenatal Support", "dietPhase": "Maintenance (T2)"}	Prenatal Wellness, Iron-Rich	2 weeks	Routine prenatal care (Week 20). Focus on iron-rich foods and adequate protein for fetal growth. Monitor energy levels.	Pregnancy (Trimester 2)	\N	\N	\N	\N	\N	\N	\N	f	\N
346	Dipa Mondal	18	active	Gynaecologist consultation Dr. Divya	2026-02-12	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	67	\N	\N	\N	\N	\N	\N	\N	\N	6291174781	\N	\N	1/5/0026	154	130/80	\N	f	\N
347	Anuska Chakraborty	21	active	Gynaecologist consultation Dr. Divya	2026-02-13	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	47.4	\N	\N	\N	\N	\N	\N	\N	\N	9002642345	\N	\N	2/13/0026	152	120/80	\N	f	\N
349	Deeptara pradip sarkar	26	active	Gynaecologist consultation Dr. Divya	2026-02-15	\N	\N	\N	\N	\N	\N	\N	\N	\N	PCOS	\N	89.3	\N	\N	\N	\N	\N	\N	\N	\N	7021381374	\N	\N	1/28/0026	151	130/70	\N	f	\N
350	Sabnam Yasmin	25	active	Gynaecologist consultation Dr. Divya	2026-02-15	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	54.5	\N	\N	\N	\N	\N	\N	\N	\N	8327333180	\N	\N	2/12/0026	159	120/70	\N	f	\N
351	Kritika Gulati	36	active	Gynaecologist consultation Dr. Divya	2026-02-15	\N	\N	\N	\N	\N	\N	\N	\N	\N	Others	\N	91.6	\N	\N	\N	\N	\N	\N	\N	\N	7988099421	\N	\N	1/1/0026	153	140/80	\N	f	\N
\.


--
-- Data for Name: pregnancy_metrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pregnancy_metrics (id, patient_id, week, weight, expected, systolic, diastolic) FROM stdin;
1	2	12	60	61	110	70
2	2	16	62	63	112	72
3	2	20	65	65	115	74
4	2	24	68	68	122	82
5	2	28	71	71	120	80
6	2	32	74	74	122	81
7	314	6	52	52	110	70
8	314	8	52.5	52.5	112	72
9	314	10	53.2	53	110	70
10	314	12	54	53.8	114	74
11	314	14	55.1	54.5	112	72
12	314	16	56.3	55.5	116	76
13	314	18	57.8	56.8	118	74
14	314	20	59	58	120	78
15	314	22	60.5	59.5	118	76
\.


--
-- Data for Name: providers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.providers (id, name, role, availability, specialty, qualification, reg_number, reg_council, reg_year, additional_qualifications, clinic_name, clinic_address, clinic_phone, clinic_timing) FROM stdin;
1	Dr. Reynolds	Reproductive Specialist	High	Reproductive Specialist	\N	\N	\N	\N	\N	\N	\N	\N	\N
2	Ms. Gupta	Nutritionist	Medium	Nutritionist	\N	\N	\N	\N	\N	\N	\N	\N	\N
3	Dr. Chen	Endocrinologist	Low	Endocrinologist	\N	\N	\N	\N	\N	\N	\N	\N	\N
4	Dr. Sai Dibyadarshini Bhuyan	Gynaecologist	High	Gynaecologist	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: referrals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.referrals (id, patient_id, referred_by_provider_id, referred_to_provider_id, referred_to_external, date, reason, urgency, status, notes, outcome) FROM stdin;
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.services (id, service_id, name, duration, price) FROM stdin;
1	consult	Initial Consultation	60 min	$200
2	followup	Follow-up Review	30 min	$100
3	scan	Ultrasound Scan	45 min	$150
4	lab	Blood Work	15 min	$50
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password, role) FROM stdin;
3b53c271-852f-4864-a235-45b72fbc5008	dr.priya	1234	clinician
93ad0b6f-16a1-4478-b103-03c72d290195	dr.ramesh	5678	clinician
7cb89b19-f570-479f-a2af-3c02491e5633	staff.reception	0000	staff
9455ae93-e0b3-44d4-b184-cb0450a49326	staff.nurse	1111	staff
c64b887e-949a-42ec-8359-eb5e19c8df83	staff.nutritionist	2222	staff
d5c3b3cb-a6e0-4a37-8e2d-f1bf9673d8f9	dr.sai	2024	clinician
35fa52e3-8899-4163-9b5f-90bcedbf76a2	owner	9999	owner
\.


--
-- Data for Name: usg_data; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usg_data (id, patient_id, week, hc, ac, fl) FROM stdin;
1	2	12	60	55	8
2	2	16	110	100	20
3	2	20	180	160	32
4	2	24	220	200	43
5	2	28	260	240	52
6	314	12	70	56	8
7	314	14	95	78	14
8	314	16	120	102	20
9	314	18	150	128	27
10	314	20	175	152	33
11	314	22	198	175	38
\.


--
-- Data for Name: visit_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.visit_history (id, patient_id, appointment_id, provider_id, date, visit_type, chief_complaint, diagnosis, vitals, examination, subjective, objective, assessment, plan_notes, prescriptions, procedures, labs_ordered, follow_up_plan, outcome) FROM stdin;
1	1	\N	1	2026-01-15	Initial Consultation	Difficulty conceiving for 14 months	PCOS with insulin resistance; Hypothyroidism	{"bp": "124/80", "bmi": 25.1, "temp": 36.5, "pulse": 76, "weight": 69}	\N	Patient reports irregular cycles (35-45 days), weight gain, acne flare-ups. Trying to conceive since Dec 2024. History of PCOS diagnosed 2018.	BMI 25.1, mild hirsutism Ferriman-Gallwey score 10, acanthosis nigricans noted on neck.	PCOS with anovulatory cycles. Insulin resistance likely contributing. Hypothyroidism controlled on current dose.	Start Metformin 500mg, increase to 1000mg. Continue Levothyroxine. Refer to nutritionist. Order baseline hormones and AMH.	[{"dose": "500mg", "name": "Metformin", "frequency": "BD"}, {"dose": "50mcg", "name": "Levothyroxine", "frequency": "OD"}]	[{"name": "Pelvic ultrasound", "finding": "Bilateral polycystic ovaries, 12+ follicles each side"}]	[{"test": "AMH", "unit": "ng/mL", "result": 6.8}, {"test": "TSH", "unit": "mIU/L", "result": 3.1}, {"test": "Fasting Insulin", "unit": "µU/mL", "result": 18}]	Review in 4 weeks with hormone results	Ongoing
2	1	\N	1	2026-02-07	Follow-up	Cycle tracking review - Day 12	Ovulatory monitoring	{"bp": "118/76", "bmi": 24.7, "temp": 36.6, "pulse": 72, "weight": 68}	\N	Patient tolerating Metformin well. Less bloating. Started gluten-free diet per nutritionist. Mood improved.	Weight down 1kg. Follicle scan: dominant follicle 16mm left ovary. Endometrium 8mm trilaminar.	Responding well to treatment. Approaching ovulation. Good follicular development.	Continue current medications. Timed intercourse Day 14-16. Progesterone support post-ovulation.	[{"dose": "1000mg", "name": "Metformin", "frequency": "BD"}, {"dose": "200mg", "name": "Progesterone", "frequency": "HS from Day 16"}]	[{"name": "Follicular scan", "finding": "Dominant follicle 16mm left ovary, endometrium 8mm"}]	[{"test": "Serum Progesterone", "scheduled": "Day 21"}]	Day 21 progesterone check, follow-up in 2 weeks	Ongoing
3	2	\N	1	2025-11-10	Initial Consultation	Pregnancy confirmation and booking visit	Intrauterine pregnancy 8 weeks	{"bp": "110/70", "temp": 36.4, "pulse": 78, "weight": 64}	\N	Patient reports positive home pregnancy test. LMP 15 Sep 2025. Mild nausea. Previous C-section 2020.	Uterus corresponds to 8 weeks. FHR detected on scan 160bpm. Single viable intrauterine pregnancy.	Early pregnancy progressing normally. Previous C-section noted - monitor for placenta previa. GDM history from previous pregnancy.	Start prenatal vitamins. Book NT scan at 12 weeks. OGTT at 24 weeks. Monitor BP closely.	[{"dose": "1 tab", "name": "Prenatal Multivitamin", "frequency": "OD"}, {"dose": "5mg", "name": "Folic Acid", "frequency": "OD"}]	[{"name": "Dating scan", "finding": "Single live IUP, CRL 16mm, FHR 160bpm, EDD 22 Jun 2026"}]	[{"test": "CBC", "result": "Hb 11.5"}, {"test": "Blood Group", "result": "B+ve"}, {"test": "TSH", "result": 2.4}]	NT scan at 12 weeks	Ongoing
4	2	\N	1	2026-01-12	Follow-up	Antenatal check - Week 20	Normal pregnancy progress, GDM screening due	{"bp": "115/74", "temp": 36.5, "pulse": 80, "weight": 67, "fundal_height": "20cm"}	\N	Feeling well. Baby movements felt from Week 18. Appetite increased. Occasional heartburn.	Fundal height 20cm appropriate for dates. FHR 148bpm. No oedema. Anomaly scan normal.	Pregnancy progressing well at 20 weeks. Anatomy scan normal. Weight gain on track. GDM screening to be done at 24 weeks.	Continue prenatal supplements. Add iron supplement. Schedule OGTT at 24 weeks.	[{"dose": "200mg", "name": "Iron Supplement", "frequency": "OD"}, {"dose": "500mg", "name": "Calcium", "frequency": "BD"}]	[{"name": "Anomaly scan", "finding": "Normal fetal anatomy, anterior placenta, AFI adequate"}]	[{"test": "Hb", "unit": "g/dL", "result": 10.8}, {"test": "Urine culture", "result": "No growth"}]	OGTT at 24 weeks, next visit in 4 weeks	Ongoing
5	3	\N	1	2025-12-28	Delivery	Admitted for delivery at 39 weeks	Normal vaginal delivery with episiotomy	{"bp": "130/85", "temp": 36.8, "pulse": 88, "weight": 72}	\N	Patient in active labour. Contractions every 3 minutes. Membranes intact.	Cervix 6cm dilated, fully effaced. Vertex presentation. FHR 142bpm reactive.	Active labour, progressing well. BP slightly elevated - monitor closely.	Proceed with vaginal delivery. Episiotomy performed. Baby delivered healthy.	[{"dose": "10 IU", "name": "Oxytocin", "frequency": "IM post delivery"}]	[{"name": "Episiotomy", "finding": "Mediolateral, sutured with Vicryl"}, {"name": "Delivery", "finding": "Live female infant, 3.2kg, Apgar 9/10"}]	[{"test": "Post-delivery Hb", "unit": "g/dL", "result": 10.2}]	Postpartum review at 6 weeks	Completed
6	3	\N	1	2026-01-20	Follow-up	Postpartum check - Week 3	Postpartum recovery, mild depression symptoms	{"bp": "118/76", "temp": 36.4, "pulse": 70, "weight": 67}	\N	Breastfeeding established but struggling with sleep. Feeling tearful and anxious. Episiotomy healing well.	Episiotomy wound healed. Uterus well involuted. EPDS score 12 (mild depression).	Postpartum recovery progressing. Mild postpartum depression identified. Wound healing satisfactory.	Start Sertraline 50mg. Vitamin D supplementation. Refer to psychologist. Support breastfeeding.	[{"dose": "50mg", "name": "Sertraline", "frequency": "OD"}, {"dose": "2000 IU", "name": "Vitamin D", "frequency": "OD"}]	\N	[{"test": "Hb", "unit": "g/dL", "result": 11.5}, {"test": "Thyroid", "result": "Normal"}]	Review in 3 weeks, psychologist appointment booked	Ongoing
7	5	\N	2	2026-01-28	Initial Consultation	PCOS management and weight loss	PCOS with hormonal imbalance	{"bp": "120/78", "bmi": 29.4, "temp": 36.5, "pulse": 74, "weight": 80}	\N	Patient referred by dermatologist for acne and irregular periods. Cycles every 40-60 days. Struggling with weight.	BMI 29.4. Mild acne on chin and jawline. No hirsutism. Thyroid not enlarged.	PCOS likely. Need hormonal workup to confirm. Lifestyle modification primary intervention.	Order hormone panel. Start dietary intervention. Exercise plan. Review in 2 weeks with results.	[{"dose": "Yasmin", "name": "Oral Contraceptive", "frequency": "OD"}]	\N	[{"test": "Testosterone", "unit": "ng/dL", "result": 68}, {"test": "DHEA-S", "unit": "µg/dL", "result": 320}, {"test": "Fasting Glucose", "unit": "mg/dL", "result": 95}]	Review with hormone results in 2 weeks	Ongoing
8	165	\N	\N	2025-04-28	Consultation	Unable to conceive, trying since 2023 Dec. Married since 2016 Jan. Was on barrier contraception. MH: 06/03/25. Spotting -> 21st April. UPT negative 3 days ago.	K/H/O hypothyroid c/n	\N	{"findings": "O/E: It CIAC, Doing well."}	Unable to conceive, trying since 2023 Dec. Married since 2016 Jan. Was on barrier contraception. MH: 06/03/25. Spotting -> 21st April. UPT negative 3 days ago.	O/E: It CIAC, Doing well.	K/H/O hypothyroid c/n	Just Continue with exercise / Diet	[{"name": "Thyronorm", "dosage": "370.5 mcg", "duration": "Continue", "frequency": "OD", "instructions": null}, {"name": "T. Folvit/macfolate", "dosage": null, "duration": "Continue", "frequency": "OD", "instructions": null}]	\N	[{"date": "2024-08-24", "name": "Sr. AmH", "result": "1.3023"}, {"date": "2024-08-24", "name": "TSH", "result": "2.510"}, {"date": "2025-03-29", "name": "HPLC", "result": "wm"}, {"date": "2024-09-06", "name": "HSG", "result": null}, {"date": "2024-09-06", "name": "Semen Analysis Parameters", "result": "TSC=120, Motility=70%, Progressive=50%"}, {"date": null, "name": "USG I/A Pelvis", "result": null}]	To see on Thursday evening.	Prescription uploaded via document scan
9	165	\N	\N	2025-04-28	Consultation	Unable to conceive, trying since December 2023. Married since January 2016. Was on barrier contraception. LMP: 2025-03-06. Spotting from April 21st.	K/C/O Hypothyroidism	\N	{"findings": "O/E: Clinically well (interpreted from 'It CIAC Diey well')"}	Unable to conceive, trying since December 2023. Married since January 2016. Was on barrier contraception. LMP: 2025-03-06. Spotting from April 21st.	O/E: Clinically well (interpreted from 'It CIAC Diey well')	K/C/O Hypothyroidism	Just continue with exercise/diet	[{"name": "Thyronorm", "dosage": "37.5mcg", "duration": null, "frequency": "OD", "instructions": null}, {"name": "T. Folvit / Macfolate", "dosage": null, "duration": "Continue", "frequency": "OD", "instructions": null}]	\N	[{"date": "3 days ago", "name": "UPT", "result": "negative"}, {"date": "2024-08-24", "name": "Sr. AMH", "result": "1.30 ng/mL (interpreted from 1.30.23)"}, {"date": null, "name": "TSH", "result": "2.510"}, {"date": "29/3", "name": "HPLC", "result": null}, {"date": "2024-09-06", "name": "HSG", "result": null}, {"date": "2024-09-06", "name": "Semen Analysis", "result": "TSC=120, Motility (M)=70%, Progressive=50%"}]	To see on Thursday evening	Prescription uploaded via document scan
10	165	\N	\N	2025-12-08	Consultation	\N	\N	\N	{"findings": "LMP = 27 | 11/25 (Last Menstrual Period: November 25th, cycle Day 27)"}	\N	LMP = 27 | 11/25 (Last Menstrual Period: November 25th, cycle Day 27)	\N	Nutritional Counselling; Exercise/Yoga/Swimming; To lose 5 kg in next 2 months (at least); Folliculometry on Day 10, Day 12/Day 14; If Dominant Follicle > 18 mm, Inj HUCOG 10,000 IU IM single dose	[{"name": "T. Letrozole", "dosage": "2.5 mg", "duration": "D3 - D7", "frequency": "OD", "instructions": "From Day 3 to Day 7 of cycle"}, {"name": "T. Folvit", "dosage": "", "duration": "", "frequency": "", "instructions": ""}, {"name": "Macfolate", "dosage": "", "duration": "", "frequency": "", "instructions": ""}, {"name": "Inj HUCOG", "dosage": "10,000 IU", "duration": "Single dose", "frequency": "Single dose", "instructions": "If Dominant Follicle > 18 mm"}, {"name": "T. Duphaston", "dosage": "10 mg", "duration": "D16 - D25", "frequency": "", "instructions": "From Day 16 to Day 25 of cycle"}]	\N	[{"date": "2025-12-08", "name": "FSH", "result": "7.014"}, {"date": "2025-12-08", "name": "LH", "result": "5.93"}, {"date": "2025-12-08", "name": "AMH", "result": "5.050"}, {"date": "2025-12-08", "name": "TSH", "result": "1.005"}, {"date": "2025-12-08", "name": "FT4", "result": "1.12"}, {"date": "2025-12-08", "name": "HSG", "result": "left cornual block, Right tube patent & Spillage of Contrast into Peritoneal cavity"}, {"date": "2024-09-06", "name": "Semen Analysis (HSA)", "result": "TSC = 120 million/m, Normal Forms = 70%, Rapid Progression = 50, Total motile = 75, Vitality = 75"}, {"date": "D10, D12/D14", "name": "Folliculometry", "result": null}]	To Review & repeat tests	Prescription uploaded via document scan
11	165	\N	\N	2026-02-14	Scan/USG	\N	\N	\N	\N	\N	\N	\N	Date to be confirmed	\N	\N	\N	\N	Prescription uploaded via document scan
12	11	\N	\N	2026-01-21	Scan/USG	\N	\N	\N	{"edd": null, "findings": [{"organ": "Uterus", "status": "Normal", "description": "Anteverted & normal in size with normal outline and echotexture. The endometrium is central and normal. The uterine cavity is empty. No focal myometrial SOL is seen.", "measurement": "8.0 x 3.3 x 4.3 cm"}, {"organ": "Endometrium", "status": "Normal", "description": "Central and normal.", "measurement": null}, {"organ": "Cervix", "status": "Normal", "description": "Normal (2.7 cm).", "measurement": "2.7 cm"}, {"organ": "Cervix (Nabothian Cyst)", "status": "Abnormal", "description": "A nabothian cyst seen in cervix.", "measurement": "9.6 x 7.0 mm"}, {"organ": "Ovaries (General)", "status": "Abnormal", "description": "Both ovaries are bulky in size. Both ovaries show peripherally arranged follicles and echogenic stroma.", "measurement": null}, {"organ": "Right Ovary", "status": "Notable", "description": "Size: 3.3 x 2.5 x 2.3 cm. Volume: 15 cc.", "measurement": "3.3 x 2.5 x 2.3 cm (Volume: 15 cc)"}, {"organ": "Left Ovary", "status": "Notable", "description": "Size: 3.3 x 2.7 x 3.7 cm. Volume: 17 cc.", "measurement": "3.3 x 2.7 x 3.7 cm (Volume: 17 cc)"}], "follicles": [{"side": "Right", "size": "17 x 13 mm", "count": null}, {"side": "Left", "size": null, "count": null}], "impression": null, "reportType": "USG-FOLLICULARMETRY", "gestationalAge": null, "fetalParameters": {"ac": null, "fl": null, "hc": null, "afi": null, "bpd": null, "crl": null, "efw": null, "doppler": null, "placenta": null, "heartRate": null, "presentation": null}, "endometrialThickness": "8.1 mm"}	\N	SP\nDIAGNOSTICS\nBarcode\n: US003243\nCollected on\n: 20/Jan/2026 07:22PM\nPatient Name\n: Mrs. SUDECHCHHA BASU\nReceived on\n: 20/Jan/2026 07:22PM\nPatient ID\n: 042601200025\nReported on\n: 21/Jan/2026 06:42PM\nAge/Gender\n: 35 Y 2 D/Female\nSample Source\nReferred BY\n: Dr. SAI DIBYADARSHINI BHUYAN\nReport Status\n: Dr. DIBYADARSHINI BHUYAN\n: Final\nPatient's Address\n: KOLKATA\nNATIONALITY\n: INDIAN\nUSG\nUTERUS\n:\nUSG-FOLLICULARMETRY PER DAYS\nIt is anteverted & normal in size (8.0 x 3.3 x 4.3 cm) with normal outline 	\N	\N	\N	\N	\N	\N	USG/Scan uploaded via document scan
13	165	\N	\N	2026-02-14	Scan/USG	\N	\N	\N	{}	\N	{\n  "doctorName": "Dr. Sayantan Roy",\n  "patientName": "Mrs. SUDECHCHHA BASU",\n  "date": "2026-01-20",\n  "reportType": "USG-Folliculometry",\n  "gestationalAge": null,\n  "edd": null,\n  "findings": [\n    {\n      "organ": "Uterus",\n      "measurement": "8.0 x 3.3 x 4.3 cm",\n      "description": "Anteverted & normal in size with normal outline and echotexture. The endometrium is central and normal. The uterine cavity is empty. No focal myometrial SOL is seen.",\n      "status": "Normal"\n    ,},\n    {	\N	Date to be confirmed	\N	\N	\N	\N	USG/Scan uploaded via document scan
\.


--
-- Data for Name: workouts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workouts (id, name, phase, intensity) FROM stdin;
1	Follicular Yoga	Follicular	Low
2	Luteal Strength	Luteal	Medium
3	Trimester 2 Flow	Pregnancy	Low
\.


--
-- Name: appointments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.appointments_id_seq', 462, true);


--
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attendance_id_seq', 30, true);


--
-- Name: billing_catalog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.billing_catalog_id_seq', 30, true);


--
-- Name: clinical_notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clinical_notes_id_seq', 8, true);


--
-- Name: consent_forms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.consent_forms_id_seq', 1, false);


--
-- Name: conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.conversations_id_seq', 1, false);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.documents_id_seq', 50, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expenses_id_seq', 20, true);


--
-- Name: follicle_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.follicle_data_id_seq', 4, true);


--
-- Name: follow_up_calls_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.follow_up_calls_id_seq', 263, true);


--
-- Name: hormone_readings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.hormone_readings_id_seq', 8, true);


--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.invoices_id_seq', 3, true);


--
-- Name: lab_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lab_results_id_seq', 54, true);


--
-- Name: lab_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lab_tasks_id_seq', 3, true);


--
-- Name: medications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medications_id_seq', 22, true);


--
-- Name: medicine_catalog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medicine_catalog_id_seq', 33, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 1, false);


--
-- Name: nutrition_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nutrition_plans_id_seq', 3, true);


--
-- Name: patient_protocols_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.patient_protocols_id_seq', 6, true);


--
-- Name: patients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.patients_id_seq', 351, true);


--
-- Name: pregnancy_metrics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pregnancy_metrics_id_seq', 15, true);


--
-- Name: providers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.providers_id_seq', 4, true);


--
-- Name: referrals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.referrals_id_seq', 1, false);


--
-- Name: services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.services_id_seq', 4, true);


--
-- Name: usg_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usg_data_id_seq', 11, true);


--
-- Name: visit_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.visit_history_id_seq', 13, true);


--
-- Name: workouts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.workouts_id_seq', 3, true);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: billing_catalog billing_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_catalog
    ADD CONSTRAINT billing_catalog_pkey PRIMARY KEY (id);


--
-- Name: clinical_notes clinical_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_notes
    ADD CONSTRAINT clinical_notes_pkey PRIMARY KEY (id);


--
-- Name: consent_forms consent_forms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_forms
    ADD CONSTRAINT consent_forms_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: follicle_data follicle_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follicle_data
    ADD CONSTRAINT follicle_data_pkey PRIMARY KEY (id);


--
-- Name: follow_up_calls follow_up_calls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_up_calls
    ADD CONSTRAINT follow_up_calls_pkey PRIMARY KEY (id);


--
-- Name: hormone_readings hormone_readings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hormone_readings
    ADD CONSTRAINT hormone_readings_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: lab_results lab_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_pkey PRIMARY KEY (id);


--
-- Name: lab_tasks lab_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_tasks
    ADD CONSTRAINT lab_tasks_pkey PRIMARY KEY (id);


--
-- Name: medications medications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_pkey PRIMARY KEY (id);


--
-- Name: medicine_catalog medicine_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_catalog
    ADD CONSTRAINT medicine_catalog_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: nutrition_plans nutrition_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_plans
    ADD CONSTRAINT nutrition_plans_pkey PRIMARY KEY (id);


--
-- Name: patient_protocols patient_protocols_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_protocols
    ADD CONSTRAINT patient_protocols_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: pregnancy_metrics pregnancy_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pregnancy_metrics
    ADD CONSTRAINT pregnancy_metrics_pkey PRIMARY KEY (id);


--
-- Name: providers providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: usg_data usg_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usg_data
    ADD CONSTRAINT usg_data_pkey PRIMARY KEY (id);


--
-- Name: visit_history visit_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_history
    ADD CONSTRAINT visit_history_pkey PRIMARY KEY (id);


--
-- Name: workouts workouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts
    ADD CONSTRAINT workouts_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: appointments appointments_provider_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_provider_id_providers_id_fk FOREIGN KEY (provider_id) REFERENCES public.providers(id);


--
-- Name: appointments appointments_service_id_services_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_service_id_services_id_fk FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: clinical_notes clinical_notes_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_notes
    ADD CONSTRAINT clinical_notes_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: clinical_notes clinical_notes_provider_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_notes
    ADD CONSTRAINT clinical_notes_provider_id_providers_id_fk FOREIGN KEY (provider_id) REFERENCES public.providers(id);


--
-- Name: consent_forms consent_forms_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_forms
    ADD CONSTRAINT consent_forms_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: documents documents_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: documents documents_uploaded_by_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_providers_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.providers(id);


--
-- Name: follicle_data follicle_data_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follicle_data
    ADD CONSTRAINT follicle_data_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: follow_up_calls follow_up_calls_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_up_calls
    ADD CONSTRAINT follow_up_calls_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: hormone_readings hormone_readings_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hormone_readings
    ADD CONSTRAINT hormone_readings_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: invoices invoices_appointment_id_appointments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_appointment_id_appointments_id_fk FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: invoices invoices_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: lab_results lab_results_lab_task_id_lab_tasks_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_lab_task_id_lab_tasks_id_fk FOREIGN KEY (lab_task_id) REFERENCES public.lab_tasks(id);


--
-- Name: lab_results lab_results_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: lab_tasks lab_tasks_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_tasks
    ADD CONSTRAINT lab_tasks_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: medications medications_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: medications medications_prescribed_by_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_prescribed_by_providers_id_fk FOREIGN KEY (prescribed_by) REFERENCES public.providers(id);


--
-- Name: messages messages_conversation_id_conversations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_conversations_id_fk FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: pregnancy_metrics pregnancy_metrics_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pregnancy_metrics
    ADD CONSTRAINT pregnancy_metrics_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: referrals referrals_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: referrals referrals_referred_by_provider_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_by_provider_id_providers_id_fk FOREIGN KEY (referred_by_provider_id) REFERENCES public.providers(id);


--
-- Name: referrals referrals_referred_to_provider_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_to_provider_id_providers_id_fk FOREIGN KEY (referred_to_provider_id) REFERENCES public.providers(id);


--
-- Name: usg_data usg_data_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usg_data
    ADD CONSTRAINT usg_data_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: visit_history visit_history_appointment_id_appointments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_history
    ADD CONSTRAINT visit_history_appointment_id_appointments_id_fk FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: visit_history visit_history_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_history
    ADD CONSTRAINT visit_history_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: visit_history visit_history_provider_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_history
    ADD CONSTRAINT visit_history_provider_id_providers_id_fk FOREIGN KEY (provider_id) REFERENCES public.providers(id);


--
-- PostgreSQL database dump complete
--

\unrestrict RcOlh2SJN5gxWCX3eHJcmO2ErJpmyX9b1Wp9fZs0COhNyeksuUQvoJx94ETBudi

