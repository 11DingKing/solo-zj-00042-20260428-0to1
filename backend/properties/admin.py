from django.contrib import admin
from .models import Building, House, MaintenanceWorker


@admin.register(Building)
class BuildingAdmin(admin.ModelAdmin):
    list_display = ['building_number', 'unit_count', 'floor_count', 'created_at']
    search_fields = ['building_number']
    ordering = ['building_number']


@admin.register(House)
class HouseAdmin(admin.ModelAdmin):
    list_display = ['building', 'unit_number', 'room_number', 'area', 'owner']
    list_filter = ['building']
    search_fields = ['room_number', 'unit_number']
    ordering = ['building', 'unit_number', 'room_number']
    raw_id_fields = ['building', 'owner']


@admin.register(MaintenanceWorker)
class MaintenanceWorkerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'skill_type', 'status', 'created_at']
    list_filter = ['skill_type', 'status']
    search_fields = ['name', 'phone']
    ordering = ['-created_at']
    raw_id_fields = ['user']
