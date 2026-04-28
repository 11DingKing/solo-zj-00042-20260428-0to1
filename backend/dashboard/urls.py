from django.urls import path
from .views import AdminDashboardView, WorkerDashboardView, OwnerDashboardView

urlpatterns = [
    path('admin/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('worker/', WorkerDashboardView.as_view(), name='worker-dashboard'),
    path('owner/', OwnerDashboardView.as_view(), name='owner-dashboard'),
]
