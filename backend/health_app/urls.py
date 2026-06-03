from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AlertViewSet,
    ContactInquiryViewSet,
    EmergencyEventViewSet,
    FitnessLogViewSet,
    FoodLogViewSet,
    HealthRecordViewSet,
    NutritionLogViewSet,
    RecommendationViewSet,
    SystemLogViewSet,
    UserProfileViewSet,
    UserViewSet,
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'profiles', UserProfileViewSet)
router.register(r'records', HealthRecordViewSet)
router.register(r'nutrition-logs', NutritionLogViewSet)
router.register(r'food-logs', FoodLogViewSet)
router.register(r'fitness-logs', FitnessLogViewSet)
router.register(r'alerts', AlertViewSet)
router.register(r'emergency-events', EmergencyEventViewSet)
router.register(r'contact-inquiries', ContactInquiryViewSet)
router.register(r'recommendations', RecommendationViewSet)
router.register(r'logs', SystemLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
