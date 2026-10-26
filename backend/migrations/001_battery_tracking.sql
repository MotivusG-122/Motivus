
BEGIN;

-- 1. Master record: one row per physical battery
CREATE TABLE IF NOT EXISTS batteries (
    id BIGSERIAL PRIMARY KEY,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    battery_type_id BIGINT REFERENCES battery_types(id),
    model_number VARCHAR(150),
    capacity_ah NUMERIC(10,2),
    condition VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN'
        CHECK (condition IN (
            'GOOD', 'FAULTY', 'REGENERATED',
            'REPLACEMENT', 'SCRAP', 'UNKNOWN'
        )),
    current_location_id BIGINT REFERENCES locations(id),
    warranty_status VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN'
        CHECK (warranty_status IN (
            'IN_WARRANTY', 'EXPIRED', 'CLAIM_PENDING',
            'REPLACED', 'UNKNOWN'
        )),
    lifecycle_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
        CHECK (lifecycle_status IN (
            'ACTIVE', 'IN_TRANSIT', 'UNDER_PROCESSING',
            'RETIRED'
        )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batteries_location
    ON batteries(current_location_id);

CREATE INDEX IF NOT EXISTS idx_batteries_type
    ON batteries(battery_type_id);

CREATE INDEX IF NOT EXISTS idx_batteries_status
    ON batteries(lifecycle_status, condition);


-- 2. Header for each physical movement
CREATE TABLE IF NOT EXISTS battery_movements (
    id BIGSERIAL PRIMARY KEY,
    movement_code VARCHAR(60) NOT NULL UNIQUE,
    movement_type VARCHAR(40) NOT NULL
        CHECK (movement_type IN (
            'DEALER_TO_BRC',
            'BRC_TO_DEALER',
            'BRC_TO_LIVEGUARD',
            'LIVEGUARD_TO_BRC',
            'BRC_TO_BRC',
            'OTHER'
        )),
    source_location_id BIGINT NOT NULL REFERENCES locations(id),
    destination_location_id BIGINT NOT NULL REFERENCES locations(id),
    vehicle_id BIGINT REFERENCES vehicles(id),
    movement_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN (
            'DRAFT', 'DISPATCHED', 'PARTIALLY_RECEIVED',
            'RECEIVED', 'CANCELLED'
        )),
    dispatched_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (source_location_id <> destination_location_id)
);

CREATE INDEX IF NOT EXISTS idx_battery_movements_date
    ON battery_movements(movement_date);

CREATE INDEX IF NOT EXISTS idx_battery_movements_status
    ON battery_movements(status);


-- 3. Batteries attached to a movement
-- One row per serial-numbered battery
CREATE TABLE IF NOT EXISTS battery_movement_items (
    id BIGSERIAL PRIMARY KEY,
    movement_id BIGINT NOT NULL
        REFERENCES battery_movements(id) ON DELETE RESTRICT,
    battery_id BIGINT NOT NULL
        REFERENCES batteries(id) ON DELETE RESTRICT,
    condition_at_dispatch VARCHAR(30),
    condition_at_receipt VARCHAR(30),
    received BOOLEAN NOT NULL DEFAULT FALSE,
    received_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (movement_id, battery_id),

    CHECK (
        condition_at_dispatch IS NULL OR
        condition_at_dispatch IN (
            'GOOD', 'FAULTY', 'REGENERATED',
            'REPLACEMENT', 'SCRAP', 'UNKNOWN'
        )
    ),

    CHECK (
        condition_at_receipt IS NULL OR
        condition_at_receipt IN (
            'GOOD', 'FAULTY', 'REGENERATED',
            'REPLACEMENT', 'SCRAP', 'UNKNOWN'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_movement_items_battery
    ON battery_movement_items(battery_id);


-- 4. Challan metadata
CREATE TABLE IF NOT EXISTS delivery_challans (
    id BIGSERIAL PRIMARY KEY,
    challan_number VARCHAR(100) NOT NULL UNIQUE,
    movement_id BIGINT NOT NULL
        REFERENCES battery_movements(id) ON DELETE RESTRICT,
    challan_date DATE NOT NULL,
    challan_type VARCHAR(30) NOT NULL DEFAULT 'OUTWARD'
        CHECK (challan_type IN ('INWARD', 'OUTWARD')),
    external_reference VARCHAR(150),
    transporter_name VARCHAR(150),
    vehicle_number VARCHAR(30),
    transport_id VARCHAR(100),
    document_url TEXT,
    total_amount NUMERIC(14,2),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (total_amount IS NULL OR total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_challans_movement
    ON delivery_challans(movement_id);

COMMIT;
