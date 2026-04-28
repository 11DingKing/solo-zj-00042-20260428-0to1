from django.contrib import admin
from .models import Announcement, AnnouncementRead


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_pinned', 'is_active', 'created_by', 'created_at']
    list_filter = ['is_pinned', 'is_active', 'created_at']
    search_fields = ['title', 'content']
    ordering = ['-is_pinned', '-created_at']
    raw_id_fields = ['created_by']
    readonly_fields = ['created_at', 'updated_at']

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(AnnouncementRead)
class AnnouncementReadAdmin(admin.ModelAdmin):
    list_display = ['announcement', 'user', 'read_at']
    list_filter = ['read_at']
    search_fields = ['announcement__title', 'user__username']
    ordering = ['-read_at']
    raw_id_fields = ['announcement', 'user']
