from django.db import models
from django.conf import settings


class Announcement(models.Model):
    title = models.CharField('标题', max_length=200)
    content = models.TextField('内容')
    is_pinned = models.BooleanField('是否置顶', default=False)
    is_active = models.BooleanField('是否启用', default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_announcements',
        verbose_name='创建人'
    )
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        db_table = 'announcements'
        ordering = ['-is_pinned', '-created_at']
        verbose_name = '公告'
        verbose_name_plural = '公告管理'

    def __str__(self):
        return self.title


class AnnouncementRead(models.Model):
    announcement = models.ForeignKey(
        Announcement,
        on_delete=models.CASCADE,
        related_name='reads',
        verbose_name='公告'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='read_announcements',
        verbose_name='用户'
    )
    read_at = models.DateTimeField('阅读时间', auto_now_add=True)

    class Meta:
        db_table = 'announcement_reads'
        unique_together = ['announcement', 'user']
        verbose_name = '公告阅读记录'
        verbose_name_plural = '公告阅读记录'

    def __str__(self):
        return f'{self.user.username} - {self.announcement.title}'
