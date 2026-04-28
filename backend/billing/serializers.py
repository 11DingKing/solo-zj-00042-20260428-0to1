from rest_framework import serializers
from .models import BillingSetting, Bill, BillStatusLog, PaymentRecord
from properties.models import House


class BillingSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillingSetting
        fields = ['id', 'property_fee_per_sqm', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class BillStatusLogSerializer(serializers.ModelSerializer):
    operator_name = serializers.CharField(source='operator.username', read_only=True)
    from_status_display = serializers.CharField(source='get_from_status_display', read_only=True)
    to_status_display = serializers.CharField(source='get_to_status_display', read_only=True)

    class Meta:
        model = BillStatusLog
        fields = ['id', 'from_status', 'from_status_display', 'to_status', 'to_status_display', 
                  'operator_name', 'comment', 'created_at']


class PaymentRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentRecord
        fields = ['id', 'transaction_id', 'payment_method', 'amount', 'paid_at']
        read_only_fields = ['id', 'transaction_id', 'paid_at']


class BillSerializer(serializers.ModelSerializer):
    bill_type_display = serializers.CharField(source='get_bill_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    house_address = serializers.CharField(source='house.get_full_address', read_only=True)
    paid_by_username = serializers.CharField(source='paid_by.username', read_only=True)
    is_overdue = serializers.SerializerMethodField()
    status_logs = BillStatusLogSerializer(many=True, read_only=True)
    payment_record = PaymentRecordSerializer(read_only=True)

    class Meta:
        model = Bill
        fields = ['id', 'bill_number', 'house', 'house_address', 'bill_type', 
                  'bill_type_display', 'title', 'description', 'amount', 'area', 
                  'unit_price', 'billing_month', 'due_date', 'status', 'status_display', 
                  'is_overdue', 'paid_at', 'paid_by_username', 'status_logs', 
                  'payment_record', 'created_at', 'updated_at']
        read_only_fields = ['id', 'bill_number', 'bill_type_display', 'status_display', 
                           'is_overdue', 'paid_at', 'paid_by_username', 'status_logs', 
                           'payment_record', 'created_at', 'updated_at']

    def get_is_overdue(self, obj):
        return obj.is_overdue()


class BillListSerializer(serializers.ModelSerializer):
    bill_type_display = serializers.CharField(source='get_bill_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    house_address = serializers.CharField(source='house.get_full_address', read_only=True)
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Bill
        fields = ['id', 'bill_number', 'house_address', 'bill_type', 
                  'bill_type_display', 'title', 'amount', 'billing_month', 
                  'due_date', 'status', 'status_display', 'is_overdue', 
                  'paid_at', 'created_at']

    def get_is_overdue(self, obj):
        return obj.is_overdue()


class BillCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bill
        fields = ['house', 'bill_type', 'title', 'description', 'amount', 
                  'area', 'unit_price', 'billing_month', 'due_date']

    def validate(self, attrs):
        if attrs.get('bill_type') == Bill.TYPE_PROPERTY_FEE:
            if not attrs.get('amount'):
                house = attrs.get('house')
                area = attrs.get('area') or (house.area if house else 0)
                unit_price = attrs.get('unit_price') or 0
                if area and unit_price:
                    attrs['amount'] = area * unit_price
                else:
                    attrs['amount'] = 0
        return attrs


class MonthlyBillCreateSerializer(serializers.Serializer):
    billing_month = serializers.CharField(max_length=7, help_text='格式：YYYY-MM')
    due_date = serializers.DateField()
    building_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text='指定楼栋ID列表，不传则生成所有楼栋'
    )

    def validate_billing_month(self, value):
        import re
        if not re.match(r'^\d{4}-\d{2}$', value):
            raise serializers.ValidationError('计费月份格式错误，应为 YYYY-MM')
        return value


class BillStatisticsSerializer(serializers.Serializer):
    total_bills = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=20, decimal_places=2)
    paid_count = serializers.IntegerField()
    paid_amount = serializers.DecimalField(max_digits=20, decimal_places=2)
    pending_count = serializers.IntegerField()
    pending_amount = serializers.DecimalField(max_digits=20, decimal_places=2)
    overdue_count = serializers.IntegerField()
    overdue_amount = serializers.DecimalField(max_digits=20, decimal_places=2)
    payment_rate = serializers.FloatField()
