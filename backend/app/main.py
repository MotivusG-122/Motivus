import os
import uuid

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.auth import current_user, router as auth_router
from app.optimizer import allocate_jobs
from app.database import engine


app = FastAPI(
    title="Motivus Logistics API",
    version="0.3.0",
    description="Battery pickup, delivery and movement planning with   authentication.",
)

frontend_origin = os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:3000",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(auth_router)


# =========================================================
# REQUEST MODELS
# =========================================================

class JobInput(BaseModel):
    id: str
    weight_kg: int = Field(ge=0)


class VehicleInput(BaseModel):
    id: str
    capacity_kg: int = Field(ge=0)


class VehicleCreate(BaseModel):
    vehicle_code: str = Field(min_length=1, max_length=50)
    registration_number: str = Field(min_length=1, max_length=30)
    driver_name: str = Field(min_length=1, max_length=100)
    payload_capacity_kg: float = Field(gt=0)
    availability_status: str = "AVAILABLE"
    home_location_id: int | None = Field(default=None, gt=0)


class OptimizeRequest(BaseModel):
    jobs: list[JobInput]
    vehicles: list[VehicleInput]


class MovementCreate(BaseModel):
    movement_type: str = "BRC_TO_BRC"
    source_location_id: int = Field(gt=0)
    destination_location_id: int = Field(gt=0)
    vehicle_id: int | None = Field(default=None, gt=0)
    movement_date: str
    battery_ids: list[int] = Field(min_length=1)
    notes: str | None = None


# =========================================================
# CONSTANTS
# =========================================================

BATTERY_CONDITIONS = {
    "GOOD",
    "FAULTY",
    "REGENERATED",
    "REPLACEMENT",
    "SCRAP",
    "UNKNOWN",
}

WARRANTY_STATUSES = {
    "IN_WARRANTY",
    "EXPIRED",
    "CLAIM_PENDING",
    "REPLACED",
    "UNKNOWN",
}

BATTERY_LIFECYCLE_STATUSES = {
    "ACTIVE",
    "IN_TRANSIT",
    "UNDER_PROCESSING",
    "RETIRED",
}

MOVEMENT_TYPES = {
    "DEALER_TO_BRC",
    "BRC_TO_DEALER",
    "BRC_TO_LIVEGUARD",
    "LIVEGUARD_TO_BRC",
    "BRC_TO_BRC",
    "OTHER",
}


# =========================================================
# HEALTH
# =========================================================

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "motivus-logistics-api",
    }


# =========================================================
# OPTIMIZATION API
# =========================================================

@app.post("/api/v1/optimize")
def optimize(
    request: OptimizeRequest,
    user=Depends(current_user),
):
    try:
        result = allocate_jobs(
            jobs=[
                job.model_dump()
                for job in request.jobs
            ],
            vehicles=[
                vehicle.model_dump()
                for vehicle in request.vehicles
            ],
        )

        return result

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc


# =========================================================
# VEHICLE CREATION API
# =========================================================

@app.post("/api/v1/vehicles", status_code=201)
def create_vehicle(
    request: VehicleCreate,
    user=Depends(current_user),
):
    status = request.availability_status.strip().upper()

    allowed_statuses = {
        "AVAILABLE",
        "IN_USE",
        "MAINTENANCE",
        "UNAVAILABLE",
    }

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=422,
            detail=(
                "Availability status must be one of: "
                + ", ".join(sorted(allowed_statuses))
            ),
        )

    query = text("""
        INSERT INTO vehicles (
            vehicle_code,
            registration_number,
            driver_name,
            payload_capacity_kg,
            availability_status,
            home_location_id
        )
        VALUES (
            :vehicle_code,
            :registration_number,
            :driver_name,
            :payload_capacity_kg,
            :availability_status,
            :home_location_id
        )
        RETURNING
            id,
            vehicle_code,
            registration_number,
            driver_name,
            payload_capacity_kg,
            availability_status,
            home_location_id,
            is_active
    """)

    values = {
        "vehicle_code": request.vehicle_code.strip(),
        "registration_number": request.registration_number.strip().upper(),
        "driver_name": request.driver_name.strip(),
        "payload_capacity_kg": request.payload_capacity_kg,
        "availability_status": status,
        "home_location_id": request.home_location_id,
    }

    try:
        with engine.begin() as connection:
            if request.home_location_id is not None:
                location = connection.execute(
                    text("""
                        SELECT id
                        FROM locations
                        WHERE id = :location_id
                          AND location_type = 'BRC'
                          AND is_active = TRUE
                    """),
                    {"location_id": request.home_location_id},
                ).first()

                if location is None:
                    raise HTTPException(
                        status_code=422,
                        detail=(
                            "home_location_id must refer to an active BRC."
                        ),
                    )

            row = connection.execute(
                query,
                values,
            ).mappings().one()

        return dict(row)

    except IntegrityError as exc:
        raise HTTPException(
            status_code=409,
            detail=(
                "Vehicle code or registration number already exists."
            ),
        ) from exc


# =========================================================
# BATTERY MOVEMENT CREATION API
# =========================================================

@app.post("/api/v1/movements", status_code=201)
def create_movement(
    request: MovementCreate,
    user=Depends(current_user),
):
    movement_type = request.movement_type.strip().upper()

    if movement_type not in MOVEMENT_TYPES:
        raise HTTPException(
            status_code=422,
            detail=(
                "Invalid movement type. Allowed values: "
                + ", ".join(sorted(MOVEMENT_TYPES))
            ),
        )

    if request.source_location_id == request.destination_location_id:
        raise HTTPException(
            status_code=422,
            detail="Source and destination locations must be different.",
        )

    if len(request.battery_ids) != len(set(request.battery_ids)):
        raise HTTPException(
            status_code=422,
            detail="Duplicate battery IDs are not allowed.",
        )

    # Validate date before writing anything to the database.
    from datetime import date

    try:
        movement_date = date.fromisoformat(request.movement_date)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail="movement_date must use YYYY-MM-DD format.",
        ) from exc

    # This implementation currently supports BRC-to-BRC only.
    if movement_type != "BRC_TO_BRC":
        raise HTTPException(
            status_code=422,
            detail=(
                "Currently, only BRC_TO_BRC movements are supported."
            ),
        )

    movement_code = (
        "MOV-"
        + movement_date.strftime("%Y%m%d")
        + "-"
        + uuid.uuid4().hex[:8].upper()
    )

    try:
        with engine.begin() as connection:
            # Validate both locations.
            locations = connection.execute(
                text("""
                    SELECT id, name, location_type, is_active
                    FROM locations
                    WHERE id IN (
                        :source_id,
                        :destination_id
                    )
                """),
                {
                    "source_id": request.source_location_id,
                    "destination_id": request.destination_location_id,
                },
            ).mappings().all()

            location_by_id = {
                row["id"]: row
                for row in locations
            }

            source = location_by_id.get(
                request.source_location_id
            )
            destination = location_by_id.get(
                request.destination_location_id
            )

            if source is None or destination is None:
                raise HTTPException(
                    status_code=422,
                    detail="Source or destination location does not exist.",
                )

            for location in (source, destination):
                if not location["is_active"]:
                    raise HTTPException(
                        status_code=422,
                        detail="Both locations must be active.",
                    )

                if location["location_type"] != "BRC":
                    raise HTTPException(
                        status_code=422,
                        detail="Both locations must be BRC locations.",
                    )

            # Validate optional vehicle.
            if request.vehicle_id is not None:
                vehicle = connection.execute(
                    text("""
                        SELECT id, is_active, availability_status
                        FROM vehicles
                        WHERE id = :vehicle_id
                    """),
                    {
                        "vehicle_id": request.vehicle_id,
                    },
                ).mappings().first()

                if vehicle is None or not vehicle["is_active"]:
                    raise HTTPException(
                        status_code=422,
                        detail="Vehicle does not exist or is inactive.",
                    )

                if vehicle["availability_status"] != "AVAILABLE":
                    raise HTTPException(
                        status_code=422,
                        detail="Vehicle must have AVAILABLE status.",
                    )

            # Validate every requested battery.
            battery_rows = connection.execute(
                text("""
                    SELECT
                        id,
                        serial_number,
                        condition,
                        current_location_id,
                        lifecycle_status
                    FROM batteries
                    WHERE id = ANY(:battery_ids)
                    FOR UPDATE
                """),
                {
                    "battery_ids": request.battery_ids,
                },
            ).mappings().all()

            batteries_by_id = {
                row["id"]: row
                for row in battery_rows
            }

            missing_ids = [
                battery_id
                for battery_id in request.battery_ids
                if battery_id not in batteries_by_id
            ]

            if missing_ids:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "message": "Some batteries do not exist.",
                        "battery_ids": missing_ids,
                    },
                )

            invalid_location_batteries = [
                battery_id
                for battery_id in request.battery_ids
                if batteries_by_id[battery_id][
                    "current_location_id"
                ] != request.source_location_id
            ]

            if invalid_location_batteries:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "message": (
                            "Every battery must currently be "
                            "at the source location."
                        ),
                        "battery_ids": invalid_location_batteries,
                    },
                )

            invalid_status_batteries = [
                battery_id
                for battery_id in request.battery_ids
                if batteries_by_id[battery_id][
                    "lifecycle_status"
                ] != "ACTIVE"
            ]

            if invalid_status_batteries:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "message": (
                            "Only ACTIVE batteries can be added "
                            "to a new movement."
                        ),
                        "battery_ids": invalid_status_batteries,
                    },
                )

            # Create the movement in DRAFT status.
            movement = connection.execute(
                text("""
                    INSERT INTO battery_movements (
                        movement_code,
                        movement_type,
                        source_location_id,
                        destination_location_id,
                        vehicle_id,
                        movement_date,
                        status,
                        notes
                    )
                    VALUES (
                        :movement_code,
                        :movement_type,
                        :source_location_id,
                        :destination_location_id,
                        :vehicle_id,
                        :movement_date,
                        'DRAFT',
                        :notes
                    )
                    RETURNING
                        id,
                        movement_code,
                        movement_type,
                        source_location_id,
                        destination_location_id,
                        vehicle_id,
                        movement_date,
                        status,
                        notes,
                        created_at
                """),
                {
                    "movement_code": movement_code,
                    "movement_type": movement_type,
                    "source_location_id": request.source_location_id,
                    "destination_location_id": request.destination_location_id,
                    "vehicle_id": request.vehicle_id,
                    "movement_date": movement_date,
                    "notes": request.notes,
                },
            ).mappings().one()

            # Attach the batteries to the movement.
            for battery_id in request.battery_ids:
                battery = batteries_by_id[battery_id]

                connection.execute(
                    text("""
                        INSERT INTO battery_movement_items (
                            movement_id,
                            battery_id,
                            condition_at_dispatch,
                            received
                        )
                        VALUES (
                            :movement_id,
                            :battery_id,
                            :condition,
                            FALSE
                        )
                    """),
                    {
                        "movement_id": movement["id"],
                        "battery_id": battery_id,
                        "condition": battery["condition"],
                    },
                )

        return {
            **dict(movement),
            "battery_ids": request.battery_ids,
            "battery_count": len(request.battery_ids),
            "message": (
                "Movement created successfully in DRAFT status. "
                "Battery locations have not been changed."
            ),
        }

    except IntegrityError as exc:
        raise HTTPException(
            status_code=409,
            detail=(
                "Movement could not be created because of a "
                "database constraint conflict."
            ),
        ) from exc


# =========================================================
# BATTERY MOVEMENT LIST API
# =========================================================

@app.get("/api/v1/movements")
def get_movements(
    user=Depends(current_user),
):
    query = text("""
        SELECT
            m.id,
            m.movement_code,
            m.movement_type,
            m.source_location_id,
            source.name AS source_location,
            m.destination_location_id,
            destination.name AS destination_location,
            m.vehicle_id,
            v.vehicle_code,
            m.movement_date,
            m.status,
            m.dispatched_at,
            m.received_at,
            m.notes,
            m.created_at,
            COUNT(item.id) AS battery_count,
            COUNT(item.id) FILTER (
                WHERE item.received = TRUE
            ) AS received_battery_count
        FROM battery_movements m
        JOIN locations source
            ON source.id = m.source_location_id
        JOIN locations destination
            ON destination.id = m.destination_location_id
        LEFT JOIN vehicles v
            ON v.id = m.vehicle_id
        LEFT JOIN battery_movement_items item
            ON item.movement_id = m.id
        GROUP BY
            m.id,
            source.name,
            destination.name,
            v.vehicle_code
        ORDER BY
            m.created_at DESC,
            m.id DESC
    """)

    with engine.connect() as connection:
        rows = connection.execute(
            query
        ).mappings().all()

    return {
        "count": len(rows),
        "movements": [
            dict(row)
            for row in rows
        ],
    }


# =========================================================
# DISPATCH BATTERY MOVEMENT API
# =========================================================

@app.post("/api/v1/movements/{movement_id}/dispatch")
def dispatch_movement(
    movement_id: int,
    user=Depends(current_user),
):
    from datetime import datetime, timezone

    with engine.begin() as connection:
        # Lock movement row to prevent concurrent dispatch.
        movement = connection.execute(
            text("""
                SELECT
                    id,
                    movement_type,
                    source_location_id,
                    destination_location_id,
                    status
                FROM battery_movements
                WHERE id = :movement_id
                FOR UPDATE
            """),
            {"movement_id": movement_id},
        ).mappings().first()

        if movement is None:
            raise HTTPException(
                status_code=404,
                detail="Movement not found.",
            )

        if movement["status"] != "DRAFT":
            raise HTTPException(
                status_code=409,
                detail=(
                    "Only DRAFT movements can be dispatched. "
                    f"Current status: {movement['status']}"
                ),
            )

        items = connection.execute(
            text("""
                SELECT
                    mi.battery_id,
                    b.current_location_id,
                    b.lifecycle_status
                FROM battery_movement_items mi
                JOIN batteries b ON b.id = mi.battery_id
                WHERE mi.movement_id = :movement_id
                FOR UPDATE OF b
            """),
            {"movement_id": movement_id},
        ).mappings().all()

        if not items:
            raise HTTPException(
                status_code=422,
                detail="Cannot dispatch a movement without batteries.",
            )

        invalid_batteries = [
            item["battery_id"]
            for item in items
            if (
                item["current_location_id"]
                != movement["source_location_id"]
                or item["lifecycle_status"] != "ACTIVE"
            )
        ]

        if invalid_batteries:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": (
                        "All batteries must be ACTIVE and located "
                        "at the movement source before dispatch."
                    ),
                    "battery_ids": invalid_batteries,
                },
            )

        dispatched_at = datetime.now(timezone.utc)

        connection.execute(
            text("""
                UPDATE battery_movements
                SET status = 'DISPATCHED',
                    dispatched_at = :dispatched_at
                WHERE id = :movement_id
            """),
            {
                "movement_id": movement_id,
                "dispatched_at": dispatched_at,
            },
        )

        connection.execute(
            text("""
                UPDATE batteries
                SET lifecycle_status = 'IN_TRANSIT'
                WHERE id = ANY(:battery_ids)
            """),
            {
                "battery_ids": [
                    item["battery_id"] for item in items
                ],
            },
        )

    return {
        "movement_id": movement_id,
        "status": "DISPATCHED",
        "battery_ids": [
            item["battery_id"] for item in items
        ],
        "battery_count": len(items),
        "message": (
            "Movement dispatched successfully. "
            "Batteries are now IN_TRANSIT."
        ),
    }

# =========================================================
# DASHBOARD API
# =========================================================
# =========================================================
# RECEIVE BATTERY MOVEMENT API
# =========================================================

@app.post("/api/v1/movements/{movement_id}/receive")
def receive_movement(
    movement_id: int,
    user=Depends(current_user),
):
    from datetime import datetime, timezone

    with engine.begin() as connection:
        movement = connection.execute(
            text("""
                SELECT id, destination_location_id, status
                FROM battery_movements
                WHERE id = :movement_id
                FOR UPDATE
            """),
            {"movement_id": movement_id},
        ).mappings().first()

        if movement is None:
            raise HTTPException(
                status_code=404,
                detail="Movement not found.",
            )

        if movement["status"] not in (
            "DISPATCHED",
            "PARTIALLY_RECEIVED",
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Only dispatched movements can be received. "
                    f"Current status: {movement['status']}"
                ),
            )

        items = connection.execute(
            text("""
                SELECT mi.battery_id, mi.received,
                       b.lifecycle_status
                FROM battery_movement_items mi
                JOIN batteries b ON b.id = mi.battery_id
                WHERE mi.movement_id = :movement_id
                FOR UPDATE OF mi, b
            """),
            {"movement_id": movement_id},
        ).mappings().all()

        pending = [
            item for item in items
            if not item["received"]
        ]

        if not pending:
            raise HTTPException(
                status_code=409,
                detail="All batteries in this movement are already received.",
            )

        invalid = [
            item["battery_id"]
            for item in pending
            if item["lifecycle_status"] != "IN_TRANSIT"
        ]

        if invalid:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Batteries must be IN_TRANSIT.",
                    "battery_ids": invalid,
                },
            )

        received_at = datetime.now(timezone.utc)
        battery_ids = [item["battery_id"] for item in pending]

        connection.execute(
            text("""
                UPDATE battery_movement_items
                SET received = TRUE,
                    received_at = :received_at
                WHERE movement_id = :movement_id
                  AND received = FALSE
            """),
            {
                "received_at": received_at,
                "movement_id": movement_id,
            },
        )

        connection.execute(
            text("""
                UPDATE batteries
                SET current_location_id = :destination_id,
                    lifecycle_status = 'ACTIVE'
                WHERE id = ANY(:battery_ids)
            """),
            {
                "destination_id": movement["destination_location_id"],
                "battery_ids": battery_ids,
            },
        )

        remaining = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM battery_movement_items
                WHERE movement_id = :movement_id
                  AND received = FALSE
            """),
            {"movement_id": movement_id},
        ).scalar_one()

        new_status = (
            "PARTIALLY_RECEIVED" if remaining > 0
            else "RECEIVED"
        )

        connection.execute(
            text("""
                UPDATE battery_movements
                SET status = CAST(:status AS VARCHAR),
                    received_at = CASE
                        WHEN CAST(:status AS VARCHAR) = 'RECEIVED'
                        THEN :received_at
                        ELSE received_at
                    END
                WHERE id = :movement_id
            """),
            {
                "status": new_status,
                "received_at": received_at,
                "movement_id": movement_id,
            },
        )

    return {
        "movement_id": movement_id,
        "status": new_status,
        "received_battery_ids": battery_ids,
        "received_count": len(battery_ids),
        "message": "Battery receipt processed successfully.",
    }

@app.get("/api/v1/dashboard")
def get_dashboard(
    user=Depends(current_user),
):
    with engine.connect() as connection:
        vehicles = connection.execute(
            text("""
                SELECT
                    id,
                    vehicle_code,
                    registration_number,
                    driver_name,
                    payload_capacity_kg,
                    availability_status,
                    is_active
                FROM vehicles
                ORDER BY vehicle_code
            """)
        ).mappings().all()

        jobs = connection.execute(
            text("""
                SELECT
                    j.id,
                    j.job_code,
                    j.operating_date,
                    j.job_type,
                    j.battery_quantity,
                    j.total_weight_kg,
                    j.status,
                    pickup.name AS pickup_location,
                    delivery.name AS delivery_location,
                    v.vehicle_code AS assigned_vehicle
                FROM jobs j
                JOIN locations pickup
                    ON pickup.id = j.pickup_location_id
                JOIN locations delivery
                    ON delivery.id = j.delivery_location_id
                LEFT JOIN vehicles v
                    ON v.id = j.assigned_vehicle_id
                ORDER BY
                    j.operating_date,
                    j.job_code
            """)
        ).mappings().all()

    vehicle_data = [
        dict(row)
        for row in vehicles
    ]

    job_data = [
        dict(row)
        for row in jobs
    ]

    return {
        "source": "postgresql",
        "planning_status": (
            "NO_DATA"
            if not job_data
            else "DRAFT"
        ),
        "metrics": {
            "total_jobs": len(job_data),
            "total_vehicles": len(vehicle_data),
            "active_vehicles": sum(
                1
                for vehicle in vehicle_data
                if vehicle["is_active"]
            ),
            "unassigned_jobs": sum(
                1
                for job in job_data
                if job["status"].upper() == "UNASSIGNED"
            ),
            "completed_jobs": sum(
                1
                for job in job_data
                if job["status"].upper() == "COMPLETED"
            ),
        },
        "vehicles": vehicle_data,
        "jobs": job_data,
    }
@app.get("/api/v1/locations")
def get_locations(user=Depends(current_user)):
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    id,
                    code,
                    name,
                    location_type,
                    address,
                    latitude,
                    longitude,
                    is_active
                FROM locations
                WHERE is_active = TRUE
                  AND location_type = 'BRC'
                ORDER BY name
            """)
        )

        locations = [dict(row._mapping) for row in result]

    return {"locations": locations}