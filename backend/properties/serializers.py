from rest_framework import serializers
from .models import Building, House, MaintenanceWorker
from django.contrib.auth import get_user_model

User = get_user_model()


class BuildingSerializer(serializers.ModelSerializer):
    house_count = serializers.SerializerMethodField()

    class Meta:
        model = Building
        fields = ['id', 'building_number', 'unit_count', 'floor_count', 'description', 'house_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_house_count(self, obj):
        return obj.houses.count()


class HouseSerializer(serializers.ModelSerializer):
    building_number = serializers.CharField(source='building.building_number', read_only=True)
    full_address = serializers.CharField(source='get_full_address', read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = House
        fields = ['id', 'building', 'building_number', 'unit_number', 'room_number', 
                  'area', 'owner', 'owner_username', 'full_address', 'description', 
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'building_number', 'full_address', 'owner_username', 'created_at', 'updated_at']


class HouseListSerializer(serializers.ModelSerializer):
    building_number = serializers.CharField(source='building.building_number', read_only=True)
    full_address = serializers.CharField(source='get_full_address', read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = House
        fields = ['id', 'building', 'building_number', 'unit_number', 'room_number', 
                  'area', 'owner', 'owner_username', 'full_address']


class MaintenanceWorkerSerializer(serializers.ModelSerializer):
    skill_type_display = serializers.CharField(source='get_skill_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = MaintenanceWorker
        fields = ['id', 'user', 'username', 'name', 'phone', 'skill_type', 
                  'skill_type_display', 'status', 'status_display', 'description', 
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'username', 'skill_type_display', 'status_display', 'created_at', 'updated_at']


class MaintenanceWorkerListSerializer(serializers.ModelSerializer):
    skill_type_display = serializers.CharField(source='get_skill_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = MaintenanceWorker
        fields = ['id', 'name', 'phone', 'skill_type', 'skill_type_display', 'status', 'status_display']


class HouseBindingSerializer(serializers.Serializer):
    building_id = serializers.IntegerField()
    unit_number = serializers.CharField(max_length=10)
    room_number = serializers.CharField(max_length=20)

    def validate(self, attrs):
        try:
            house = House.objects.get(
                building_id=attrs['building_id'],
                unit_number=attrs['unit_number'],
                room_number=attrs['room_number']
            )
            if house.owner is not None:
                raise serializers.ValidationError('该房屋已被绑定')
            attrs['house'] = house
        except House.DoesNotExist:
            raise serializers.ValidationError('房屋不存在，请检查楼栋、单元号、房号')
        return attrs


class WorkerRecommendationSerializer(serializers.ModelSerializer):
    skill_type_display = serializers.CharField(source='get_skill_type_display', read_only=True)
    is_recommended = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceWorker
        fields = ['id', 'name', 'phone', 'skill_type', 'skill_type_display', 'status', 'is_recommended']

    def __init__(self, *args, **kwargs):
        self.required_skill = kwargs.pop('required_skill', None)
        super().__init__(*args, **kwargs)

    def get_is_recommended(self, obj):
        if self.required_skill:
            return obj.skill_type == self.required_skill and obj.status == MaintenanceWorker.STATUS_IDLE
        return obj.status == MaintenanceWorker.STATUS_IDLE
