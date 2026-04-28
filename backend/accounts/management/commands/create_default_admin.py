from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create default admin user (admin/admin123) if not exists'

    def handle(self, *args, **options):
        admin_username = 'admin'
        admin_password = 'admin123'
        
        try:
            admin_user = User.objects.get(username=admin_username)
            self.stdout.write(
                self.style.WARNING(f'Admin user "{admin_username}" already exists.')
            )
            if not admin_user.check_password(admin_password):
                admin_user.set_password(admin_password)
                admin_user.save()
                self.stdout.write(
                    self.style.SUCCESS(f'Admin user password updated to: {admin_password}')
                )
        except User.DoesNotExist:
            admin_user = User.objects.create_superuser(
                username=admin_username,
                email='admin@example.com',
                password=admin_password,
                role=User.ROLE_ADMIN
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f'Created default admin user successfully!\n'
                    f'Username: {admin_username}\n'
                    f'Password: {admin_password}\n'
                    f'Role: Admin (物业管理员)'
                )
            )
