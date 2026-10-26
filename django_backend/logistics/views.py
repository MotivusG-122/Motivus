from django.shortcuts import render

# Create your views here.
from .models import Jobs
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import transaction
from rest_framework import status
from .models import Jobs, Vehicles
from .models import Locations
from .models import Vehicles

@api_view(["GET"])
def locations_list(request):
    locations = Locations.objects.filter(is_active=True).order_by("id")

    data = [
        {
            "id": location.id,
            "code": location.code,
            "name": location.name,
            "location_type": location.location_type,
            "address": location.address,
        }
        for location in locations
    ]

    return Response({
        "count": len(data),
        "results": data,
    })
@api_view(["GET"])
def vehicles_list(request):
    vehicles = Vehicles.objects.filter(
        is_active=True
    ).order_by("id")

    data = [
        {
            "id": vehicle.id,
            "vehicle_code": vehicle.vehicle_code,
            "registration_number": vehicle.registration_number,
            "payload_capacity_kg": str(vehicle.payload_capacity_kg),
            "availability_status": vehicle.availability_status,
            "driver_name": vehicle.driver_name,
            "home_location_id": vehicle.home_location_id,
        }
        for vehicle in vehicles
    ]

    return Response({
        "count": len(data),
        "results": data,
    })

@api_view(["GET"])
def jobs_list(request):
    jobs = Jobs.objects.all().order_by("operating_date", "id")

    # Optional filters
    operating_date = request.query_params.get("operating_date")
    status = request.query_params.get("status")
    job_type = request.query_params.get("job_type")

    if operating_date:
        jobs = jobs.filter(operating_date=operating_date)

    if status:
        jobs = jobs.filter(status=status.upper())

    if job_type:
        jobs = jobs.filter(job_type=job_type.upper())

    data = [
        {
            "id": job.id,
            "job_code": job.job_code,
            "operating_date": str(job.operating_date),
            "job_type": job.job_type,
            "pickup_location_id": job.pickup_location_id,
            "delivery_location_id": job.delivery_location_id,
            "battery_type_id": job.battery_type_id,
            "battery_quantity": job.battery_quantity,
            "total_weight_kg": str(job.total_weight_kg),
            "status": job.status,
            "assigned_vehicle_id": job.assigned_vehicle_id,
        }
        for job in jobs
    ]

    return Response({
        "count": len(data),
        "results": data,
    })

@api_view(["POST"])
def assign_vehicle(request):
    job_id = request.data.get("job_id")
    vehicle_id = request.data.get("vehicle_id")

    if not job_id or not vehicle_id:
        return Response(
            {"error": "job_id and vehicle_id are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            job = Jobs.objects.select_for_update().get(id=job_id)
            vehicle = Vehicles.objects.select_for_update().get(id=vehicle_id)

            if not vehicle.is_active:
                return Response(
                    {"error": "Vehicle is inactive."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if vehicle.availability_status != "AVAILABLE":
                return Response(
                    {"error": "Vehicle is not available."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if job.status not in ("UNASSIGNED", "PENDING"):
                return Response(
                    {"error": "Job is not eligible for assignment."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if job.assigned_vehicle_id is not None:
                return Response(
                    {"error": "Job already has an assigned vehicle."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if job.total_weight_kg > vehicle.payload_capacity_kg:
                return Response(
                    {
                        "error": "Job weight exceeds vehicle capacity.",
                        "job_weight_kg": str(job.total_weight_kg),
                        "vehicle_capacity_kg": str(
                            vehicle.payload_capacity_kg
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            job.assigned_vehicle = vehicle
            job.status = "ASSIGNED"
            job.save(
                update_fields=["assigned_vehicle", "status"]
            )

            return Response({
                "message": "Vehicle assigned successfully.",
                "job_id": job.id,
                "job_code": job.job_code,
                "vehicle_id": vehicle.id,
                "vehicle_code": vehicle.vehicle_code,
                "status": job.status,
            })

    except Jobs.DoesNotExist:
        return Response(
            {"error": "Job not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Vehicles.DoesNotExist:
        return Response(
            {"error": "Vehicle not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
