from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Alert,
    EmergencyEvent,
    HealthRecord,
    NutritionLog,
    Recommendation,
    SystemLog,
    UserProfile,
)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user, display_name=user.username)
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'username', 'email', 'display_name', 'age', 'weight', 'height',
            'blood_group', 'diagnosed_conditions', 'blood_pressure',
            'blood_glucose', 'respiratory_rate', 'daily_water_goal_ml',
            'daily_step_goal', 'device_id', 'emergency_primary_contact',
            'emergency_secondary_contact', 'medical_notes', 'created_at',
            'updated_at',
        ]

class HealthRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthRecord
        fields = ['id', 'user', 'temperature', 'heart_rate', 'spo2', 
                  'symptoms_array', 'meds_taken', 'wellbeing_score', 
                  'timestamp', 'is_synced']
        read_only_fields = ['user', 'timestamp', 'is_synced']

class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = ['id', 'user', 'severity', 'alert_message', 'status', 'timestamp']
        read_only_fields = ['user', 'timestamp']

class NutritionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NutritionLog
        fields = ['id', 'user', 'entry_type', 'value', 'unit', 'note', 'timestamp']
        read_only_fields = ['user', 'timestamp']

class EmergencyEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyEvent
        fields = [
            'id', 'user', 'primary_contact', 'secondary_contact', 'medical_notes',
            'sms_content', 'status', 'timestamp',
        ]
        read_only_fields = ['user', 'timestamp']

class RecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recommendation
        fields = ['id', 'user', 'meal_plan', 'fluid_target', 'lifestyle_guideline', 'created_at']
        read_only_fields = ['user', 'created_at']

class SystemLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemLog
        fields = ['id', 'level', 'message', 'timestamp']
        read_only_fields = ['timestamp']
