from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BuildingViewSet, HouseViewSet, MaintenanceWorkerViewSet

router = DefaultRouter()
router.register(r'buildings', BuildingViewSet, basename='building')
router.register(r'houses', HouseViewSet, basename='house')
router.register(r'workers', MaintenanceWorkerViewSet, basename='worker')

urlpatterns = [
    path('', include(router.urls)),
]
