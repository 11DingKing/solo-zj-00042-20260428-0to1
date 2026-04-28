from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum
from datetime import date, timedelta
from calendar import monthrange

from maintenance.models import MaintenanceTicket, MaintenanceRecord
from billing.models import Bill, PaymentRecord
from properties.models import MaintenanceWorker, Building, House
from announcements.models import Announcement, AnnouncementRead
from accounts.permissions import IsAdmin
from property_management.cache_utils import safe_cache


class AdminDashboardView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        cache_key = 'admin_dashboard_main'
        cached_data = safe_cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        today = date.today()
        current_month = today.strftime('%Y-%m')
        start_of_today = today
        end_of_today = today + timedelta(days=1)
        
        today_new_tickets = MaintenanceTicket.objects.filter(
            created_at__date=today
        ).count()
        
        pending_tickets = MaintenanceTicket.objects.filter(
            status__in=['pending_assign', 'assigned', 'in_progress']
        ).count()
        
        total_bills = Bill.objects.count()
        paid_bills = Bill.objects.filter(status='paid').count()
        payment_rate = round((paid_bills / total_bills * 100), 2) if total_bills > 0 else 0
        
        ticket_type_stats = MaintenanceTicket.objects.values(
            'repair_type'
        ).annotate(
            count=Count('id')
        )
        
        type_mapping = {
            'electric_plumbing': '水电维修',
            'pipe_clearing': '管道疏通',
            'door_window': '门窗维修',
            'public_facility': '公共设施',
            'elevator': '电梯故障',
            'other': '其他',
        }
        
        type_stats_list = []
        for item in ticket_type_stats:
            type_stats_list.append({
                'type': item['repair_type'],
                'name': type_mapping.get(item['repair_type'], '其他'),
                'count': item['count']
            })
        
        monthly_trend = []
        for i in range(11, -1, -1):
            month_date = today.replace(day=1) - timedelta(days=i * 30)
            month_str = month_date.strftime('%Y-%m')
            
            month_bills = Bill.objects.filter(
                billing_month=month_str,
                bill_type='property_fee'
            )
            total = month_bills.aggregate(Sum('amount'))['amount__sum'] or 0
            paid = month_bills.filter(status='paid').aggregate(Sum('amount'))['amount__sum'] or 0
            
            monthly_trend.append({
                'month': month_str,
                'total': float(total),
                'paid': float(paid)
            })
        
        worker_stats = MaintenanceWorker.objects.annotate(
            ticket_count=Count('assigned_tickets')
        ).order_by('-ticket_count')[:10]
        
        worker_list = []
        for worker in worker_stats:
            completed_count = MaintenanceTicket.objects.filter(
                assigned_worker=worker,
                status='completed'
            ).count()
            
            worker_list.append({
                'id': worker.id,
                'name': worker.name,
                'skill_type': worker.skill_type,
                'skill_type_display': worker.get_skill_type_display(),
                'status': worker.status,
                'ticket_count': worker.ticket_count,
                'completed_count': completed_count
            })
        
        overdue_bills = Bill.objects.filter(
            status__in=['overdue', 'pending'],
            due_date__lt=today
        ).select_related('house', 'house__owner')
        
        arrears_list = []
        for bill in overdue_bills[:20]:
            arrears_list.append({
                'id': bill.id,
                'bill_number': bill.bill_number,
                'house_address': bill.house.get_full_address() if bill.house else '',
                'owner_name': bill.house.owner.username if bill.house and bill.house.owner else None,
                'owner_phone': bill.house.owner.phone if bill.house and bill.house.owner else None,
                'amount': float(bill.amount),
                'billing_month': bill.billing_month,
                'due_date': bill.due_date
            })
        
        unread_announcements = Announcement.objects.filter(
            is_active=True
        ).exclude(
            reads__user=request.user
        ).count()
        
        data = {
            'today_new_tickets': today_new_tickets,
            'pending_tickets': pending_tickets,
            'current_month_payment_rate': payment_rate,
            'unread_announcements': unread_announcements,
            'ticket_type_stats': type_stats_list,
            'monthly_trend': monthly_trend,
            'worker_ranking': worker_list,
            'arrears_list': arrears_list
        }
        
        safe_cache.set(cache_key, data, 300)
        
        return Response(data)


class WorkerDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != 'maintenance':
            return Response({'error': '只有维修工可以访问'}, status=403)
        
        try:
            worker = user.worker_profile
        except Exception:
            return Response({'error': '维修工档案不存在'}, status=404)
        
        cache_key = f'worker_dashboard_{user.id}'
        cached_data = safe_cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        total_tickets = MaintenanceTicket.objects.filter(assigned_worker=worker).count()
        pending_tickets = MaintenanceTicket.objects.filter(
            assigned_worker=worker,
            status__in=['assigned', 'in_progress']
        ).count()
        completed_tickets = MaintenanceTicket.objects.filter(
            assigned_worker=worker,
            status='completed'
        ).count()
        
        avg_rating = MaintenanceTicket.objects.filter(
            assigned_worker=worker,
            status='completed',
            rating__isnull=False
        ).values_list('rating', flat=True)
        
        avg_rating_value = round(sum(avg_rating) / len(avg_rating), 1) if avg_rating else 0
        
        recent_tickets = MaintenanceTicket.objects.filter(
            assigned_worker=worker
        ).select_related('owner').order_by('-created_at')[:10]
        
        ticket_list = []
        for ticket in recent_tickets:
            ticket_list.append({
                'id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'repair_type': ticket.repair_type,
                'repair_type_display': ticket.get_repair_type_display(),
                'urgency': ticket.urgency,
                'urgency_display': ticket.get_urgency_display(),
                'status': ticket.status,
                'status_display': ticket.get_status_display(),
                'owner_name': ticket.owner.username if ticket.owner else '',
                'created_at': ticket.created_at
            })
        
        data = {
            'worker_name': worker.name,
            'skill_type': worker.skill_type,
            'skill_type_display': worker.get_skill_type_display(),
            'status': worker.status,
            'status_display': worker.get_status_display(),
            'total_tickets': total_tickets,
            'pending_tickets': pending_tickets,
            'completed_tickets': completed_tickets,
            'avg_rating': avg_rating_value,
            'recent_tickets': ticket_list
        }
        
        safe_cache.set(cache_key, data, 60)
        
        return Response(data)


class OwnerDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != 'owner':
            return Response({'error': '只有业主可以访问'}, status=403)
        
        cache_key = f'owner_dashboard_{user.id}'
        cached_data = safe_cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        house = None
        try:
            house = House.objects.get(owner=user)
        except House.DoesNotExist:
            pass
        
        total_tickets = MaintenanceTicket.objects.filter(owner=user).count()
        pending_tickets = MaintenanceTicket.objects.filter(
            owner=user,
            status__in=['pending_assign', 'assigned', 'in_progress', 'pending_confirm']
        ).count()
        completed_tickets = MaintenanceTicket.objects.filter(
            owner=user,
            status='completed'
        ).count()
        
        pending_bills = 0
        overdue_bills = 0
        pending_amount = 0
        overdue_amount = 0
        
        if house:
            bills = Bill.objects.filter(house=house)
            pending_bills = bills.filter(status='pending').count()
            overdue_bills = bills.filter(status='overdue').count()
            
            pending_amount = bills.filter(status='pending').aggregate(
                Sum('amount')
            )['amount__sum'] or 0
            overdue_amount = bills.filter(status='overdue').aggregate(
                Sum('amount')
            )['amount__sum'] or 0
        
        unread_announcements = Announcement.objects.filter(
            is_active=True
        ).exclude(
            reads__user=user
        ).count()
        
        recent_tickets = MaintenanceTicket.objects.filter(
            owner=user
        ).select_related('assigned_worker').order_by('-created_at')[:5]
        
        ticket_list = []
        for ticket in recent_tickets:
            ticket_list.append({
                'id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'repair_type': ticket.repair_type,
                'repair_type_display': ticket.get_repair_type_display(),
                'status': ticket.status,
                'status_display': ticket.get_status_display(),
                'worker_name': ticket.assigned_worker.name if ticket.assigned_worker else None,
                'created_at': ticket.created_at
            })
        
        recent_bills = []
        if house:
            recent_bills_qs = Bill.objects.filter(
                house=house
            ).order_by('-created_at')[:5]
            
            for bill in recent_bills_qs:
                recent_bills.append({
                    'id': bill.id,
                    'bill_number': bill.bill_number,
                    'title': bill.title,
                    'amount': float(bill.amount),
                    'status': bill.status,
                    'status_display': bill.get_status_display(),
                    'due_date': bill.due_date,
                    'is_overdue': bill.is_overdue()
                })
        
        house_info = None
        if house:
            house_info = {
                'id': house.id,
                'building_number': house.building.building_number,
                'unit_number': house.unit_number,
                'room_number': house.room_number,
                'area': float(house.area),
                'full_address': house.get_full_address()
            }
        
        data = {
            'house_info': house_info,
            'total_tickets': total_tickets,
            'pending_tickets': pending_tickets,
            'completed_tickets': completed_tickets,
            'pending_bills': pending_bills,
            'overdue_bills': overdue_bills,
            'pending_amount': float(pending_amount),
            'overdue_amount': float(overdue_amount),
            'unread_announcements': unread_announcements,
            'recent_tickets': ticket_list,
            'recent_bills': recent_bills
        }
        
        safe_cache.set(cache_key, data, 60)
        
        return Response(data)
