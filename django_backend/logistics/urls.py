from .views import (
    locations_list,
    vehicles_list,
    jobs_list,
    assign_vehicle,
)
from django.urls import path
urlpatterns = [
    path("locations/", locations_list, name="locations-list"),
    path("vehicles/", vehicles_list, name="vehicles-list"),
    path("jobs/", jobs_list, name="jobs-list"),
    path(
        "jobs/assign-vehicle/",
        assign_vehicle,
        name="assign-vehicle",
    ),
]