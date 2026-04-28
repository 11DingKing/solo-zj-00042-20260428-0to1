from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.core.cache import cache

from .models import Building, House, MaintenanceWorker
from .serializers import (
    BuildingSerializer,
    HouseSerializer,
    HouseListSerializer,
    MaintenanceWorkerSerializer,
    MaintenanceWorkerListSerializer,
    HouseBindingSerializer,
    WorkerRecommendationSerializer,
)
from accounts.permissions import IsAdmin, IsOwner


class BuildingViewSet(viewsets.ModelViewSet):
    queryset = Building.objects.all()
    serializer_class = BuildingSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['building_number']
    search_fields = ['building_number']
    ordering_fields = ['building_number', 'created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return super().get_permissions()


class HouseViewSet(viewsets.ModelViewSet):
    queryset = House.objects.select_related('building', 'owner').all()
    serializer_class = HouseSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['building', 'unit_number', 'owner']
    search_fields = ['room_number', 'unit_number']
    ordering_fields = ['building', 'unit_number', 'room_number']

    def get_serializer_class(self):
        if self.action == 'list':
            return HouseListSerializer
        return HouseSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return super().get_permissions()

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def available(self, request):
        houses = House.objects.select_related('building').filter(owner__isnull=True)
        serializer = HouseListSerializer(houses, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsOwner])
    def bind(self, request):
        serializer = HouseBindingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        house = serializer.validated_data['house']
        
        if hasattr(request.user, 'house') and request.user.house is not None:
            return Response(
                {'error': '您已经绑定了房屋，一个用户只能绑定一个房屋'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        house.owner = request.user
        house.save()
        
        cache.delete_many([f'user_profile_{request.user.id}'])
        
        return Response({'message': '房屋绑定成功'})

    @action(detail=False, methods=['post'], permission_classes=[IsOwner])
    def unbind(self, request):
        try:
            house = House.objects.get(owner=request.user)
            house.owner = None
            house.save()
            cache.delete_many([f'user_profile_{request.user.id}'])
            return Response({'message': '房屋解绑成功'})
        except House.DoesNotExist:
            return Response(
                {'error': '您还没有绑定房屋'},
                status=status.HTTP_400_BAD_REQUEST
            )


class MaintenanceWorkerViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceWorker.objects.select_related('user').all()
    serializer_class = MaintenanceWorkerSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['skill_type', 'status']
    search_fields = ['name', 'phone']
    ordering_fields = ['name', 'status', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return MaintenanceWorkerListSerializer
        return MaintenanceWorkerSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return super().get_permissions()

    @action(detail=False, methods=['get'], permission_classes=[IsAdmin])
    def recommendations(self, request):
        repair_type = request.query_params.get('repair_type', None)
        
        workers = MaintenanceWorker.objects.all()
        
        skill_mapping = {
            'electric_plumbing': MaintenanceWorker.SKILL_ELECTRIC_PLUMBING,
            'structure': MaintenanceWorker.SKILL_STRUCTURE,
            'door_window': MaintenanceWorker.SKILL_DOOR_WINDOW,
            'elevator': MaintenanceWorker.SKILL_ELEVATOR,
            'network': MaintenanceWorker.SKILL_NETWORK,
            'other': MaintenanceWorker.SKILL_OTHER,
        }
        
        required_skill = skill_mapping.get(repair_type)
        
        serializer = WorkerRecommendationSerializer(
            workers, 
            many=True, 
            required_skill=required_skill
        )
        
        sorted_workers = sorted(
            serializer.data,
            key=lambda x: (0 if x['is_recommended'] else 1, x['status'])
        )
        
        return Response(sorted_workers)
