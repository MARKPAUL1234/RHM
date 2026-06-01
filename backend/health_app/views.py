from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Alert,
    EmergencyEvent,
    HealthRecord,
    NutritionLog,
    Recommendation,
    SystemLog,
    UserProfile,
)
from .serializers import (
    AlertSerializer,
    EmergencyEventSerializer,
    HealthRecordSerializer,
    NutritionLogSerializer,
    RecommendationSerializer,
    SystemLogSerializer,
    UserProfileSerializer,
    UserSerializer,
)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == 'create':
            return []
        return [IsAuthenticated()]


class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserProfile.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'put'])
    def my_profile(self, request):
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        if request.method == 'PUT':
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)


class HealthRecordViewSet(viewsets.ModelViewSet):
    queryset = HealthRecord.objects.all()
    serializer_class = HealthRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return HealthRecord.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        record = serializer.save(user=self.request.user)
        self._generate_alerts_and_recommendations(record)
        SystemLog.objects.create(level='SYNC', message=f'Synced record {record.id}')

    def _generate_alerts_and_recommendations(self, record):
        profile, created = UserProfile.objects.get_or_create(user=record.user)
        diagnosed_conditions = profile.diagnosed_conditions or []
        symptoms = record.symptoms_array or []

        if 'Malaria' in diagnosed_conditions and record.temperature > 38.0 and ('Chills' in symptoms or 'Severe Headache' in symptoms):
            Recommendation.objects.create(
                user=record.user,
                meal_plan='Calorie-dense baseline with vitamins (Steamed salmon, leafy greens, citrus fruits).',
                fluid_target='3.0 Liters',
                lifestyle_guideline='Fever flare-up and chills detected during active Malaria treatment. Minimize physical strain, set a strict 3L fluid intake goal for today.'
            )
            SystemLog.objects.create(level='INFO', message='Malaria Fever Guideline generated.')

        if 'Typhoid' in diagnosed_conditions and 'Stomach Pain' in symptoms:
            Recommendation.objects.create(
                user=record.user,
                meal_plan='Non-spicy soft diet: Barley water, vegetable broth, oatmeal, pureed apples.',
                fluid_target='2.5 Liters',
                lifestyle_guideline='Abdominal stress flagged. Drink strictly boiled or purified water and focus on soft, easily digestible meals.'
            )
            SystemLog.objects.create(level='INFO', message='Typhoid Abdominal Guideline generated.')

        if record.spo2 < 92:
            Alert.objects.create(
                user=record.user,
                severity='critical',
                alert_message=f'Oxygen depletion detected (SpO2: {record.spo2}%). Check vitals and contact emergency support immediately.'
            )
            SystemLog.objects.create(level='ERROR', message=f'Critical Oxygen depletion Alert fired for user {record.user.id}')

        elif record.temperature > 38.5:
            Alert.objects.create(
                user=record.user,
                severity='critical',
                alert_message=f'Elevated fever baseline detected ({record.temperature} C). Rest, maintain hydration, and verify medication schedule.'
            )
            SystemLog.objects.create(level='WARN', message=f'High Fever Alert fired for user {record.user.id}')

    @action(detail=False, methods=['get'])
    def fitness_summary(self, request):
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        records = list(self.get_queryset().order_by('-timestamp')[:20])
        latest = records[0] if records else None
        today = timezone.localdate()
        todays_records = [
            record
            for record in records
            if timezone.localtime(record.timestamp).date() == today
        ]
        source_records = todays_records or records[:1]

        daily_steps = sum(
            max(0, int(((record.wellbeing_score or 3) * 900) + ((record.heart_rate or 70) * 8)))
            for record in source_records
        )
        daily_steps = min(daily_steps, profile.daily_step_goal or 10000)

        has_critical_alert = Alert.objects.filter(
            user=request.user,
            severity='critical',
            status='unread',
        ).exists()
        latest_temp = latest.temperature if latest else None
        latest_spo2 = latest.spo2 if latest else None

        if has_critical_alert or (latest_spo2 is not None and latest_spo2 < 92) or (latest_temp is not None and latest_temp > 38.5):
            routines = [
                {'id': 'recovery-rest', 'type': 'Guided Rest', 'duration': '20 mins', 'intensity': 'Recovery'},
                {'id': 'breathing', 'type': 'Breathing Check', 'duration': '10 mins', 'intensity': 'Low'},
            ]
            locked = True
        else:
            routines = [
                {'id': 'clinical-walk', 'type': 'Clinical Walk', 'duration': '20 mins', 'intensity': 'Low'},
                {'id': 'static-stretch', 'type': 'Static Stretching', 'duration': '15 mins', 'intensity': 'Low'},
                {'id': 'light-cycle', 'type': 'Light Cardiovascular Cycle', 'duration': '30 mins', 'intensity': 'Medium'},
            ]
            locked = False

        return Response({
            'daily_steps': daily_steps,
            'goal_steps': profile.daily_step_goal or 10000,
            'locked': locked,
            'routines': routines,
            'source_record_count': len(source_records),
            'latest_record': HealthRecordSerializer(latest).data if latest else None,
        })


class NutritionLogViewSet(viewsets.ModelViewSet):
    queryset = NutritionLog.objects.all()
    serializer_class = NutritionLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return NutritionLog.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        log = serializer.save(user=self.request.user)
        if log.entry_type == 'weight':
            profile, created = UserProfile.objects.get_or_create(user=self.request.user)
            profile.weight = log.value
            profile.save(update_fields=['weight', 'updated_at'])
        SystemLog.objects.create(
            level='SYNC',
            message=f'Nutrition {log.entry_type} log {log.id} synced for user {self.request.user.id}',
        )


class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Alert.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class EmergencyEventViewSet(viewsets.ModelViewSet):
    queryset = EmergencyEvent.objects.all()
    serializer_class = EmergencyEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return EmergencyEvent.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        event = serializer.save(user=self.request.user)
        Alert.objects.create(
            user=self.request.user,
            severity='critical',
            alert_message=event.sms_content,
        )
        SystemLog.objects.create(
            level='ERROR',
            message=f'Emergency event {event.id} {event.status} for user {self.request.user.id}',
        )


class RecommendationViewSet(viewsets.ModelViewSet):
    queryset = Recommendation.objects.all()
    serializer_class = RecommendationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Recommendation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SystemLogViewSet(viewsets.ModelViewSet):
    queryset = SystemLog.objects.all()
    serializer_class = SystemLogSerializer
    permission_classes = [IsAuthenticated]
