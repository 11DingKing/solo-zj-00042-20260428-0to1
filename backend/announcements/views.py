from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Announcement, AnnouncementRead
from .serializers import (
    AnnouncementSerializer,
    AnnouncementListSerializer,
    AnnouncementCreateSerializer,
    UnreadCountSerializer,
)
from accounts.permissions import IsAdmin
from property_management.cache_utils import safe_cache


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.select_related('created_by').all()
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['is_pinned', 'is_active']
    search_fields = ['title']
    ordering_fields = ['created_at', 'is_pinned']

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.role != 'admin':
            queryset = queryset.filter(is_active=True)
        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return AnnouncementListSerializer
        if self.action == 'create':
            return AnnouncementCreateSerializer
        return AnnouncementSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return super().get_permissions()

    def list(self, request, *args, **kwargs):
        cache_key = f'announcements_list_{request.user.id}'
        cached_data = safe_cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={'request': request})
            response = self.get_paginated_response(serializer.data)
        else:
            serializer = self.get_serializer(queryset, many=True, context={'request': request})
            response = Response(serializer.data)
        
        safe_cache.set(cache_key, response.data, 300)
        return response

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        if not AnnouncementRead.objects.filter(announcement=instance, user=request.user).exists():
            AnnouncementRead.objects.create(
                announcement=instance,
                user=request.user
            )
            safe_cache.delete_pattern(f'announcements_list_*')
            safe_cache.delete_pattern(f'dashboard_*')
        
        serializer = self.get_serializer(instance, context={'request': request})
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        announcement = serializer.save(created_by=request.user)
        
        safe_cache.delete_pattern('announcements_list_*')
        safe_cache.delete_pattern('dashboard_*')
        
        return Response(
            AnnouncementSerializer(announcement, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        safe_cache.delete_pattern('announcements_list_*')
        safe_cache.delete_pattern('dashboard_*')
        return response

    def destroy(self, request, *args, **kwargs):
        response = super().destroy(request, *args, **kwargs)
        safe_cache.delete_pattern('announcements_list_*')
        safe_cache.delete_pattern('dashboard_*')
        return response

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        cache_key = f'announcements_unread_{request.user.id}'
        cached_count = safe_cache.get(cache_key)
        
        if cached_count is not None:
            return Response({'unread_count': cached_count})
        
        read_ids = AnnouncementRead.objects.filter(
            user=request.user
        ).values_list('announcement_id', flat=True)
        
        unread_count = Announcement.objects.filter(
            is_active=True
        ).exclude(id__in=read_ids).count()
        
        safe_cache.set(cache_key, unread_count, 60)
        
        return Response({'unread_count': unread_count})

    @action(detail=False, methods=['get'], url_path='latest')
    def latest(self, request):
        cache_key = f'announcements_latest_{request.user.id}'
        cached_data = safe_cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        announcements = self.get_queryset()[:10]
        serializer = AnnouncementListSerializer(
            announcements, 
            many=True, 
            context={'request': request}
        )
        
        safe_cache.set(cache_key, serializer.data, 300)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        announcement = self.get_object()
        
        obj, created = AnnouncementRead.objects.get_or_create(
            announcement=announcement,
            user=request.user
        )
        
        if created:
            safe_cache.delete_pattern(f'announcements_list_*')
            safe_cache.delete_pattern(f'announcements_unread_{request.user.id}')
            safe_cache.delete_pattern('dashboard_*')
        
        return Response({'message': '已标记为已读'})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        unread_announcements = Announcement.objects.filter(is_active=True).exclude(
            reads__user=request.user
        )
        
        for announcement in unread_announcements:
            AnnouncementRead.objects.get_or_create(
                announcement=announcement,
                user=request.user
            )
        
        safe_cache.delete_pattern(f'announcements_list_*')
        safe_cache.delete_pattern(f'announcements_unread_{request.user.id}')
        safe_cache.delete_pattern('dashboard_*')
        
        return Response({'message': '已标记所有公告为已读'})
