from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AlertViewSet,
    AppointmentRequestViewSet,
    CareMessageViewSet,
    ContactInquiryViewSet,
    EmergencyEventViewSet,
    FitnessLogViewSet,
    FoodLogViewSet,
    HealthRecordViewSet,
    HealthScoreSnapshotViewSet,
    MedicationReminderViewSet,
    NutritionLogViewSet,
    RecommendationViewSet,
    SystemLogViewSet,
    UserProfileViewSet,
    UserViewSet,
    WearableDeviceViewSet,
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'profiles', UserProfileViewSet)
router.register(r'records', HealthRecordViewSet)
router.register(r'health-scores', HealthScoreSnapshotViewSet)
router.register(r'medication-reminders', MedicationReminderViewSet)
router.register(r'nutrition-logs', NutritionLogViewSet)
router.register(r'food-logs', FoodLogViewSet)
router.register(r'fitness-logs', FitnessLogViewSet)
router.register(r'alerts', AlertViewSet)
router.register(r'emergency-events', EmergencyEventViewSet)
router.register(r'contact-inquiries', ContactInquiryViewSet)
router.register(r'appointment-requests', AppointmentRequestViewSet)
router.register(r'care-messages', CareMessageViewSet)
router.register(r'recommendations', RecommendationViewSet)
router.register(r'wearable-devices', WearableDeviceViewSet)
router.register(r'logs', SystemLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
