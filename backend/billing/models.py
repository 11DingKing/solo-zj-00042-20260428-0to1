from django.db import models
from django.conf import settings
from datetime import datetime, timedelta


class BillingSetting(models.Model):
    property_fee_per_sqm = models.DecimalField('物业费单价(元/㎡)', max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField('是否启用', default=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        db_table = 'billing_settings'
        verbose_name = '计费设置'
        verbose_name_plural = '计费设置'

    def __str__(self):
        return f'物业费单价: {self.property_fee_per_sqm}元/㎡'


class Bill(models.Model):
    TYPE_PROPERTY_FEE = 'property_fee'
    TYPE_PARKING_FEE = 'parking_fee'
    TYPE_DECORATION_DEPOSIT = 'decoration_deposit'
    TYPE_OTHER = 'other'

    TYPE_CHOICES = [
        (TYPE_PROPERTY_FEE, '物业费'),
        (TYPE_PARKING_FEE, '停车费'),
        (TYPE_DECORATION_DEPOSIT, '装修押金'),
        (TYPE_OTHER, '其他'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_PAID = 'paid'
    STATUS_OVERDUE = 'overdue'

    STATUS_CHOICES = [
        (STATUS_PENDING, '待缴费'),
        (STATUS_PAID, '已缴费'),
        (STATUS_OVERDUE, '已逾期'),
    ]

    bill_number = models.CharField('账单号', max_length=30, unique=True, blank=True)
    house = models.ForeignKey(
        'properties.House',
        on_delete=models.CASCADE,
        related_name='bills',
        verbose_name='房屋'
    )
    bill_type = models.CharField('账单类型', max_length=30, choices=TYPE_CHOICES, default=TYPE_PROPERTY_FEE)
    title = models.CharField('账单标题', max_length=200)
    description = models.TextField('描述', blank=True, null=True)
    amount = models.DecimalField('金额(元)', max_digits=12, decimal_places=2, default=0)
    area = models.DecimalField('房屋面积(㎡)', max_digits=10, decimal_places=2, default=0, blank=True, null=True)
    unit_price = models.DecimalField('单价(元/㎡)', max_digits=10, decimal_places=2, default=0, blank=True, null=True)
    billing_month = models.CharField('计费月份', max_length=7, blank=True, null=True)
    due_date = models.DateField('缴费截止日期')
    status = models.CharField('状态', max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    paid_at = models.DateTimeField('缴费时间', null=True, blank=True)
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='paid_bills',
        verbose_name='缴费人'
    )
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        db_table = 'bills'
        ordering = ['-created_at']
        verbose_name = '账单'
        verbose_name_plural = '账单管理'

    def __str__(self):
        return f'{self.bill_number} - {self.title}'

    def save(self, *args, **kwargs):
        if not self.bill_number:
            from datetime import datetime
            today = datetime.now().strftime('%Y%m%d')
            last_bill = Bill.objects.filter(
                bill_number__startswith=f'B{today}'
            ).order_by('-bill_number').first()
            
            if last_bill:
                seq = int(last_bill.bill_number[-5:]) + 1
            else:
                seq = 1
            
            self.bill_number = f'B{today}{seq:05d}'
        
        if self.due_date and not self.paid_at:
            from datetime import date
            if self.due_date < date.today():
                self.status = self.STATUS_OVERDUE
        
        super().save(*args, **kwargs)

    def is_overdue(self):
        if self.status == self.STATUS_PAID:
            return False
        from datetime import date
        return self.due_date < date.today()

    def pay(self, user):
        if self.status == self.STATUS_PAID:
            return False, '该账单已缴费'
        
        from datetime import datetime
        self.status = self.STATUS_PAID
        self.paid_at = datetime.now()
        self.paid_by = user
        self.save()
        
        BillStatusLog.objects.create(
            bill=self,
            from_status=self.STATUS_PENDING if not self.is_overdue() else self.STATUS_OVERDUE,
            to_status=self.STATUS_PAID,
            operator=user,
            comment='缴费成功'
        )
        
        return True, '缴费成功'


class BillStatusLog(models.Model):
    bill = models.ForeignKey(
        Bill,
        on_delete=models.CASCADE,
        related_name='status_logs',
        verbose_name='账单'
    )
    from_status = models.CharField('原状态', max_length=20, choices=Bill.STATUS_CHOICES, null=True, blank=True)
    to_status = models.CharField('目标状态', max_length=20, choices=Bill.STATUS_CHOICES)
    operator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='bill_operations',
        verbose_name='操作人'
    )
    comment = models.TextField('备注', blank=True, null=True)
    created_at = models.DateTimeField('操作时间', auto_now_add=True)

    class Meta:
        db_table = 'bill_status_logs'
        ordering = ['-created_at']
        verbose_name = '账单状态日志'
        verbose_name_plural = '账单状态日志'

    def __str__(self):
        return f'{self.bill.bill_number} - {self.get_to_status_display()}'


class PaymentRecord(models.Model):
    bill = models.OneToOneField(
        Bill,
        on_delete=models.CASCADE,
        related_name='payment_record',
        verbose_name='账单'
    )
    transaction_id = models.CharField('交易流水号', max_length=100, unique=True, blank=True)
    payment_method = models.CharField('支付方式', max_length=50, default='online')
    amount = models.DecimalField('支付金额', max_digits=12, decimal_places=2)
    paid_at = models.DateTimeField('支付时间', auto_now_add=True)

    class Meta:
        db_table = 'payment_records'
        ordering = ['-paid_at']
        verbose_name = '缴费记录'
        verbose_name_plural = '缴费记录'

    def __str__(self):
        return f'{self.transaction_id} - {self.amount}元'

    def save(self, *args, **kwargs):
        if not self.transaction_id:
            from datetime import datetime
            import uuid
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            self.transaction_id = f'PAY{timestamp}{uuid.uuid4().hex[:8].upper()}'
        super().save(*args, **kwargs)
