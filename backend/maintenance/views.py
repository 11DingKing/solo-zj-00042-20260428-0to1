from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.core.cache import cache

from .models import MaintenanceTicket, TicketImage, MaintenanceRecord, TicketStatusLog
from .serializers import (
    MaintenanceTicketSerializer,
    MaintenanceTicketListSerializer,
    TicketCreateSerializer,
    TicketAssignSerializer,
    TicketCompleteSerializer,
    TicketRatingSerializer,
)
from accounts.permissions import IsAdmin, IsOwner, IsMaintenance, IsAdminOrOwner, IsAdminOrMaintenance


class MaintenanceTicketViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceTicket.objects.select_related(
        'owner', 'assigned_worker'
    ).prefetch_related(
        'images', 'status_logs', 'maintenance_record'
    ).all()
    serializer_class = MaintenanceTicketSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'repair_type', 'urgency', 'owner', 'assigned_worker']
    search_fields = ['ticket_number', 'description']
    ordering_fields = ['created_at', 'updated_at', 'ticket_number']

    def get_serializer_class(self):
        if self.action == 'list':
            return MaintenanceTicketListSerializer
        if self.action == 'create':
            return TicketCreateSerializer
        return MaintenanceTicketSerializer

    def get_permissions(self):
        if self.action in ['create', 'my_tickets', 'confirm', 'reject', 'rate']:
            return [IsOwner()]
        if self.action in ['assign']:
            return [IsAdmin()]
        if self.action in ['start', 'complete']:
            return [IsMaintenance()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.role == 'owner':
            queryset = queryset.filter(owner=user)
        elif user.role == 'maintenance':
            if hasattr(user, 'worker_profile'):
                queryset = queryset.filter(assigned_worker=user.worker_profile)
            else:
                queryset = queryset.none()
        
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save()
        
        cache.delete_pattern('dashboard_*')
        
        return Response(
            MaintenanceTicketSerializer(ticket, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'], url_path='my-tickets')
    def my_tickets(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = MaintenanceTicketListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = MaintenanceTicketListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='assign')
    def assign(self, request, pk=None):
        ticket = self.get_object()
        
        if not ticket.can_assign():
            return Response(
                {'error': '当前工单状态不允许派单'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = TicketAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        worker = serializer.validated_data['worker_id']
        
        with transaction.atomic():
            old_status = ticket.status
            ticket.assigned_worker = worker
            ticket.status = MaintenanceTicket.STATUS_ASSIGNED
            ticket.save()
            
            TicketStatusLog.objects.create(
                ticket=ticket,
                from_status=old_status,
                to_status=ticket.status,
                operator=request.user,
                comment=f'派单给维修工：{worker.name}'
            )
            
            worker.status = 'busy'
            worker.save()
        
        return Response(
            MaintenanceTicketSerializer(ticket, context={'request': request}).data
        )

    @action(detail=True, methods=['post'], url_path='start')
    def start(self, request, pk=None):
        ticket = self.get_object()
        
        if not hasattr(request.user, 'worker_profile'):
            return Response(
                {'error': '您不是维修工'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if ticket.assigned_worker != request.user.worker_profile:
            return Response(
                {'error': '这不是您的工单'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not ticket.can_start():
            return Response(
                {'error': '当前工单状态不允许开始维修'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            old_status = ticket.status
            ticket.status = MaintenanceTicket.STATUS_IN_PROGRESS
            ticket.save()
            
            TicketStatusLog.objects.create(
                ticket=ticket,
                from_status=old_status,
                to_status=ticket.status,
                operator=request.user,
                comment='开始维修'
            )
        
        return Response(
            MaintenanceTicketSerializer(ticket, context={'request': request}).data
        )

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        ticket = self.get_object()
        
        if not hasattr(request.user, 'worker_profile'):
            return Response(
                {'error': '您不是维修工'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if ticket.assigned_worker != request.user.worker_profile:
            return Response(
                {'error': '这不是您的工单'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not ticket.can_complete():
            return Response(
                {'error': '当前工单状态不允许完成维修'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = TicketCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            MaintenanceRecord.objects.create(
                ticket=ticket,
                repair_measures=serializer.validated_data['repair_measures'],
                materials_used=serializer.validated_data.get('materials_used'),
                time_spent=serializer.validated_data.get('time_spent', 0)
            )
            
            after_images = serializer.validated_data.get('after_images', [])
            for image in after_images:
                TicketImage.objects.create(
                    ticket=ticket,
                    image=image,
                    is_after_repair=True
                )
            
            old_status = ticket.status
            ticket.status = MaintenanceTicket.STATUS_PENDING_CONFIRM
            ticket.save()
            
            TicketStatusLog.objects.create(
                ticket=ticket,
                from_status=old_status,
                to_status=ticket.status,
                operator=request.user,
                comment='维修完成，等待业主确认'
            )
        
        return Response(
            MaintenanceTicketSerializer(ticket, context={'request': request}).data
        )

    @action(detail=True, methods=['post'], url_path='confirm')
    def confirm(self, request, pk=None):
        ticket = self.get_object()
        
        if ticket.owner != request.user:
            return Response(
                {'error': '这不是您的工单'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not ticket.can_confirm():
            return Response(
                {'error': '当前工单状态不允许确认'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            old_status = ticket.status
            ticket.status = MaintenanceTicket.STATUS_COMPLETED
            ticket.save()
            
            TicketStatusLog.objects.create(
                ticket=ticket,
                from_status=old_status,
                to_status=ticket.status,
                operator=request.user,
                comment='业主确认完成'
            )
            
            if ticket.assigned_worker:
                ticket.assigned_worker.status = 'idle'
                ticket.assigned_worker.save()
        
        cache.delete_pattern('dashboard_*')
        
        return Response(
            MaintenanceTicketSerializer(ticket, context={'request': request}).data
        )

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        ticket = self.get_object()
        
        if ticket.owner != request.user:
            return Response(
                {'error': '这不是您的工单'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not ticket.can_reject():
            return Response(
                {'error': '当前工单状态不允许打回'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        comment = request.data.get('comment', '')
        
        with transaction.atomic():
            old_status = ticket.status
            ticket.status = MaintenanceTicket.STATUS_IN_PROGRESS
            ticket.save()
            
            TicketStatusLog.objects.create(
                ticket=ticket,
                from_status=old_status,
                to_status=ticket.status,
                operator=request.user,
                comment=f'打回维修：{comment}' if comment else '打回维修'
            )
        
        return Response(
            MaintenanceTicketSerializer(ticket, context={'request': request}).data
        )

    @action(detail=True, methods=['post'], url_path='rate')
    def rate(self, request, pk=None):
        ticket = self.get_object()
        
        if ticket.owner != request.user:
            return Response(
                {'error': '这不是您的工单'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if ticket.status != MaintenanceTicket.STATUS_COMPLETED:
            return Response(
                {'error': '只能对已完成的工单进行评价'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if ticket.rating:
            return Response(
                {'error': '该工单已评价'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = TicketRatingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        ticket.rating = serializer.validated_data['rating']
        ticket.rating_comment = serializer.validated_data.get('comment', '')
        ticket.save()
        
        cache.delete_pattern('dashboard_*')
        
        return Response(
            MaintenanceTicketSerializer(ticket, context={'request': request}).data
        )
