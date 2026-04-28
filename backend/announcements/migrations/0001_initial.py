from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Announcement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200, verbose_name='标题')),
                ('content', models.TextField(verbose_name='内容')),
                ('is_pinned', models.BooleanField(default=False, verbose_name='是否置顶')),
                ('is_active', models.BooleanField(default=True, verbose_name='是否启用')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_announcements', to='accounts.user', verbose_name='创建人')),
            ],
            options={
                'db_table': 'announcements',
                'ordering': ['-is_pinned', '-created_at'],
                'verbose_name': '公告',
                'verbose_name_plural': '公告管理',
            },
        ),
        migrations.CreateModel(
            name='AnnouncementRead',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('read_at', models.DateTimeField(auto_now_add=True, verbose_name='阅读时间')),
                ('announcement', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reads', to='announcements.announcement', verbose_name='公告')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='read_announcements', to='accounts.user', verbose_name='用户')),
            ],
            options={
                'db_table': 'announcement_reads',
                'unique_together': {('announcement', 'user')},
                'verbose_name': '公告阅读记录',
                'verbose_name_plural': '公告阅读记录',
            },
        ),
    ]
