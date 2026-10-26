CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    location_type VARCHAR(30) NOT NULL
        CHECK (location_type IN ('BRC', 'DISTRIBUTOR', 'DEALER', 'OTHER')),
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
    id BIGSERIAL PRIMARY KEY,
    vehicle_code VARCHAR(50) UNIQUE NOT NULL,
    registration_number VARCHAR(30) UNIQUE,
    payload_capacity_kg NUMERIC(12, 2) NOT NULL
        CHECK (payload_capacity_kg >= 0),
    availability_status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    gps_provider VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS battery_types (
    id BIGSERIAL PRIMARY KEY,
    type_code VARCHAR(50) UNIQUE NOT NULL,
    type_name VARCHAR(150) NOT NULL,
    unit_weight_kg NUMERIC(12, 2) NOT NULL
        CHECK (unit_weight_kg >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS jobs (
    id BIGSERIAL PRIMARY KEY,
    job_code VARCHAR(50) UNIQUE NOT NULL,
    operating_date DATE NOT NULL,
    job_type VARCHAR(20) NOT NULL
        CHECK (job_type IN ('PICKUP', 'DELIVERY')),
    pickup_location_id BIGINT NOT NULL REFERENCES locations(id),
    delivery_location_id BIGINT NOT NULL REFERENCES locations(id),
    battery_type_id BIGINT REFERENCES battery_types(id),
    battery_quantity INTEGER NOT NULL CHECK (battery_quantity >= 0),
    total_weight_kg NUMERIC(12, 2) NOT NULL CHECK (total_weight_kg >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'UNASSIGNED',
    assigned_vehicle_id BIGINT REFERENCES vehicles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_plans (
    id BIGSERIAL PRIMARY KEY,
    plan_date DATE NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    planned_distance_km NUMERIC(12, 2),
    estimated_duration_minutes INTEGER,
    approved_by VARCHAR(150),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (plan_date, version)
);

CREATE TABLE IF NOT EXISTS route_stops (
    id BIGSERIAL PRIMARY KEY,
    route_plan_id BIGINT NOT NULL REFERENCES route_plans(id),
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(id),
    location_id BIGINT NOT NULL REFERENCES locations(id),
    stop_sequence INTEGER NOT NULL CHECK (stop_sequence > 0),
    planned_arrival TIMESTAMPTZ,
    planned_departure TIMESTAMPTZ,
    actual_arrival TIMESTAMPTZ,
    actual_departure TIMESTAMPTZ,
    event_source VARCHAR(30),
    UNIQUE (route_plan_id, vehicle_id, stop_sequence)
);

CREATE TABLE IF NOT EXISTS operational_events (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id BIGINT REFERENCES vehicles(id),
    job_id BIGINT REFERENCES jobs(id),
    location_id BIGINT REFERENCES locations(id),
    event_type VARCHAR(50) NOT NULL,
    event_time TIMESTAMPTZ NOT NULL,
    source VARCHAR(30) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disruptions (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    disruption_type VARCHAR(40) NOT NULL,
    location_id BIGINT REFERENCES locations(id),
    description TEXT,
    source VARCHAR(150),
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_verified_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED'
);

CREATE INDEX IF NOT EXISTS idx_jobs_operating_date
    ON jobs (operating_date);

CREATE INDEX IF NOT EXISTS idx_jobs_status
    ON jobs (status);

CREATE INDEX IF NOT EXISTS idx_events_vehicle_time
    ON operational_events (vehicle_id, event_time);

CREATE INDEX IF NOT EXISTS idx_route_stops_plan_vehicle
    ON route_stops (route_plan_id, vehicle_id, stop_sequence);