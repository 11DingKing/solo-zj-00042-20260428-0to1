from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BillingSettingViewSet, BillViewSet

router = DefaultRouter()
router.register(r'settings', BillingSettingViewSet, basename='billing-setting')
router.register(r'bills', BillViewSet, basename='bill')

urlpatterns = [
    path('', include(router.urls)),
]
