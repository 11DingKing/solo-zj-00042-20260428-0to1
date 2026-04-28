from django.db import models
from django.conf import settings


class Building(models.Model):
    building_number = models.CharField('楼栋号', max_length=20, unique=True)
    unit_count = models.IntegerField('单元数', default=1)
    floor_count = models.IntegerField('楼层数', default=1)
    description = models.TextField('描述', blank=True, null=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        db_table = 'buildings'
        ordering = ['building_number']
        verbose_name = '楼栋'
        verbose_name_plural = '楼栋管理'

    def __str__(self):
        return f'{self.building_number}栋'


class House(models.Model):
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='houses', verbose_name='楼栋')
    unit_number = models.CharField('单元号', max_length=10)
    room_number = models.CharField('房号', max_length=20)
    area = models.DecimalField('面积(平方米)', max_digits=10, decimal_places=2, default=0)
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='house',
        verbose_name='业主'
    )
    description = models.TextField('备注', blank=True, null=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        db_table = 'houses'
        ordering = ['building', 'unit_number', 'room_number']
        unique_together = ['building', 'unit_number', 'room_number']
        verbose_name = '房屋'
        verbose_name_plural = '房屋管理'

    def __str__(self):
        if self.building:
            return f'{self.building.building_number}栋{self.unit_number}单元{self.room_number}室'
        return f'{self.unit_number}单元{self.room_number}室'

    def get_full_address(self):
        return f'{self.building.building_number}栋{self.unit_number}单元{self.room_number}室'


class MaintenanceWorker(models.Model):
    SKILL_ELECTRIC_PLUMBING = 'electric_plumbing'
    SKILL_STRUCTURE = 'structure'
    SKILL_DOOR_WINDOW = 'door_window'
    SKILL_ELEVATOR = 'elevator'
    SKILL_NETWORK = 'network'
    SKILL_OTHER = 'other'

    SKILL_CHOICES = [
        (SKILL_ELECTRIC_PLUMBING, '水电'),
        (SKILL_STRUCTURE, '土建'),
        (SKILL_DOOR_WINDOW, '门窗'),
        (SKILL_ELEVATOR, '电梯'),
        (SKILL_NETWORK, '网络'),
        (SKILL_OTHER, '其他'),
    ]

    STATUS_IDLE = 'idle'
    STATUS_BUSY = 'busy'

    STATUS_CHOICES = [
        (STATUS_IDLE, '空闲'),
        (STATUS_BUSY, '忙碌'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='worker_profile',
        verbose_name='关联用户'
    )
    name = models.CharField('姓名', max_length=50)
    phone = models.CharField('手机号', max_length=11, unique=True)
    skill_type = models.CharField('擅长类型', max_length=50, choices=SKILL_CHOICES, default=SKILL_OTHER)
    status = models.CharField('当前状态', max_length=20, choices=STATUS_CHOICES, default=STATUS_IDLE)
    description = models.TextField('备注', blank=True, null=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        db_table = 'maintenance_workers'
        ordering = ['-created_at']
        verbose_name = '维修工'
        verbose_name_plural = '维修工管理'

    def __str__(self):
        return f'{self.name} ({self.get_skill_type_display()})'

    def get_skill_display(self):
        return self.get_skill_type_display()

    def get_status_display_value(self):
        return self.get_status_display()
