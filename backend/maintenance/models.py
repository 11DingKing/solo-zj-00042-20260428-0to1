from django.db import models
from django.conf import settings


class MaintenanceTicket(models.Model):
    TYPE_ELECTRIC_PLUMBING = 'electric_plumbing'
    TYPE_PIPE_CLEARING = 'pipe_clearing'
    TYPE_DOOR_WINDOW = 'door_window'
    TYPE_PUBLIC_FACILITY = 'public_facility'
    TYPE_ELEVATOR = 'elevator'
    TYPE_OTHER = 'other'

    TYPE_CHOICES = [
        (TYPE_ELECTRIC_PLUMBING, '水电维修'),
        (TYPE_PIPE_CLEARING, '管道疏通'),
        (TYPE_DOOR_WINDOW, '门窗维修'),
        (TYPE_PUBLIC_FACILITY, '公共设施'),
        (TYPE_ELEVATOR, '电梯故障'),
        (TYPE_OTHER, '其他'),
    ]

    URGENCY_NORMAL = 'normal'
    URGENCY_URGENT = 'urgent'
    URGENCY_CRITICAL = 'critical'

    URGENCY_CHOICES = [
        (URGENCY_NORMAL, '一般'),
        (URGENCY_URGENT, '紧急'),
        (URGENCY_CRITICAL, '非常紧急'),
    ]

    STATUS_PENDING_ASSIGN = 'pending_assign'
    STATUS_ASSIGNED = 'assigned'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_PENDING_CONFIRM = 'pending_confirm'
    STATUS_COMPLETED = 'completed'

    STATUS_CHOICES = [
        (STATUS_PENDING_ASSIGN, '待派单'),
        (STATUS_ASSIGNED, '已派单'),
        (STATUS_IN_PROGRESS, '维修中'),
        (STATUS_PENDING_CONFIRM, '待确认'),
        (STATUS_COMPLETED, '已完成'),
    ]

    ticket_number = models.CharField('工单号', max_length=20, unique=True, blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tickets',
        verbose_name='报修业主'
    )
    repair_type = models.CharField('报修类型', max_length=50, choices=TYPE_CHOICES, default=TYPE_OTHER)
    description = models.TextField('详细描述')
    urgency = models.CharField('紧急程度', max_length=20, choices=URGENCY_CHOICES, default=URGENCY_NORMAL)
    expected_time = models.CharField('期望上门时间段', max_length=100, blank=True, null=True)
    status = models.CharField('状态', max_length=30, choices=STATUS_CHOICES, default=STATUS_PENDING_ASSIGN)
    assigned_worker = models.ForeignKey(
        'properties.MaintenanceWorker',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets',
        verbose_name='指派维修工'
    )
    rating = models.IntegerField('评价星级', choices=[(i, f'{i}星') for i in range(1, 6)], null=True, blank=True)
    rating_comment = models.TextField('评价内容', blank=True, null=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        db_table = 'maintenance_tickets'
        ordering = ['-created_at']
        verbose_name = '报修工单'
        verbose_name_plural = '报修工单管理'

    def __str__(self):
        return f'{self.ticket_number} - {self.get_repair_type_display()}'

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            from datetime import datetime
            today = datetime.now().strftime('%Y%m%d')
            last_ticket = MaintenanceTicket.objects.filter(
                ticket_number__startswith=f'T{today}'
            ).order_by('-ticket_number').first()
            
            if last_ticket:
                seq = int(last_ticket.ticket_number[-4:]) + 1
            else:
                seq = 1
            
            self.ticket_number = f'T{today}{seq:04d}'
        
        super().save(*args, **kwargs)

    def can_assign(self):
        return self.status == self.STATUS_PENDING_ASSIGN

    def can_start(self):
        return self.status == self.STATUS_ASSIGNED

    def can_complete(self):
        return self.status == self.STATUS_IN_PROGRESS

    def can_confirm(self):
        return self.status == self.STATUS_PENDING_CONFIRM

    def can_reject(self):
        return self.status == self.STATUS_PENDING_CONFIRM


class TicketImage(models.Model):
    ticket = models.ForeignKey(
        MaintenanceTicket,
        on_delete=models.CASCADE,
        related_name='images',
        verbose_name='工单'
    )
    image = models.ImageField('图片', upload_to='maintenance/tickets/')
    is_after_repair = models.BooleanField('是否维修后照片', default=False)
    uploaded_at = models.DateTimeField('上传时间', auto_now_add=True)

    class Meta:
        db_table = 'ticket_images'
        verbose_name = '工单图片'
        verbose_name_plural = '工单图片'

    def __str__(self):
        return f'{self.ticket.ticket_number} - 图片'


class MaintenanceRecord(models.Model):
    ticket = models.OneToOneField(
        MaintenanceTicket,
        on_delete=models.CASCADE,
        related_name='maintenance_record',
        verbose_name='工单'
    )
    repair_measures = models.TextField('维修措施')
    materials_used = models.TextField('使用材料及费用', blank=True, null=True)
    time_spent = models.DecimalField('耗时(小时)', max_digits=5, decimal_places=1, default=0)
    completed_at = models.DateTimeField('完成时间', auto_now_add=True)

    class Meta:
        db_table = 'maintenance_records'
        verbose_name = '维修记录'
        verbose_name_plural = '维修记录'

    def __str__(self):
        return f'{self.ticket.ticket_number} - 维修记录'


class TicketStatusLog(models.Model):
    ticket = models.ForeignKey(
        MaintenanceTicket,
        on_delete=models.CASCADE,
        related_name='status_logs',
        verbose_name='工单'
    )
    from_status = models.CharField('原状态', max_length=30, choices=MaintenanceTicket.STATUS_CHOICES, null=True, blank=True)
    to_status = models.CharField('目标状态', max_length=30, choices=MaintenanceTicket.STATUS_CHOICES)
    operator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='status_operations',
        verbose_name='操作人'
    )
    comment = models.TextField('备注', blank=True, null=True)
    created_at = models.DateTimeField('操作时间', auto_now_add=True)

    class Meta:
        db_table = 'ticket_status_logs'
        ordering = ['-created_at']
        verbose_name = '工单状态日志'
        verbose_name_plural = '工单状态日志'

    def __str__(self):
        return f'{self.ticket.ticket_number} - {self.get_to_status_display()}'
