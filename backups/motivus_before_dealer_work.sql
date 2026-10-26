--
-- PostgreSQL database dump
--

\restrict nwXb5sPcD6VbizJ42gGW7GYFVfPW2C3FGJQufggAK3EYWw5MRtdA8asalcqBXP6

-- Dumped from database version 16.15 (Debian 16.15-1.pgdg13+2)
-- Dumped by pg_dump version 16.15 (Debian 16.15-1.pgdg13+2)

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
-- Name: batteries; Type: TABLE; Schema: public; Owner: motivus_user
--

CREATE TABLE public.batteries (
    id bigint NOT NULL,
    serial_number character varying(100) NOT NULL,
    battery_type_id bigint,
    model_number character varying(150),
    capacity_ah numeric(10,2),
    condition character varying(30) DEFAULT 'UNKNOWN'::character varying NOT NULL,
    current_location_id bigint,
    warranty_status character varying(30) DEFAULT 'UNKNOWN'::character varying NOT NULL,
    lifecycle_status character varying(30) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT batteries_condition_check CHECK (((condition)::text = ANY ((ARRAY['GOOD'::character varying, 'FAULTY'::character varying, 'REGENERATED'::character varying, 'REPLACEMENT'::character varying, 'SCRAP'::character varying, 'UNKNOWN'::character varying])::text[]))),
    CONSTRAINT batteries_lifecycle_status_check CHECK (((lifecycle_status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'IN_TRANSIT'::character varying, 'UNDER_PROCESSING'::character varying, 'RETIRED'::character varying])::text[]))),
    CONSTRAINT batteries_warranty_status_check CHECK (((warranty_status)::text = ANY ((ARRAY['IN_WARRANTY'::character varying, 'EXPIRED'::character varying, 'CLAIM_PENDING'::character varying, 'REPLACED'::character varying, 'UNKNOWN'::character varying])::text[])))
);


ALTER TABLE public.batteries OWNER TO motivus_user;

--
-- Name: batteries_id_seq; Type: SEQUENCE; Schema: public; Owner: motivus_user
--

CREATE SEQUENCE public.batteries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batteries_id_seq OWNER TO motivus_user;

--
-- Name: batteries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: motivus_user
--

ALTER SEQUENCE public.batteries_id_seq OWNED BY public.batteries.id;


--
-- Name: battery_movement_items; Type: TABLE; Schema: public; Owner: motivus_user
--

CREATE TABLE public.battery_movement_items (
    id bigint NOT NULL,
    movement_id bigint NOT NULL,
    battery_id bigint NOT NULL,
    condition_at_dispatch character varying(30),
    condition_at_receipt character varying(30),
    received boolean DEFAULT false NOT NULL,
    received_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT battery_movement_items_condition_at_dispatch_check CHECK (((condition_at_dispatch IS NULL) OR ((condition_at_dispatch)::text = ANY ((ARRAY['GOOD'::character varying, 'FAULTY'::character varying, 'REGENERATED'::character varying, 'REPLACEMENT'::character varying, 'SCRAP'::character varying, 'UNKNOWN'::character varying])::text[])))),
    CONSTRAINT battery_movement_items_condition_at_receipt_check CHECK (((condition_at_receipt IS NULL) OR ((condition_at_receipt)::text = ANY ((ARRAY['GOOD'::character varying, 'FAULTY'::character varying, 'REGENERATED'::character varying, 'REPLACEMENT'::character varying, 'SCRAP'::character varying, 'UNKNOWN'::character varying])::text[]))))
);


ALTER TABLE public.battery_movement_items OWNER TO motivus_user;

--
-- Name: battery_movement_items_id_seq; Type: SEQUENCE; Schema: public; Owner: motivus_user
--

CREATE SEQUENCE public.battery_movement_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.battery_movement_items_id_seq OWNER TO motivus_user;

--
-- Name: battery_movement_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: motivus_user
--

ALTER SEQUENCE public.battery_movement_items_id_seq OWNED BY public.battery_movement_items.id;


--
-- Name: battery_movements; Type: TABLE; Schema: public; Owner: motivus_user
--

CREATE TABLE public.battery_movements (
    id bigint NOT NULL,
    movement_code character varying(60) NOT NULL,
    movement_type character varying(40) NOT NULL,
    source_location_id bigint NOT NULL,
    destination_location_id bigint NOT NULL,
    vehicle_id bigint,
    movement_date date NOT NULL,
    status character varying(30) DEFAULT 'DRAFT'::character varying NOT NULL,
    dispatched_at timestamp with time zone,
    received_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT battery_movements_check CHECK ((source_location_id <> destination_location_id)),
    CONSTRAINT battery_movements_movement_type_check CHECK (((movement_type)::text = ANY ((ARRAY['DEALER_TO_BRC'::character varying, 'BRC_TO_DEALER'::character varying, 'BRC_TO_LIVEGUARD'::character varying, 'LIVEGUARD_TO_BRC'::character varying, 'BRC_TO_BRC'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT battery_movements_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'DISPATCHED'::character varying, 'PARTIALLY_RECEIVED'::character varying, 'RECEIVED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.battery_movements OWNER TO motivus_user;

--
-- Name: battery_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: motivus_user
--

CREATE SEQUENCE public.battery_movements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.battery_movements_id_seq OWNER TO motivus_user;

--
-- Name: battery_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: motivus_user
--

ALTER SEQUENCE public.battery_movements_id_seq OWNED BY public.battery_movements.id;


--
-- Name: battery_types; Type: TABLE; Schema: public; Owner: motivus_user
--

CREATE TABLE public.battery_types (
    id bigint NOT NULL,
    type_code character varying(50) NOT NULL,
    type_name character varying(150) NOT NULL,
    unit_weight_kg numeric(12,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT battery_types_unit_weight_kg_check CHECK ((unit_weight_kg >= (0)::numeric))
);


ALTER TABLE public.battery_types OWNER TO motivus_user;

--
-- Name: battery_types_id_seq; Type: SEQUENCE; Schema: public; Owner: motivus_user
--

CREATE SEQUENCE public.battery_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.battery_types_id_seq OWNER TO motivus_user;

--
-- Name: battery_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: motivus_user
--

ALTER SEQUENCE public.battery_types_id_seq OWNED BY public.battery_types.id;


--
-- Name: delivery_challans; Type: TABLE; Schema: public; Owner: motivus_user
--

CREATE TABLE public.delivery_challans (
    id bigint NOT NULL,
    challan_number character varying(100) NOT NULL,
    movement_id bigint NOT NULL,
    challan_date date NOT NULL,
    challan_type character varying(30) DEFAULT 'OUTWARD'::character varying NOT NULL,
    external_reference character varying(150),
    transporter_name character varying(150),
    vehicle_number character varying(30),
    transport_id character varying(100),
    document_url text,
    total_amount numeric(14,2),
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT delivery_challans_challan_type_check CHECK (((challan_type)::text = ANY ((ARRAY['INWARD'::character varying, 'OUTWARD'::character varying])::text[]))),
    CONSTRAINT delivery_challans_total_amount_check CHECK (((total_amount IS NULL) OR (total_amount >= (0)::numeric)))
);


ALTER TABLE public.delivery_challans OWNER TO motivus_user;

--
-- Name: delivery_challans_id_seq; Type: SEQUENCE; Schema: public; Owner: motivus_user
--

CREATE SEQUENCE public.delivery_challans_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.delivery_challans_id_seq OWNER TO motivus_user;

--
-- Name: delivery_challans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: motivus_user
--

ALTER SEQUENCE public.delivery_challans_id_seq OWNED BY public.delivery_challans.id;


--
-- Name: disruptions; Type: TABLE; Schema: public; Owner: motivus_user
--

CREATE TABLE public.disruptions (
    id bigint NOT NULL,
    title character varying(200) NOT NULL,
    disruption_type character varying(40) NOT NULL,
    location_id bigint,
    description text,
    source character varying(150),
    reported_at timestamp with time zone DEFAULT now() NOT NULL,
    last_verified_at timestamp with time zone,
    status character varying(30) DEFAULT 'UNVERIFIED'::character varying NOT NULL
);


ALTER TABLE public.disruptions OWNER TO motivus_user;

--
-- Name: disruptions_id_seq; Type: SEQUENCE; Schema: public; Owner: motivus_user
--

CREATE SEQUENCE public.disruptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.disruptions_id_seq OWNER TO motivus_user;

--
-- Name: disruptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: motivus_user
--

ALTER SEQUENCE public.disruptions_id_seq OWNED BY public.disruptions.id;


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: motivus_user
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    job_code character varying(50) NOT NULL,
    operating_date date NOT NULL,
    job_type character varying(20) NOT NULL,
    pickup_location_id bigint NOT NULL,
    delivery_location_id bigint NOT NULL,
    battery_type_id bigint,
    battery_quantity integer NOT NULL,
    total_weight_kg numeric(12,2) NOT NULL,
    status character varying(30) DEFAULT 'UNASSIGNED'::character varying NOT NULL,
    assigned_vehicle_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT jobs_battery_quantity_check CHECK ((battery_quantity >= 0)),
    CONSTRAINT jobs_job_type_check CHECK (((job_type)::text = ANY ((ARRAY['PICKUP'::character varying, 'DELIVERY'::character varying])::text[]))),
    CONSTRAINT jobs_total_weight_kg_check CHECK ((total_weight_kg >= (0)::numeric))
);


ALTER TABLE public.jobs OWNER TO motivus_user;

--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: motivus_user
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobs_id_seq OWNER TO motivus_user;

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: motivus_user
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: locations; Type: TABLE; Schema: public; Owner: motivus_user
--

CREATE TABLE public.locations (
    id bigint NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    location_type character varying(30) NOT NULL,
    address text,
    latitude double precision,
    longitude double precision,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT locations_location_type_check CHECK (((location_type)::text = ANY ((ARRAY['BRC'::character varying, 'DISTRIBUTOR'::character varying, 'DEALER'::character varying, 'OTHER'::character varying])::text[])))
);


ALTER TABLE public.locations OWNER TO motivus_user;

--
-- Name: locations_id_seq; Type: SEQUENCE; Schema: public; Owner: motivus_user
--

CREATE SEQUENCE public.locations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.locations_id_seq OWNER TO motivus_user;

--
-- Name: locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: motivus_user
--

ALTER SEQUENCE public.locations_id_seq OWNED BY public.locations.id;


--
-- Name: operational_events; Type: TABLE; Schema: public; Owner: motivus_user
--

CREATE TABLE public.operational_events (
    id bigint NOT NULL,
    vehicle_id bigint,
    job_id bigint,
    location_id bigint,
    event_type character varying(50) NOT NULL,
    event_time timestamp with time zone NOT NULL,
    source character varying(30) NOT NULL,
    latitude double precision,
    longitude double precision,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.operational_events OWNER TO motivus_user;

--
-- Name: operational_events_id_seq; Type: SEQUENCE; Schema: public; Owner: motivus_user
--

CREATE SEQUENCE public.operational_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.operational_events_id_seq OWNER TO motivus_user;

--
-- Name: operational_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: motivus_user
--

ALTER SEQUENCE public.operational_events_id_seq OWNED BY public.operational_events.id;


--
-- Name: route_plans; Type: TABLE; Schema: public; Owner: motivus_user
--

CREATE TABLE public.route_plans (
    id bigint NOT NULL,
    plan_date date NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status character varying(30) DEFAULT 'DRAFT'::character varying NOT NULL,
    planned_distance_km numeric(12,2),
    estimated_duration_minutes integer,
    approved_by character varying(150),
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.route_plans OWNER TO motivus_user;

--
-- Name: route_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: motivus_user
--

CREATE SEQUENCE public.route_plans_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.route_plans_id_seq OWNER TO motivus_user;

--
-- Name: route_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: motivus_user
--

ALTER SEQUENCE public.route_plans_id_seq OWNED BY public.route_plans.id;


--
-- Name: route_stops; Type: TABLE; Schema: public; Owner: motivus_user
--

CREATE TABLE public.route_stops (
    id bigint NOT NULL,
    route_plan_id bigint NOT NULL,
    vehicle_id bigint NOT NULL,
    location_id bigint NOT NULL,
    stop_sequence integer NOT NULL,
    planned_arrival timestamp with time zone,
    planned_departure timestamp with time zone,
    actual_arrival timestamp with time zone,
    actual_departure timestamp with time zone,
    event_source character varying(30),
    CONSTRAINT route_stops_stop_sequence_check CHECK ((stop_sequence > 0))
);


ALTER TABLE public.route_stops OWNER TO motivus_user;

--
-- Name: route_stops_id_seq; Type: SEQUENCE; Schema: public; Owner: motivus_user
--

CREATE SEQUENCE public.route_stops_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.route_stops_id_seq OWNER TO motivus_user;

--
-- Name: route_stops_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: motivus_user
--

ALTER SEQUENCE public.route_stops_id_seq OWNED BY public.route_stops.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: motivus_user
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    full_name character varying(150) NOT NULL,
    email character varying(254) NOT NULL,
    password_hash text NOT NULL,
    role character varying(20) DEFAULT 'viewer'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'planner'::character varying, 'viewer'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO motivus_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: motivus_user
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO motivus_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: motivus_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: motivus_user
--

CREATE TABLE public.vehicles (
    id bigint NOT NULL,
    vehicle_code character varying(50) NOT NULL,
    registration_number character varying(30),
    payload_capacity_kg numeric(12,2) NOT NULL,
    availability_status character varying(30) DEFAULT 'AVAILABLE'::character varying NOT NULL,
    gps_provider character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    driver_name character varying(100),
    CONSTRAINT vehicles_payload_capacity_kg_check CHECK ((payload_capacity_kg >= (0)::numeric))
);


ALTER TABLE public.vehicles OWNER TO motivus_user;

--
-- Name: vehicles_id_seq; Type: SEQUENCE; Schema: public; Owner: motivus_user
--

CREATE SEQUENCE public.vehicles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vehicles_id_seq OWNER TO motivus_user;

--
-- Name: vehicles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: motivus_user
--

ALTER SEQUENCE public.vehicles_id_seq OWNED BY public.vehicles.id;


--
-- Name: batteries id; Type: DEFAULT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.batteries ALTER COLUMN id SET DEFAULT nextval('public.batteries_id_seq'::regclass);


--
-- Name: battery_movement_items id; Type: DEFAULT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.battery_movement_items ALTER COLUMN id SET DEFAULT nextval('public.battery_movement_items_id_seq'::regclass);


--
-- Name: battery_movements id; Type: DEFAULT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.battery_movements ALTER COLUMN id SET DEFAULT nextval('public.battery_movements_id_seq'::regclass);


--
-- Name: battery_types id; Type: DEFAULT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.battery_types ALTER COLUMN id SET DEFAULT nextval('public.battery_types_id_seq'::regclass);


--
-- Name: delivery_challans id; Type: DEFAULT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.delivery_challans ALTER COLUMN id SET DEFAULT nextval('public.delivery_challans_id_seq'::regclass);


--
-- Name: disruptions id; Type: DEFAULT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.disruptions ALTER COLUMN id SET DEFAULT nextval('public.disruptions_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: locations id; Type: DEFAULT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('public.locations_id_seq'::regclass);


--
-- Name: operational_events id; Type: DEFAULT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.operational_events ALTER COLUMN id SET DEFAULT nextval('public.operational_events_id_seq'::regclass);


--
-- Name: route_plans id; Type: DEFAULT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.route_plans ALTER COLUMN id SET DEFAULT nextval('public.route_plans_id_seq'::regclass);


--
-- Name: route_stops id; Type: DEFAULT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.route_stops ALTER COLUMN id SET DEFAULT nextval('public.route_stops_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vehicles id; Type: DEFAULT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.vehicles ALTER COLUMN id SET DEFAULT nextval('public.vehicles_id_seq'::regclass);


--
-- Data for Name: batteries; Type: TABLE DATA; Schema: public; Owner: motivus_user
--

COPY public.batteries (id, serial_number, battery_type_id, model_number, capacity_ah, condition, current_location_id, warranty_status, lifecycle_status, created_at, updated_at) FROM stdin;
1	TEST-SERIAL-001	\N	TEST-MODEL	100.00	UNKNOWN	1	UNKNOWN	ACTIVE	2026-10-23 09:51:40.469793+00	2026-10-23 09:51:40.469793+00
\.


--
-- Data for Name: battery_movement_items; Type: TABLE DATA; Schema: public; Owner: motivus_user
--

COPY public.battery_movement_items (id, movement_id, battery_id, condition_at_dispatch, condition_at_receipt, received, received_at, notes, created_at) FROM stdin;
1	1	1	UNKNOWN	\N	t	2026-10-23 10:41:10.673973+00	\N	2026-10-23 10:26:21.868202+00
\.


--
-- Data for Name: battery_movements; Type: TABLE DATA; Schema: public; Owner: motivus_user
--

COPY public.battery_movements (id, movement_code, movement_type, source_location_id, destination_location_id, vehicle_id, movement_date, status, dispatched_at, received_at, notes, created_at) FROM stdin;
1	MOV-20261023-5A3D6E78	BRC_TO_BRC	2	1	\N	2026-10-23	RECEIVED	2026-10-23 10:33:53.68643+00	2026-10-23 10:41:10.673973+00	Test movement - API verification only	2026-10-23 10:26:21.868202+00
\.


--
-- Data for Name: battery_types; Type: TABLE DATA; Schema: public; Owner: motivus_user
--

COPY public.battery_types (id, type_code, type_name, unit_weight_kg, is_active) FROM stdin;
\.


--
-- Data for Name: delivery_challans; Type: TABLE DATA; Schema: public; Owner: motivus_user
--

COPY public.delivery_challans (id, challan_number, movement_id, challan_date, challan_type, external_reference, transporter_name, vehicle_number, transport_id, document_url, total_amount, remarks, created_at) FROM stdin;
\.


--
-- Data for Name: disruptions; Type: TABLE DATA; Schema: public; Owner: motivus_user
--

COPY public.disruptions (id, title, disruption_type, location_id, description, source, reported_at, last_verified_at, status) FROM stdin;
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: motivus_user
--

COPY public.jobs (id, job_code, operating_date, job_type, pickup_location_id, delivery_location_id, battery_type_id, battery_quantity, total_weight_kg, status, assigned_vehicle_id, created_at) FROM stdin;
\.


--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: motivus_user
--

COPY public.locations (id, code, name, location_type, address, latitude, longitude, is_active, created_at) FROM stdin;
1	BRC-BAREILLY	Bareilly	BRC	D-17, M/S Mordern Poly Pack Industries, Industrial Area, Paraskheda, Bareilly, Uttar Pradesh	28.4325	79.3422	t	2026-10-23 09:15:23.935382+00
2	BRC-GHAZIABAD	Ghaziabad	BRC	Khasra No. 655, Meerut Road, Duhai Industrial Area, Basantpur Saitli, Ghaziabad, Uttar Pradesh	28.725	77.475	t	2026-10-23 09:15:23.935382+00
3	BRC-GORAKHPUR	Gorakhpur	BRC	184/14, Mahadev Jharkhandi, Tukda No-2, Kunraghat, Gorakhpur, Uttar Pradesh	26.7479	83.4155	t	2026-10-23 09:15:23.935382+00
4	BRC-KANPUR	Kanpur	BRC	120 A, Dada Nagar, Kanpur, Kanpur Nagar, Uttar Pradesh	26.443	80.283	t	2026-10-23 09:15:23.935382+00
5	BRC-LUCKNOW	Lucknow	BRC	Plot No. 18, Gata No. 162, Tahesil Baskhi Ka Talab, Tewaripur, Lucknow, Uttar Pradesh	27.12856	80.91561	t	2026-10-23 09:15:23.935382+00
6	BRC-MUZAFFARNAGAR	Muzaffarnagar	BRC	Godown No. A-15 & A-16, Industrial Area, Muzaffarnagar, Uttar Pradesh	29.417	77.716	t	2026-10-23 09:15:23.935382+00
7	BRC-VARANASI	Varanasi	BRC	Plot No. 725, Khushipur, Varanasi, Birbhanpur, Varanasi, Uttar Pradesh	25.2795	82.8506	t	2026-10-23 09:15:23.935382+00
8	BRC-PATNA	Patna	BRC	Vikrampur, Fatuha, Bikrampur, Patna, Bihar	25.5147	85.2807	t	2026-10-23 09:15:23.935382+00
\.


--
-- Data for Name: operational_events; Type: TABLE DATA; Schema: public; Owner: motivus_user
--

COPY public.operational_events (id, vehicle_id, job_id, location_id, event_type, event_time, source, latitude, longitude, notes, created_at) FROM stdin;
\.


--
-- Data for Name: route_plans; Type: TABLE DATA; Schema: public; Owner: motivus_user
--

COPY public.route_plans (id, plan_date, version, status, planned_distance_km, estimated_duration_minutes, approved_by, approved_at, created_at) FROM stdin;
\.


--
-- Data for Name: route_stops; Type: TABLE DATA; Schema: public; Owner: motivus_user
--

COPY public.route_stops (id, route_plan_id, vehicle_id, location_id, stop_sequence, planned_arrival, planned_departure, actual_arrival, actual_departure, event_source) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: motivus_user
--

COPY public.users (id, full_name, email, password_hash, role, is_active, created_at, updated_at, last_login_at) FROM stdin;
1	Abhijit Sharma	abhijitsharma.ab@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$62ANxDHtaHGbkFmyUXWh+w$H7chUB9wxSeNxNh4A7kxrH9gSl4WcsiVujcE6XWkTbs	admin	t	2026-10-22 09:05:11.631287+00	2026-10-22 09:05:11.631287+00	2026-10-23 10:19:01.694206+00
\.


--
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: motivus_user
--

COPY public.vehicles (id, vehicle_code, registration_number, payload_capacity_kg, availability_status, gps_provider, is_active, created_at, driver_name) FROM stdin;
\.


--
-- Name: batteries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: motivus_user
--

SELECT pg_catalog.setval('public.batteries_id_seq', 3, true);


--
-- Name: battery_movement_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: motivus_user
--

SELECT pg_catalog.setval('public.battery_movement_items_id_seq', 1, true);


--
-- Name: battery_movements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: motivus_user
--

SELECT pg_catalog.setval('public.battery_movements_id_seq', 1, true);


--
-- Name: battery_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: motivus_user
--

SELECT pg_catalog.setval('public.battery_types_id_seq', 1, false);


--
-- Name: delivery_challans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: motivus_user
--

SELECT pg_catalog.setval('public.delivery_challans_id_seq', 1, false);


--
-- Name: disruptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: motivus_user
--

SELECT pg_catalog.setval('public.disruptions_id_seq', 1, false);


--
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: motivus_user
--

SELECT pg_catalog.setval('public.jobs_id_seq', 1, false);


--
-- Name: locations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: motivus_user
--

SELECT pg_catalog.setval('public.locations_id_seq', 8, true);


--
-- Name: operational_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: motivus_user
--

SELECT pg_catalog.setval('public.operational_events_id_seq', 1, false);


--
-- Name: route_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: motivus_user
--

SELECT pg_catalog.setval('public.route_plans_id_seq', 1, false);


--
-- Name: route_stops_id_seq; Type: SEQUENCE SET; Schema: public; Owner: motivus_user
--

SELECT pg_catalog.setval('public.route_stops_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: motivus_user
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: vehicles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: motivus_user
--

SELECT pg_catalog.setval('public.vehicles_id_seq', 1, false);


--
-- Name: batteries batteries_pkey; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.batteries
    ADD CONSTRAINT batteries_pkey PRIMARY KEY (id);


--
-- Name: batteries batteries_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.batteries
    ADD CONSTRAINT batteries_serial_number_key UNIQUE (serial_number);


--
-- Name: battery_movement_items battery_movement_items_movement_id_battery_id_key; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.battery_movement_items
    ADD CONSTRAINT battery_movement_items_movement_id_battery_id_key UNIQUE (movement_id, battery_id);


--
-- Name: battery_movement_items battery_movement_items_pkey; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.battery_movement_items
    ADD CONSTRAINT battery_movement_items_pkey PRIMARY KEY (id);


--
-- Name: battery_movements battery_movements_movement_code_key; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.battery_movements
    ADD CONSTRAINT battery_movements_movement_code_key UNIQUE (movement_code);


--
-- Name: battery_movements battery_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.battery_movements
    ADD CONSTRAINT battery_movements_pkey PRIMARY KEY (id);


--
-- Name: battery_types battery_types_pkey; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.battery_types
    ADD CONSTRAINT battery_types_pkey PRIMARY KEY (id);


--
-- Name: battery_types battery_types_type_code_key; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.battery_types
    ADD CONSTRAINT battery_types_type_code_key UNIQUE (type_code);


--
-- Name: delivery_challans delivery_challans_challan_number_key; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.delivery_challans
    ADD CONSTRAINT delivery_challans_challan_number_key UNIQUE (challan_number);


--
-- Name: delivery_challans delivery_challans_pkey; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.delivery_challans
    ADD CONSTRAINT delivery_challans_pkey PRIMARY KEY (id);


--
-- Name: disruptions disruptions_pkey; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.disruptions
    ADD CONSTRAINT disruptions_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_job_code_key; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_job_code_key UNIQUE (job_code);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: locations locations_code_key; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_code_key UNIQUE (code);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: operational_events operational_events_pkey; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.operational_events
    ADD CONSTRAINT operational_events_pkey PRIMARY KEY (id);


--
-- Name: route_plans route_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.route_plans
    ADD CONSTRAINT route_plans_pkey PRIMARY KEY (id);


--
-- Name: route_plans route_plans_plan_date_version_key; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.route_plans
    ADD CONSTRAINT route_plans_plan_date_version_key UNIQUE (plan_date, version);


--
-- Name: route_stops route_stops_pkey; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT route_stops_pkey PRIMARY KEY (id);


--
-- Name: route_stops route_stops_route_plan_id_vehicle_id_stop_sequence_key; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT route_stops_route_plan_id_vehicle_id_stop_sequence_key UNIQUE (route_plan_id, vehicle_id, stop_sequence);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_registration_number_key; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_registration_number_key UNIQUE (registration_number);


--
-- Name: vehicles vehicles_vehicle_code_key; Type: CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_vehicle_code_key UNIQUE (vehicle_code);


--
-- Name: idx_batteries_location; Type: INDEX; Schema: public; Owner: motivus_user
--

CREATE INDEX idx_batteries_location ON public.batteries USING btree (current_location_id);


--
-- Name: idx_batteries_status; Type: INDEX; Schema: public; Owner: motivus_user
--

CREATE INDEX idx_batteries_status ON public.batteries USING btree (lifecycle_status, condition);


--
-- Name: idx_batteries_type; Type: INDEX; Schema: public; Owner: motivus_user
--

CREATE INDEX idx_batteries_type ON public.batteries USING btree (battery_type_id);


--
-- Name: idx_battery_movements_date; Type: INDEX; Schema: public; Owner: motivus_user
--

CREATE INDEX idx_battery_movements_date ON public.battery_movements USING btree (movement_date);


--
-- Name: idx_battery_movements_status; Type: INDEX; Schema: public; Owner: motivus_user
--

CREATE INDEX idx_battery_movements_status ON public.battery_movements USING btree (status);


--
-- Name: idx_challans_movement; Type: INDEX; Schema: public; Owner: motivus_user
--

CREATE INDEX idx_challans_movement ON public.delivery_challans USING btree (movement_id);


--
-- Name: idx_events_vehicle_time; Type: INDEX; Schema: public; Owner: motivus_user
--

CREATE INDEX idx_events_vehicle_time ON public.operational_events USING btree (vehicle_id, event_time);


--
-- Name: idx_jobs_operating_date; Type: INDEX; Schema: public; Owner: motivus_user
--

CREATE INDEX idx_jobs_operating_date ON public.jobs USING btree (operating_date);


--
-- Name: idx_jobs_status; Type: INDEX; Schema: public; Owner: motivus_user
--

CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);


--
-- Name: idx_movement_items_battery; Type: INDEX; Schema: public; Owner: motivus_user
--

CREATE INDEX idx_movement_items_battery ON public.battery_movement_items USING btree (battery_id);


--
-- Name: idx_route_stops_plan_vehicle; Type: INDEX; Schema: public; Owner: motivus_user
--

CREATE INDEX idx_route_stops_plan_vehicle ON public.route_stops USING btree (route_plan_id, vehicle_id, stop_sequence);


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: motivus_user
--

CREATE INDEX idx_users_active ON public.users USING btree (is_active);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: motivus_user
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: batteries batteries_battery_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.batteries
    ADD CONSTRAINT batteries_battery_type_id_fkey FOREIGN KEY (battery_type_id) REFERENCES public.battery_types(id);


--
-- Name: batteries batteries_current_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.batteries
    ADD CONSTRAINT batteries_current_location_id_fkey FOREIGN KEY (current_location_id) REFERENCES public.locations(id);


--
-- Name: battery_movement_items battery_movement_items_battery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.battery_movement_items
    ADD CONSTRAINT battery_movement_items_battery_id_fkey FOREIGN KEY (battery_id) REFERENCES public.batteries(id) ON DELETE RESTRICT;


--
-- Name: battery_movement_items battery_movement_items_movement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.battery_movement_items
    ADD CONSTRAINT battery_movement_items_movement_id_fkey FOREIGN KEY (movement_id) REFERENCES public.battery_movements(id) ON DELETE RESTRICT;


--
-- Name: battery_movements battery_movements_destination_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.battery_movements
    ADD CONSTRAINT battery_movements_destination_location_id_fkey FOREIGN KEY (destination_location_id) REFERENCES public.locations(id);


--
-- Name: battery_movements battery_movements_source_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.battery_movements
    ADD CONSTRAINT battery_movements_source_location_id_fkey FOREIGN KEY (source_location_id) REFERENCES public.locations(id);


--
-- Name: battery_movements battery_movements_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.battery_movements
    ADD CONSTRAINT battery_movements_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: delivery_challans delivery_challans_movement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.delivery_challans
    ADD CONSTRAINT delivery_challans_movement_id_fkey FOREIGN KEY (movement_id) REFERENCES public.battery_movements(id) ON DELETE RESTRICT;


--
-- Name: disruptions disruptions_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.disruptions
    ADD CONSTRAINT disruptions_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: jobs jobs_assigned_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_assigned_vehicle_id_fkey FOREIGN KEY (assigned_vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: jobs jobs_battery_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_battery_type_id_fkey FOREIGN KEY (battery_type_id) REFERENCES public.battery_types(id);


--
-- Name: jobs jobs_delivery_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_delivery_location_id_fkey FOREIGN KEY (delivery_location_id) REFERENCES public.locations(id);


--
-- Name: jobs jobs_pickup_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pickup_location_id_fkey FOREIGN KEY (pickup_location_id) REFERENCES public.locations(id);


--
-- Name: operational_events operational_events_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.operational_events
    ADD CONSTRAINT operational_events_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id);


--
-- Name: operational_events operational_events_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.operational_events
    ADD CONSTRAINT operational_events_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: operational_events operational_events_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.operational_events
    ADD CONSTRAINT operational_events_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: route_stops route_stops_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT route_stops_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: route_stops route_stops_route_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT route_stops_route_plan_id_fkey FOREIGN KEY (route_plan_id) REFERENCES public.route_plans(id);


--
-- Name: route_stops route_stops_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: motivus_user
--

ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT route_stops_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- PostgreSQL database dump complete
--

\unrestrict nwXb5sPcD6VbizJ42gGW7GYFVfPW2C3FGJQufggAK3EYWw5MRtdA8asalcqBXP6

