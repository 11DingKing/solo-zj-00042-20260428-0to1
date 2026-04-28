from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Sum, Count, F
from datetime import datetime, date

from .models import BillingSetting, Bill, BillStatusLog, PaymentRecord
from .serializers import (
    BillingSettingSerializer,
    BillSerializer,
    BillListSerializer,
    BillCreateSerializer,
    MonthlyBillCreateSerializer,
    BillStatisticsSerializer,
)
from properties.models import House, Building
from accounts.permissions import IsAdmin, IsOwner
from property_management.cache_utils import safe_cache


class BillingSettingViewSet(viewsets.ModelViewSet):
    queryset = BillingSetting.objects.all()
    serializer_class = BillingSettingSerializer
    permission_classes = [IsAdmin]
    pagination_class = None

    @action(detail=False, methods=['get'], url_path='current', permission_classes=[IsAuthenticated])
    def current_setting(self, request):
        setting = BillingSetting.objects.filter(is_active=True).first()
        if not setting:
            setting = BillingSetting.objects.create(property_fee_per_sqm=0, is_active=True)
        serializer = self.get_serializer(setting)
        return Response(serializer.data)


class BillViewSet(viewsets.ModelViewSet):
    queryset = Bill.objects.select_related(
        'house', 'paid_by'
    ).prefetch_related(
        'status_logs', 'payment_record'
    ).all()
    serializer_class = BillSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'bill_type', 'billing_month', 'house']
    search_fields = ['bill_number', 'title']
    ordering_fields = ['created_at', 'due_date', 'amount']

    def get_serializer_class(self):
        if self.action == 'list':
            return BillListSerializer
        if self.action == 'create':
            return BillCreateSerializer
        return BillSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'generate_monthly', 'statistics']:
            return [IsAdmin()]
        if self.action in ['my_bills', 'pay', 'payment_records']:
            return [IsOwner()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.role == 'owner':
            try:
                house = House.objects.get(owner=user)
                queryset = queryset.filter(house=house)
            except House.DoesNotExist:
                queryset = queryset.none()
        
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bill = serializer.save()
        
        BillStatusLog.objects.create(
            bill=bill,
            to_status=bill.status,
            operator=request.user,
            comment='账单创建'
        )
        
        safe_cache.delete_pattern('dashboard_*')
        
        return Response(
            BillSerializer(bill, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'], url_path='my-bills')
    def my_bills(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = BillListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = BillListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='pay')
    def pay(self, request, pk=None):
        bill = self.get_object()
        
        if bill.status == Bill.STATUS_PAID:
            return Response(
                {'error': '该账单已缴费'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            house = House.objects.get(owner=request.user)
            if bill.house != house:
                return Response(
                    {'error': '这不是您的账单'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except House.DoesNotExist:
            return Response(
                {'error': '您还没有绑定房屋'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            bill.pay(request.user)
            
            PaymentRecord.objects.create(
                bill=bill,
                amount=bill.amount,
                payment_method='online'
            )
        
        safe_cache.delete_pattern('dashboard_*')
        
        return Response(
            BillSerializer(bill, context={'request': request}).data
        )

    @action(detail=False, methods=['post'], url_path='generate-monthly')
    def generate_monthly(self, request):
        serializer = MonthlyBillCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        billing_month = serializer.validated_data['billing_month']
        due_date = serializer.validated_data['due_date']
        building_ids = serializer.validated_data.get('building_ids', [])
        
        setting = BillingSetting.objects.filter(is_active=True).first()
        unit_price = setting.property_fee_per_sqm if setting else 0
        
        existing_bills = Bill.objects.filter(
            bill_type=Bill.TYPE_PROPERTY_FEE,
            billing_month=billing_month
        ).values_list('house_id', flat=True)
        
        houses_query = House.objects.select_related('building')
        
        if building_ids:
            houses_query = houses_query.filter(building_id__in=building_ids)
        
        houses = houses_query.exclude(id__in=existing_bills)
        
        created_count = 0
        for house in houses:
            amount = house.area * unit_price
            
            bill = Bill.objects.create(
                house=house,
                bill_type=Bill.TYPE_PROPERTY_FEE,
                title=f'{billing_month} 物业费',
                description=f'{house.get_full_address()} {billing_month} 物业费',
                amount=amount,
                area=house.area,
                unit_price=unit_price,
                billing_month=billing_month,
                due_date=due_date
            )
            
            BillStatusLog.objects.create(
                bill=bill,
                to_status=Bill.STATUS_PENDING,
                operator=request.user,
                comment=f'自动生成 {billing_month} 物业费账单'
            )
            
            created_count += 1
        
        safe_cache.delete_pattern('dashboard_*')
        
        return Response({
            'message': f'成功生成 {created_count} 条账单',
            'created_count': created_count,
            'skipped_count': houses_query.count() - created_count
        })

    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        cache_key = 'dashboard_billing_statistics'
        cached_data = safe_cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        total_bills = Bill.objects.count()
        total_amount = Bill.objects.aggregate(Sum('amount'))['amount__sum'] or 0
        
        paid_bills = Bill.objects.filter(status=Bill.STATUS_PAID)
        paid_count = paid_bills.count()
        paid_amount = paid_bills.aggregate(Sum('amount'))['amount__sum'] or 0
        
        pending_bills = Bill.objects.filter(status=Bill.STATUS_PENDING)
        pending_count = pending_bills.count()
        pending_amount = pending_bills.aggregate(Sum('amount'))['amount__sum'] or 0
        
        overdue_bills = Bill.objects.filter(status=Bill.STATUS_OVERDUE)
        overdue_count = overdue_bills.count()
        overdue_amount = overdue_bills.aggregate(Sum('amount'))['amount__sum'] or 0
        
        payment_rate = round((paid_count / total_bills * 100), 2) if total_bills > 0 else 0
        
        buildings = Building.objects.annotate(
            total_amount=Sum('houses__bills__amount'),
            paid_amount=Sum('houses__bills__amount', filter=models.Q(houses__bills__status=Bill.STATUS_PAID)),
            bill_count=Count('houses__bills'),
            paid_count=Count('houses__bills', filter=models.Q(houses__bills__status=Bill.STATUS_PAID)),
        ).values(
            'id', 'building_number', 'total_amount', 'paid_amount', 'bill_count', 'paid_count'
        )
        
        building_stats = []
        for b in buildings:
            if b['bill_count'] > 0:
                rate = round((b['paid_count'] / b['bill_count'] * 100), 2)
            else:
                rate = 0
            building_stats.append({
                'building_id': b['id'],
                'building_number': b['building_number'],
                'total_amount': b['total_amount'] or 0,
                'paid_amount': b['paid_amount'] or 0,
                'payment_rate': rate
            })
        
        today = date.today()
        current_month = today.strftime('%Y-%m')
        
        monthly_data = []
        for i in range(11, -1, -1):
            month_date = today.replace(day=1) - (i * 30)
            month_str = month_date.strftime('%Y-%m')
            
            month_bills = Bill.objects.filter(
                billing_month=month_str,
                bill_type=Bill.TYPE_PROPERTY_FEE
            )
            total = month_bills.aggregate(Sum('amount'))['amount__sum'] or 0
            paid = month_bills.filter(status=Bill.STATUS_PAID).aggregate(Sum('amount'))['amount__sum'] or 0
            
            monthly_data.append({
                'month': month_str,
                'total': float(total),
                'paid': float(paid)
            })
        
        data = {
            'total_bills': total_bills,
            'total_amount': float(total_amount),
            'paid_count': paid_count,
            'paid_amount': float(paid_amount),
            'pending_count': pending_count,
            'pending_amount': float(pending_amount),
            'overdue_count': overdue_count,
            'overdue_amount': float(overdue_amount),
            'payment_rate': payment_rate,
            'building_stats': building_stats,
            'monthly_trend': monthly_data
        }
        
        safe_cache.set(cache_key, data, 300)
        
        return Response(data)

    @action(detail=False, methods=['get'], url_path='payment-records')
    def payment_records(self, request):
        try:
            house = House.objects.get(owner=request.user)
            bills = Bill.objects.filter(house=house, status=Bill.STATUS_PAID).select_related('payment_record')
            
            records = []
            for bill in bills:
                if hasattr(bill, 'payment_record'):
                    records.append({
                        'id': bill.id,
                        'bill_number': bill.bill_number,
                        'title': bill.title,
                        'amount': float(bill.amount),
                        'transaction_id': bill.payment_record.transaction_id,
                        'payment_method': bill.payment_record.payment_method,
                        'paid_at': bill.paid_at
                    })
            
            return Response(records)
        except House.DoesNotExist:
            return Response([])

    @action(detail=False, methods=['get'], url_path='arrears')
    def arrears_list(self, request):
        from django.db.models import Q
        
        overdue_bills = Bill.objects.filter(
            Q(status=Bill.STATUS_OVERDUE) | Q(status=Bill.STATUS_PENDING, due_date__lt=date.today())
        ).select_related('house', 'house__owner')
        
        arrears = []
        for bill in overdue_bills:
            arrears.append({
                'id': bill.id,
                'bill_number': bill.bill_number,
                'house_address': bill.house.get_full_address(),
                'owner_name': bill.house.owner.username if bill.house.owner else None,
                'owner_phone': bill.house.owner.phone if bill.house.owner else None,
                'amount': float(bill.amount),
                'billing_month': bill.billing_month,
                'due_date': bill.due_date,
                'is_overdue': bill.is_overdue()
            })
        
        return Response(arrears)
