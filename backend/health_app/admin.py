from django.contrib import admin
from .models import (
    Alert,
    EmergencyEvent,
    FitnessLog,
    FoodLog,
    HealthRecord,
    NutritionLog,
    Recommendation,
    SystemLog,
    UserProfile,
)

admin.site.register(UserProfile)
admin.site.register(HealthRecord)
admin.site.register(NutritionLog)
admin.site.register(FoodLog)
admin.site.register(FitnessLog)
admin.site.register(Alert)
admin.site.register(EmergencyEvent)
admin.site.register(Recommendation)
admin.site.register(SystemLog)
