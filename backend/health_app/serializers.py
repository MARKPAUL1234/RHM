from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Alert,
    AppointmentRequest,
    CareMessage,
    ContactInquiry,
    EmergencyEvent,
    FitnessLog,
    FoodLog,
    HealthRecord,
    HealthScoreSnapshot,
    MedicationReminder,
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
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'user_id', 'username', 'email', 'display_name', 'role', 'gender', 'age', 'weight',
            'height', 'blood_group', 'diagnosed_conditions', 'blood_pressure',
            'blood_glucose', 'respiratory_rate', 'daily_water_goal_ml',
            'daily_step_goal', 'emergency_primary_contact', 'emergency_secondary_contact',
            'medical_notes', 'created_at', 'updated_at',
        ]

class HealthRecordSerializer(serializers.ModelSerializer):
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True)

    class Meta:
        model = HealthRecord
        fields = ['id', 'user', 'temperature', 'heart_rate', 'spo2', 
                  'symptoms_array', 'meds_taken', 'wellbeing_score', 
                  'review_status', 'clinician_note', 'reviewed_at',
                  'reviewed_by', 'reviewed_by_username', 'timestamp', 'is_synced']
        read_only_fields = [
            'user', 'review_status', 'clinician_note', 'reviewed_at',
            'reviewed_by', 'reviewed_by_username', 'timestamp', 'is_synced',
        ]

    def validate(self, attrs):
        temperature = attrs.get('temperature')
        heart_rate = attrs.get('heart_rate')
        spo2 = attrs.get('spo2')
        wellbeing_score = attrs.get('wellbeing_score', 3)

        errors = {}
        if temperature is not None and not 34 <= temperature <= 42:
            errors['temperature'] = 'Temperature must be between 34 C and 42 C.'
        if heart_rate is not None and not 30 <= heart_rate <= 220:
            errors['heart_rate'] = 'Pulse rate must be between 30 and 220 bpm.'
        if spo2 is not None and not 50 <= spo2 <= 100:
            errors['spo2'] = 'SpO2 must be between 50% and 100%.'
        if wellbeing_score is not None and not 1 <= wellbeing_score <= 5:
            errors['wellbeing_score'] = 'Wellbeing score must be between 1 and 5.'
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

class HealthScoreSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthScoreSnapshot
        fields = ['id', 'user', 'record', 'score', 'risk_level', 'reasons', 'next_actions', 'created_at']
        read_only_fields = ['user', 'record', 'score', 'risk_level', 'reasons', 'next_actions', 'created_at']

class MedicationReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationReminder
        fields = [
            'id', 'user', 'medicine_name', 'dosage', 'scheduled_time', 'frequency',
            'status', 'notes', 'last_taken_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['user', 'last_taken_at', 'created_at', 'updated_at']

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

class FoodLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodLog
        fields = [
            'id', 'user', 'meal_type', 'food_name', 'calories', 'carbs_g',
            'protein_g', 'fat_g', 'note', 'timestamp',
        ]
        read_only_fields = ['user', 'timestamp']

class FitnessLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FitnessLog
        fields = [
            'id', 'user', 'activity_name', 'steps', 'duration_minutes',
            'heart_rate', 'intensity', 'goal_note', 'timestamp',
        ]
        read_only_fields = ['user', 'timestamp']

class EmergencyEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyEvent
        fields = [
            'id', 'user', 'primary_contact', 'secondary_contact', 'medical_notes',
            'sms_content', 'status', 'timestamp',
        ]
        read_only_fields = ['user', 'timestamp']

class ContactInquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactInquiry
        fields = [
            'id', 'user', 'purpose', 'message', 'preferred_response_time',
            'status', 'confirmation_code', 'timestamp',
        ]
        read_only_fields = ['user', 'status', 'confirmation_code', 'timestamp']

class AppointmentRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    assigned_doctor_username = serializers.CharField(source='assigned_doctor.username', read_only=True)

    class Meta:
        model = AppointmentRequest
        fields = [
            'id', 'user', 'username', 'reason', 'urgency', 'preferred_date',
            'preferred_time', 'patient_location', 'status', 'triage_level',
            'triage_summary', 'assigned_facility_name', 'assigned_facility_address',
            'assigned_facility_contact', 'assigned_doctor', 'assigned_doctor_username',
            'clinician_note', 'confirmation_code', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'user', 'username', 'status', 'triage_level', 'triage_summary',
            'assigned_facility_name', 'assigned_facility_address',
            'assigned_facility_contact', 'assigned_doctor', 'assigned_doctor_username',
            'confirmation_code', 'created_at', 'updated_at',
        ]

class CareMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    recipient_username = serializers.CharField(source='recipient.username', read_only=True)
    recipient_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = CareMessage
        fields = [
            'id', 'sender', 'sender_username', 'recipient', 'recipient_id',
            'recipient_username', 'appointment', 'message_type', 'body', 'status',
            'created_at',
        ]
        read_only_fields = ['sender', 'recipient', 'sender_username', 'recipient_username', 'status', 'created_at']

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
