# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class Batteries(models.Model):
    id = models.BigAutoField(primary_key=True)
    serial_number = models.CharField(unique=True, max_length=100)
    battery_type = models.ForeignKey('BatteryTypes', models.DO_NOTHING, blank=True, null=True)
    model_number = models.CharField(max_length=150, blank=True, null=True)
    capacity_ah = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    condition = models.CharField(max_length=30)
    current_location = models.ForeignKey('Locations', models.DO_NOTHING, blank=True, null=True)
    warranty_status = models.CharField(max_length=30)
    lifecycle_status = models.CharField(max_length=30)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'batteries'


class BatteryMovementItems(models.Model):
    id = models.BigAutoField(primary_key=True)
    movement = models.ForeignKey('BatteryMovements', models.DO_NOTHING)
    battery = models.ForeignKey(Batteries, models.DO_NOTHING)
    condition_at_dispatch = models.CharField(max_length=30, blank=True, null=True)
    condition_at_receipt = models.CharField(max_length=30, blank=True, null=True)
    received = models.BooleanField()
    received_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'battery_movement_items'
        unique_together = (('movement', 'battery'),)


class BatteryMovements(models.Model):
    id = models.BigAutoField(primary_key=True)
    movement_code = models.CharField(unique=True, max_length=60)
    movement_type = models.CharField(max_length=40)
    source_location = models.ForeignKey('Locations', models.DO_NOTHING)
    destination_location = models.ForeignKey('Locations', models.DO_NOTHING, related_name='batterymovements_destination_location_set')
    vehicle = models.ForeignKey('Vehicles', models.DO_NOTHING, blank=True, null=True)
    movement_date = models.DateField()
    status = models.CharField(max_length=30)
    dispatched_at = models.DateTimeField(blank=True, null=True)
    received_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'battery_movements'


class BatteryTypes(models.Model):
    id = models.BigAutoField(primary_key=True)
    type_code = models.CharField(unique=True, max_length=50)
    type_name = models.CharField(max_length=150)
    unit_weight_kg = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField()

    class Meta:
        managed = False
        db_table = 'battery_types'


class DeliveryChallans(models.Model):
    id = models.BigAutoField(primary_key=True)
    challan_number = models.CharField(unique=True, max_length=100)
    movement = models.ForeignKey(BatteryMovements, models.DO_NOTHING)
    challan_date = models.DateField()
    challan_type = models.CharField(max_length=30)
    external_reference = models.CharField(max_length=150, blank=True, null=True)
    transporter_name = models.CharField(max_length=150, blank=True, null=True)
    vehicle_number = models.CharField(max_length=30, blank=True, null=True)
    transport_id = models.CharField(max_length=100, blank=True, null=True)
    document_url = models.TextField(blank=True, null=True)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'delivery_challans'


class Disruptions(models.Model):
    id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=200)
    disruption_type = models.CharField(max_length=40)
    location = models.ForeignKey('Locations', models.DO_NOTHING, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    source = models.CharField(max_length=150, blank=True, null=True)
    reported_at = models.DateTimeField()
    last_verified_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=30)

    class Meta:
        managed = False
        db_table = 'disruptions'


class Jobs(models.Model):
    id = models.BigAutoField(primary_key=True)
    job_code = models.CharField(unique=True, max_length=50)
    operating_date = models.DateField()
    job_type = models.CharField(max_length=20)
    pickup_location = models.ForeignKey('Locations', models.DO_NOTHING)
    delivery_location = models.ForeignKey('Locations', models.DO_NOTHING, related_name='jobs_delivery_location_set')
    battery_type = models.ForeignKey(BatteryTypes, models.DO_NOTHING, blank=True, null=True)
    battery_quantity = models.IntegerField()
    total_weight_kg = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=30)
    assigned_vehicle = models.ForeignKey('Vehicles', models.DO_NOTHING, blank=True, null=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'jobs'


class Locations(models.Model):
    id = models.BigAutoField(primary_key=True)
    code = models.CharField(unique=True, max_length=50)
    name = models.CharField(max_length=150)
    location_type = models.CharField(max_length=30)
    address = models.TextField(blank=True, null=True)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    is_active = models.BooleanField()
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'locations'


class OperationalEvents(models.Model):
    id = models.BigAutoField(primary_key=True)
    vehicle = models.ForeignKey('Vehicles', models.DO_NOTHING, blank=True, null=True)
    job = models.ForeignKey(Jobs, models.DO_NOTHING, blank=True, null=True)
    location = models.ForeignKey(Locations, models.DO_NOTHING, blank=True, null=True)
    event_type = models.CharField(max_length=50)
    event_time = models.DateTimeField()
    source = models.CharField(max_length=30)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'operational_events'


class RoutePlans(models.Model):
    id = models.BigAutoField(primary_key=True)
    plan_date = models.DateField()
    version = models.IntegerField()
    status = models.CharField(max_length=30)
    planned_distance_km = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    estimated_duration_minutes = models.IntegerField(blank=True, null=True)
    approved_by = models.CharField(max_length=150, blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'route_plans'
        unique_together = (('plan_date', 'version'),)


class RouteStops(models.Model):
    id = models.BigAutoField(primary_key=True)
    route_plan = models.ForeignKey(RoutePlans, models.DO_NOTHING)
    vehicle = models.ForeignKey('Vehicles', models.DO_NOTHING)
    location = models.ForeignKey(Locations, models.DO_NOTHING)
    stop_sequence = models.IntegerField()
    planned_arrival = models.DateTimeField(blank=True, null=True)
    planned_departure = models.DateTimeField(blank=True, null=True)
    actual_arrival = models.DateTimeField(blank=True, null=True)
    actual_departure = models.DateTimeField(blank=True, null=True)
    event_source = models.CharField(max_length=30, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'route_stops'
        unique_together = (('route_plan', 'vehicle', 'stop_sequence'),)


class Users(models.Model):
    id = models.BigAutoField(primary_key=True)
    full_name = models.CharField(max_length=150)
    email = models.CharField(unique=True, max_length=254)
    password_hash = models.TextField()
    role = models.CharField(max_length=20)
    is_active = models.BooleanField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    last_login_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'users'


class Vehicles(models.Model):
    id = models.BigAutoField(primary_key=True)
    vehicle_code = models.CharField(unique=True, max_length=50)
    registration_number = models.CharField(unique=True, max_length=30, blank=True, null=True)
    payload_capacity_kg = models.DecimalField(max_digits=12, decimal_places=2)
    availability_status = models.CharField(max_length=30)
    gps_provider = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField()
    created_at = models.DateTimeField()
    driver_name = models.CharField(max_length=100, blank=True, null=True)
    home_location = models.ForeignKey(Locations, models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'vehicles'
