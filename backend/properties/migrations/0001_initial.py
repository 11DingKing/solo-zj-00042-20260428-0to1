from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Building',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('building_number', models.CharField(max_length=20, unique=True, verbose_name='楼栋号')),
                ('unit_count', models.IntegerField(default=1, verbose_name='单元数')),
                ('floor_count', models.IntegerField(default=1, verbose_name='楼层数')),
                ('description', models.TextField(blank=True, null=True, verbose_name='描述')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
            ],
            options={
                'db_table': 'buildings',
                'ordering': ['building_number'],
                'verbose_name': '楼栋',
                'verbose_name_plural': '楼栋管理',
            },
        ),
        migrations.CreateModel(
            name='House',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('unit_number', models.CharField(max_length=10, verbose_name='单元号')),
                ('room_number', models.CharField(max_length=20, verbose_name='房号')),
                ('area', models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='面积(平方米)')),
                ('description', models.TextField(blank=True, null=True, verbose_name='备注')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('building', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='houses', to='properties.building', verbose_name='楼栋')),
                ('owner', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='house', to='accounts.user', verbose_name='业主')),
            ],
            options={
                'db_table': 'houses',
                'ordering': ['building', 'unit_number', 'room_number'],
                'unique_together': {('building', 'unit_number', 'room_number')},
                'verbose_name': '房屋',
                'verbose_name_plural': '房屋管理',
            },
        ),
        migrations.CreateModel(
            name='MaintenanceWorker',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, verbose_name='姓名')),
                ('phone', models.CharField(max_length=11, unique=True, verbose_name='手机号')),
                ('skill_type', models.CharField(choices=[('electric_plumbing', '水电'), ('structure', '土建'), ('door_window', '门窗'), ('elevator', '电梯'), ('network', '网络'), ('other', '其他')], default='other', max_length=50, verbose_name='擅长类型')),
                ('status', models.CharField(choices=[('idle', '空闲'), ('busy', '忙碌')], default='idle', max_length=20, verbose_name='当前状态')),
                ('description', models.TextField(blank=True, null=True, verbose_name='备注')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='worker_profile', to='accounts.user', verbose_name='关联用户')),
            ],
            options={
                'db_table': 'maintenance_workers',
                'ordering': ['-created_at'],
                'verbose_name': '维修工',
                'verbose_name_plural': '维修工管理',
            },
        ),
    ]
