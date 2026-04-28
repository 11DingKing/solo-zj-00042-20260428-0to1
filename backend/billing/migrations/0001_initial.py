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
            name='BillingSetting',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('property_fee_per_sqm', models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='物业费单价(元/㎡)')),
                ('is_active', models.BooleanField(default=True, verbose_name='是否启用')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
            ],
            options={
                'db_table': 'billing_settings',
                'verbose_name': '计费设置',
                'verbose_name_plural': '计费设置',
            },
        ),
        migrations.CreateModel(
            name='Bill',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('bill_number', models.CharField(blank=True, max_length=30, unique=True, verbose_name='账单号')),
                ('bill_type', models.CharField(choices=[('property_fee', '物业费'), ('parking_fee', '停车费'), ('decoration_deposit', '装修押金'), ('other', '其他')], default='property_fee', max_length=30, verbose_name='账单类型')),
                ('title', models.CharField(max_length=200, verbose_name='账单标题')),
                ('description', models.TextField(blank=True, null=True, verbose_name='描述')),
                ('amount', models.DecimalField(decimal_places=2, default=0, max_digits=12, verbose_name='金额(元)')),
                ('area', models.DecimalField(blank=True, decimal_places=2, default=0, max_digits=10, null=True, verbose_name='房屋面积(㎡)')),
                ('unit_price', models.DecimalField(blank=True, decimal_places=2, default=0, max_digits=10, null=True, verbose_name='单价(元/㎡)')),
                ('billing_month', models.CharField(blank=True, max_length=7, null=True, verbose_name='计费月份')),
                ('due_date', models.DateField(verbose_name='缴费截止日期')),
                ('status', models.CharField(choices=[('pending', '待缴费'), ('paid', '已缴费'), ('overdue', '已逾期')], default='pending', max_length=20, verbose_name='状态')),
                ('paid_at', models.DateTimeField(blank=True, null=True, verbose_name='缴费时间')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('house', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bills', to='properties.house', verbose_name='房屋')),
                ('paid_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='paid_bills', to='accounts.user', verbose_name='缴费人')),
            ],
            options={
                'db_table': 'bills',
                'ordering': ['-created_at'],
                'verbose_name': '账单',
                'verbose_name_plural': '账单管理',
            },
        ),
        migrations.CreateModel(
            name='BillStatusLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('from_status', models.CharField(blank=True, choices=[('pending', '待缴费'), ('paid', '已缴费'), ('overdue', '已逾期')], max_length=20, null=True, verbose_name='原状态')),
                ('to_status', models.CharField(choices=[('pending', '待缴费'), ('paid', '已缴费'), ('overdue', '已逾期')], max_length=20, verbose_name='目标状态')),
                ('comment', models.TextField(blank=True, null=True, verbose_name='备注')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='操作时间')),
                ('bill', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='status_logs', to='billing.bill', verbose_name='账单')),
                ('operator', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bill_operations', to='accounts.user', verbose_name='操作人')),
            ],
            options={
                'db_table': 'bill_status_logs',
                'ordering': ['-created_at'],
                'verbose_name': '账单状态日志',
                'verbose_name_plural': '账单状态日志',
            },
        ),
        migrations.CreateModel(
            name='PaymentRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('transaction_id', models.CharField(blank=True, max_length=100, unique=True, verbose_name='交易流水号')),
                ('payment_method', models.CharField(default='online', max_length=50, verbose_name='支付方式')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='支付金额')),
                ('paid_at', models.DateTimeField(auto_now_add=True, verbose_name='支付时间')),
                ('bill', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='payment_record', to='billing.bill', verbose_name='账单')),
            ],
            options={
                'db_table': 'payment_records',
                'ordering': ['-paid_at'],
                'verbose_name': '缴费记录',
                'verbose_name_plural': '缴费记录',
            },
        ),
    ]
