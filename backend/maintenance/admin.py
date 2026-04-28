from django.contrib import admin
from .models import MaintenanceTicket, TicketImage, MaintenanceRecord, TicketStatusLog


class TicketImageInline(admin.TabularInline):
    model = TicketImage
    extra = 0


class TicketStatusLogInline(admin.TabularInline):
    model = TicketStatusLog
    extra = 0
    readonly_fields = ['from_status', 'to_status', 'operator', 'comment', 'created_at']


@admin.register(MaintenanceTicket)
class MaintenanceTicketAdmin(admin.ModelAdmin):
    list_display = ['ticket_number', 'owner', 'repair_type', 'urgency', 'status', 'assigned_worker', 'created_at']
    list_filter = ['repair_type', 'urgency', 'status', 'created_at']
    search_fields = ['ticket_number', 'description']
    ordering = ['-created_at']
    raw_id_fields = ['owner', 'assigned_worker']
    inlines = [TicketImageInline, TicketStatusLogInline]
    readonly_fields = ['ticket_number', 'created_at', 'updated_at']


@admin.register(MaintenanceRecord)
class MaintenanceRecordAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'time_spent', 'completed_at']
    search_fields = ['ticket__ticket_number']
    ordering = ['-completed_at']
    raw_id_fields = ['ticket']


@admin.register(TicketStatusLog)
class TicketStatusLogAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'from_status', 'to_status', 'operator', 'created_at']
    list_filter = ['to_status', 'created_at']
    search_fields = ['ticket__ticket_number']
    ordering = ['-created_at']
    raw_id_fields = ['ticket', 'operator']
