from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_ADMIN = 'admin'
    ROLE_MAINTENANCE = 'maintenance'
    ROLE_OWNER = 'owner'

    ROLE_CHOICES = [
        (ROLE_ADMIN, '物业管理员'),
        (ROLE_MAINTENANCE, '维修工'),
        (ROLE_OWNER, '业主'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_OWNER)
    phone = models.CharField(max_length=11, blank=True, null=True, unique=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f'{self.username} ({self.get_role_display()})'
