from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ('accounts', '0001_initial'),
        ('properties', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='MaintenanceTicket',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ticket_number', models.CharField(blank=True, max_length=20, unique=True, verbose_name='工单号')),
                ('repair_type', models.CharField(choices=[('electric_plumbing', '水电维修'), ('pipe_clearing', '管道疏通'), ('door_window', '门窗维修'), ('public_facility', '公共设施'), ('elevator', '电梯故障'), ('other', '其他')], default='other', max_length=50, verbose_name='报修类型')),
                ('description', models.TextField(verbose_name='详细描述')),
                ('urgency', models.CharField(choices=[('normal', '一般'), ('urgent', '紧急'), ('critical', '非常紧急')], default='normal', max_length=20, verbose_name='紧急程度')),
                ('expected_time', models.CharField(blank=True, max_length=100, null=True, verbose_name='期望上门时间段')),
                ('status', models.CharField(choices=[('pending_assign', '待派单'), ('assigned', '已派单'), ('in_progress', '维修中'), ('pending_confirm', '待确认'), ('completed', '已完成')], default='pending_assign', max_length=30, verbose_name='状态')),
                ('rating', models.IntegerField(blank=True, choices=[(1, '1星'), (2, '2星'), (3, '3星'), (4, '4星'), (5, '5星')], null=True, verbose_name='评价星级')),
                ('rating_comment', models.TextField(blank=True, null=True, verbose_name='评价内容')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('assigned_worker', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_tickets', to='properties.maintenanceworker', verbose_name='指派维修工')),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tickets', to='accounts.user', verbose_name='报修业主')),
            ],
            options={
                'db_table': 'maintenance_tickets',
                'ordering': ['-created_at'],
                'verbose_name': '报修工单',
                'verbose_name_plural': '报修工单管理',
            },
        ),
        migrations.CreateModel(
            name='TicketStatusLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('from_status', models.CharField(blank=True, choices=[('pending_assign', '待派单'), ('assigned', '已派单'), ('in_progress', '维修中'), ('pending_confirm', '待确认'), ('completed', '已完成')], max_length=30, null=True, verbose_name='原状态')),
                ('to_status', models.CharField(choices=[('pending_assign', '待派单'), ('assigned', '已派单'), ('in_progress', '维修中'), ('pending_confirm', '待确认'), ('completed', '已完成')], max_length=30, verbose_name='目标状态')),
                ('comment', models.TextField(blank=True, null=True, verbose_name='备注')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='操作时间')),
                ('operator', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='status_operations', to='accounts.user', verbose_name='操作人')),
                ('ticket', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='status_logs', to='maintenance.maintenanceticket', verbose_name='工单')),
            ],
            options={
                'db_table': 'ticket_status_logs',
                'ordering': ['-created_at'],
                'verbose_name': '工单状态日志',
                'verbose_name_plural': '工单状态日志',
            },
        ),
        migrations.CreateModel(
            name='TicketImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to='maintenance/tickets/', verbose_name='图片')),
                ('is_after_repair', models.BooleanField(default=False, verbose_name='是否维修后照片')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True, verbose_name='上传时间')),
                ('ticket', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='images', to='maintenance.maintenanceticket', verbose_name='工单')),
            ],
            options={
                'db_table': 'ticket_images',
                'verbose_name': '工单图片',
                'verbose_name_plural': '工单图片',
            },
        ),
        migrations.CreateModel(
            name='MaintenanceRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('repair_measures', models.TextField(verbose_name='维修措施')),
                ('materials_used', models.TextField(blank=True, null=True, verbose_name='使用材料及费用')),
                ('time_spent', models.DecimalField(decimal_places=1, default=0, max_digits=5, verbose_name='耗时(小时)')),
                ('completed_at', models.DateTimeField(auto_now_add=True, verbose_name='完成时间')),
                ('ticket', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='maintenance_record', to='maintenance.maintenanceticket', verbose_name='工单')),
            ],
            options={
                'db_table': 'maintenance_records',
                'verbose_name': '维修记录',
                'verbose_name_plural': '维修记录',
            },
        ),
    ]
