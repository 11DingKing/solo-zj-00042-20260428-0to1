from rest_framework import serializers
from django.core.files.uploadedfile import UploadedFile
from .models import MaintenanceTicket, TicketImage, MaintenanceRecord, TicketStatusLog
from properties.models import MaintenanceWorker


class TicketImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = TicketImage
        fields = ['id', 'image', 'image_url', 'is_after_repair', 'uploaded_at']
        read_only_fields = ['id', 'image_url', 'uploaded_at']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class TicketStatusLogSerializer(serializers.ModelSerializer):
    operator_name = serializers.CharField(source='operator.username', read_only=True)
    from_status_display = serializers.CharField(source='get_from_status_display', read_only=True)
    to_status_display = serializers.CharField(source='get_to_status_display', read_only=True)

    class Meta:
        model = TicketStatusLog
        fields = ['id', 'from_status', 'from_status_display', 'to_status', 'to_status_display', 
                  'operator_name', 'comment', 'created_at']


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRecord
        fields = ['id', 'repair_measures', 'materials_used', 'time_spent', 'completed_at']
        read_only_fields = ['id', 'completed_at']


class MaintenanceTicketSerializer(serializers.ModelSerializer):
    repair_type_display = serializers.CharField(source='get_repair_type_display', read_only=True)
    urgency_display = serializers.CharField(source='get_urgency_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    assigned_worker_name = serializers.CharField(source='assigned_worker.name', read_only=True)
    images = TicketImageSerializer(many=True, read_only=True)
    status_logs = TicketStatusLogSerializer(many=True, read_only=True)
    maintenance_record = MaintenanceRecordSerializer(read_only=True)

    class Meta:
        model = MaintenanceTicket
        fields = ['id', 'ticket_number', 'owner', 'owner_username', 'repair_type', 
                  'repair_type_display', 'description', 'urgency', 'urgency_display', 
                  'expected_time', 'status', 'status_display', 'assigned_worker', 
                  'assigned_worker_name', 'rating', 'rating_comment', 'images', 
                  'status_logs', 'maintenance_record', 'created_at', 'updated_at']
        read_only_fields = ['id', 'ticket_number', 'owner', 'owner_username', 
                           'repair_type_display', 'urgency_display', 'status_display', 
                           'assigned_worker_name', 'images', 'status_logs', 
                           'maintenance_record', 'created_at', 'updated_at']


class MaintenanceTicketListSerializer(serializers.ModelSerializer):
    repair_type_display = serializers.CharField(source='get_repair_type_display', read_only=True)
    urgency_display = serializers.CharField(source='get_urgency_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    assigned_worker_name = serializers.CharField(source='assigned_worker.name', read_only=True)

    class Meta:
        model = MaintenanceTicket
        fields = ['id', 'ticket_number', 'owner_username', 'repair_type', 
                  'repair_type_display', 'urgency', 'urgency_display', 
                  'status', 'status_display', 'assigned_worker_name', 
                  'rating', 'created_at']


class TicketCreateSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
        max_length=5
    )

    class Meta:
        model = MaintenanceTicket
        fields = ['repair_type', 'description', 'urgency', 'expected_time', 'images']

    def validate_images(self, value):
        if len(value) > 5:
            raise serializers.ValidationError('最多只能上传5张图片')
        return value

    def create(self, validated_data):
        images = validated_data.pop('images', [])
        validated_data['owner'] = self.context['request'].user
        ticket = MaintenanceTicket.objects.create(**validated_data)
        
        TicketStatusLog.objects.create(
            ticket=ticket,
            to_status=ticket.status,
            operator=self.context['request'].user,
            comment='工单创建'
        )
        
        for image in images:
            TicketImage.objects.create(ticket=ticket, image=image)
        
        return ticket


class TicketAssignSerializer(serializers.Serializer):
    worker_id = serializers.IntegerField()

    def validate_worker_id(self, value):
        try:
            worker = MaintenanceWorker.objects.get(id=value)
            return worker
        except MaintenanceWorker.DoesNotExist:
            raise serializers.ValidationError('维修工不存在')


class TicketCompleteSerializer(serializers.ModelSerializer):
    after_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
        max_length=5
    )

    class Meta:
        model = MaintenanceRecord
        fields = ['repair_measures', 'materials_used', 'time_spent', 'after_images']


class TicketRatingSerializer(serializers.Serializer):
    rating = serializers.ChoiceField(choices=[(i, f'{i}星') for i in range(1, 6)])
    comment = serializers.CharField(required=False, allow_blank=True)
