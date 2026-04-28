from rest_framework import serializers
from .models import Announcement, AnnouncementRead


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = ['id', 'title', 'content', 'is_pinned', 'is_active', 
                  'created_by_name', 'is_read', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by_name', 'is_read', 'created_at', 'updated_at']

    def get_is_read(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.is_authenticated:
            return AnnouncementRead.objects.filter(announcement=obj, user=user).exists()
        return False


class AnnouncementListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    is_read = serializers.SerializerMethodField()
    summary = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = ['id', 'title', 'summary', 'is_pinned', 'is_active', 
                  'created_by_name', 'is_read', 'created_at']

    def get_is_read(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.is_authenticated:
            return AnnouncementRead.objects.filter(announcement=obj, user=user).exists()
        return False

    def get_summary(self, obj):
        if obj.content:
            return obj.content[:100] + '...' if len(obj.content) > 100 else obj.content
        return ''


class AnnouncementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ['title', 'content', 'is_pinned', 'is_active']


class UnreadCountSerializer(serializers.Serializer):
    unread_count = serializers.IntegerField()
