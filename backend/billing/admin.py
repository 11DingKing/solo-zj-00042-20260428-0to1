from django.contrib import admin
from .models import BillingSetting, Bill, BillStatusLog, PaymentRecord


class BillStatusLogInline(admin.TabularInline):
    model = BillStatusLog
    extra = 0
    readonly_fields = ['from_status', 'to_status', 'operator', 'comment', 'created_at']


@admin.register(BillingSetting)
class BillingSettingAdmin(admin.ModelAdmin):
    list_display = ['property_fee_per_sqm', 'is_active', 'created_at']
    list_filter = ['is_active']


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ['bill_number', 'house', 'bill_type', 'title', 'amount', 'status', 'due_date', 'paid_at']
    list_filter = ['bill_type', 'status', 'due_date', 'created_at']
    search_fields = ['bill_number', 'title']
    ordering = ['-created_at']
    raw_id_fields = ['house', 'paid_by']
    readonly_fields = ['bill_number', 'created_at', 'updated_at']
    inlines = [BillStatusLogInline]


@admin.register(PaymentRecord)
class PaymentRecordAdmin(admin.ModelAdmin):
    list_display = ['transaction_id', 'bill', 'amount', 'payment_method', 'paid_at']
    search_fields = ['transaction_id', 'bill__bill_number']
    ordering = ['-paid_at']
    raw_id_fields = ['bill']
