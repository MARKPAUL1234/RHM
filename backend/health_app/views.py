from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

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
from .serializers import (
    AlertSerializer,
    AppointmentRequestSerializer,
    CareMessageSerializer,
    ContactInquirySerializer,
    EmergencyEventSerializer,
    FitnessLogSerializer,
    FoodLogSerializer,
    HealthRecordSerializer,
    HealthScoreSnapshotSerializer,
    MedicationReminderSerializer,
    NutritionLogSerializer,
    RecommendationSerializer,
    SystemLogSerializer,
    UserProfileSerializer,
    UserSerializer,
)
from .notifications import send_admin_notification


CLINICAL_ROLES = {'doctor', 'clinician', 'caregiver', 'admin'}

FACILITY_DIRECTORY = [
    {
        'keywords': ['kampala', 'central', 'nakawa', 'makindye', 'rubaga', 'kawempe'],
        'name': 'Kampala City Medical Centre',
        'address': 'Kampala Central Division',
        'contact': '+256 700 100 200',
    },
    {
        'keywords': ['mulago', 'wandegeya', 'makerere'],
        'name': 'Mulago National Referral Hospital',
        'address': 'Upper Mulago Hill, Kampala',
        'contact': '+256 414 554 001',
    },
    {
        'keywords': ['wakiso', 'nansana', 'kira', 'namugongo', 'matugga'],
        'name': 'Wakiso Community Hospital',
        'address': 'Wakiso District Health Road',
        'contact': '+256 700 200 300',
    },
    {
        'keywords': ['mukono', 'seeta', 'namawojjolo'],
        'name': 'Mukono Medical Clinic',
        'address': 'Mukono Town Health Plaza',
        'contact': '+256 700 300 400',
    },
    {
        'keywords': ['entebbe', 'kajansi', 'kitende'],
        'name': 'Entebbe Regional Care Centre',
        'address': 'Entebbe Main Road',
        'contact': '+256 700 400 500',
    },
]


def get_user_profile(user):
    profile, created = UserProfile.objects.get_or_create(user=user)
    return profile


def get_user_role(user):
    if user.is_staff or user.is_superuser:
        return 'admin'
    return get_user_profile(user).role or 'patient'


def has_clinical_access(user):
    return get_user_role(user) in CLINICAL_ROLES


def select_nearby_facility(patient_location):
    location = (patient_location or '').lower()
    for facility in FACILITY_DIRECTORY:
        if any(keyword in location for keyword in facility['keywords']):
            return facility
    return {
        'name': 'Nearest Partner Medical Centre',
        'address': patient_location or 'Use the nearest emergency or outpatient facility',
        'contact': '+256 700 000 111',
    }


def select_available_doctor():
    clinical_profiles = UserProfile.objects.filter(role__in=['doctor', 'clinician', 'admin']).select_related('user')
    if clinical_profiles.exists():
        return clinical_profiles.first().user
    staff_user = User.objects.filter(is_staff=True).first()
    return staff_user


def build_appointment_triage(urgency, reason):
    normalized = (urgency or 'routine').lower()
    if normalized in ['urgent', 'emergency']:
        return {
            'triage_level': 'red_alert',
            'summary': (
                'Urgent manual-health alert. Patient should be contacted quickly, advised to avoid exertion, '
                'and reviewed at the assigned care facility if symptoms continue.'
            ),
        }
    if 'fever' in (reason or '').lower() or 'oxygen' in (reason or '').lower():
        return {
            'triage_level': 'same_day_review',
            'summary': 'Same-day review recommended because the patient described a potentially worsening symptom pattern.',
        }
    return {
        'triage_level': 'routine_review',
        'summary': 'Routine appointment request created from patient self-report.',
    }


def calculate_health_score(record, recent_count=1):
    score = 100
    reasons = []
    next_actions = []

    if record is None:
        return {
            'score': 0,
            'risk_level': 'watch',
            'reasons': ['No vitals have been logged yet.'],
            'next_actions': ['Log temperature, SpO2, pulse, and symptoms to activate scoring.'],
        }

    if record.spo2 < 92:
        score -= 35
        reasons.append(f'SpO2 is critically low at {record.spo2}%.')
        next_actions.append('Recheck oxygen saturation and contact clinical support if it remains low.')
    elif record.spo2 < 95:
        score -= 18
        reasons.append(f'SpO2 is below preferred range at {record.spo2}%.')
        next_actions.append('Rest upright and repeat the oxygen reading later today.')

    if record.temperature >= 38.5:
        score -= 25
        reasons.append(f'High fever detected at {record.temperature} C.')
        next_actions.append('Hydrate, rest, and consider clinician review if fever persists.')
    elif record.temperature >= 37.5:
        score -= 12
        reasons.append(f'Temperature is elevated at {record.temperature} C.')
        next_actions.append('Monitor temperature again this evening.')

    if record.heart_rate > 120 or record.heart_rate < 45:
        score -= 25
        reasons.append(f'Pulse rate is outside safe range at {record.heart_rate} bpm.')
        next_actions.append('Avoid intense activity and recheck pulse after rest.')
    elif record.heart_rate > 100:
        score -= 12
        reasons.append(f'Resting pulse is elevated at {record.heart_rate} bpm.')
        next_actions.append('Try guided breathing and avoid caffeine today.')

    symptoms = record.symptoms_array or []
    if len(symptoms) >= 3:
        score -= 12
        reasons.append(f'Multiple symptoms reported: {", ".join(symptoms[:3])}.')
        next_actions.append('Review symptom pattern and prepare notes for care review.')
    elif symptoms:
        score -= 6
        reasons.append(f'Symptoms reported: {", ".join(symptoms[:2])}.')

    if recent_count < 3:
        score -= 5
        reasons.append('Limited recent history reduces trend confidence.')
        next_actions.append('Log daily for at least three days to improve trend accuracy.')

    score = max(0, min(100, score))
    if score < 55 or record.spo2 < 92 or record.temperature >= 38.5:
        risk_level = 'urgent'
    elif score < 78:
        risk_level = 'watch'
    else:
        risk_level = 'stable'

    if not reasons:
        reasons.append('Vitals are within the expected manual tracking range.')
    if not next_actions:
        next_actions.append('Maintain your routine and log another entry tomorrow.')

    return {
        'score': score,
        'risk_level': risk_level,
        'reasons': reasons,
        'next_actions': next_actions,
    }


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == 'create':
            return []
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        payload = serializer.data
        payload['role'] = get_user_role(request.user)
        return Response(payload)

    def _patient_row(self, user):
        latest_record = HealthRecord.objects.filter(user=user).first()
        latest_score = HealthScoreSnapshot.objects.filter(user=user).first()
        unread_alerts = Alert.objects.filter(user=user, status='unread').count()
        profile = get_user_profile(user)
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': profile.role,
            'latest_record': HealthRecordSerializer(latest_record).data if latest_record else None,
            'latest_score': HealthScoreSnapshotSerializer(latest_score).data if latest_score else None,
            'unread_alerts': unread_alerts,
        }

    @action(detail=False, methods=['get'])
    def patient_overview(self, request):
        if not has_clinical_access(request.user):
            return Response({
                'clinical_access': False,
                'scope': 'self',
                'rows': [self._patient_row(request.user)],
            })

        users = User.objects.filter(is_staff=False).order_by('username')[:50]
        return Response({
            'clinical_access': True,
            'scope': 'all_patients',
            'rows': [self._patient_row(user) for user in users],
        })

    @action(detail=False, methods=['post'])
    def reset_my_data(self, request):
        user = request.user
        deleted_counts = {}

        for label, queryset in [
            ('health_records', HealthRecord.objects.filter(user=user)),
            ('health_scores', HealthScoreSnapshot.objects.filter(user=user)),
            ('medication_reminders', MedicationReminder.objects.filter(user=user)),
            ('nutrition_logs', NutritionLog.objects.filter(user=user)),
            ('food_logs', FoodLog.objects.filter(user=user)),
            ('fitness_logs', FitnessLog.objects.filter(user=user)),
            ('alerts', Alert.objects.filter(user=user)),
            ('emergency_events', EmergencyEvent.objects.filter(user=user)),
            ('contact_inquiries', ContactInquiry.objects.filter(user=user)),
            ('appointment_requests', AppointmentRequest.objects.filter(user=user)),
            ('care_messages', CareMessage.objects.filter(Q(sender=user) | Q(recipient=user))),
            ('recommendations', Recommendation.objects.filter(user=user)),
        ]:
            deleted_counts[label] = queryset.delete()[0]

        profile = get_user_profile(user)
        profile.display_name = ''
        profile.gender = None
        profile.age = None
        profile.weight = None
        profile.height = None
        profile.blood_group = ''
        profile.diagnosed_conditions = []
        profile.blood_pressure = ''
        profile.blood_glucose = ''
        profile.respiratory_rate = 0
        profile.daily_water_goal_ml = 0
        profile.daily_step_goal = 0
        profile.emergency_primary_contact = ''
        profile.emergency_secondary_contact = ''
        profile.medical_notes = ''
        profile.save(update_fields=[
            'display_name', 'gender', 'age', 'weight', 'height', 'blood_group',
            'diagnosed_conditions', 'blood_pressure', 'blood_glucose',
            'respiratory_rate', 'daily_water_goal_ml', 'daily_step_goal',
            'emergency_primary_contact', 'emergency_secondary_contact',
            'medical_notes', 'updated_at',
        ])

        SystemLog.objects.create(level='WARN', message=f'User {user.id} reset their patient data')

        return Response({
            'detail': 'User data reset complete.',
            'deleted_counts': deleted_counts,
            'profile': UserProfileSerializer(profile).data,
        })

class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserProfile.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'put', 'patch'])
    def my_profile(self, request):
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        if request.method in ['PUT', 'PATCH']:
            data = request.data.copy()
            if not (request.user.is_staff or request.user.is_superuser):
                data.pop('role', None)
            serializer = self.get_serializer(profile, data=data, partial=True)
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
        if self.action in ['retrieve', 'review'] and has_clinical_access(self.request.user):
            return HealthRecord.objects.all()
        return HealthRecord.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        record = serializer.save(user=self.request.user)
        self._generate_alerts_and_recommendations(record)
        self._create_health_score(record)
        SystemLog.objects.create(level='SYNC', message=f'Synced record {record.id}')

    @action(detail=True, methods=['post', 'patch'])
    def review(self, request, pk=None):
        if not has_clinical_access(request.user):
            raise PermissionDenied('Only clinicians, caregivers, or admins can review patient records.')

        record = self.get_object()
        status = request.data.get('review_status', 'reviewed')
        note = request.data.get('clinician_note', '')
        allowed_statuses = {choice[0] for choice in HealthRecord.REVIEW_CHOICES}
        if status not in allowed_statuses:
            raise ValidationError({'review_status': f'Use one of: {", ".join(sorted(allowed_statuses))}.'})

        record.review_status = status
        record.clinician_note = note
        record.reviewed_by = request.user
        record.reviewed_at = timezone.now()
        record.save(update_fields=['review_status', 'clinician_note', 'reviewed_by', 'reviewed_at'])

        if status in ['follow_up', 'escalated']:
            Alert.objects.create(
                user=record.user,
                severity='warning' if status == 'follow_up' else 'critical',
                alert_message=f'Clinician review marked this record as {status.replace("_", " ")}. {note}'.strip(),
            )

        SystemLog.objects.create(
            level='INFO',
            message=f'Record {record.id} reviewed by {request.user.username} as {status}',
        )
        return Response(self.get_serializer(record).data)

    def _create_health_score(self, record):
        recent_count = HealthRecord.objects.filter(user=record.user).count()
        score_payload = calculate_health_score(record, recent_count=recent_count)
        HealthScoreSnapshot.objects.create(
            user=record.user,
            record=record,
            score=score_payload['score'],
            risk_level=score_payload['risk_level'],
            reasons=score_payload['reasons'],
            next_actions=score_payload['next_actions'],
        )
        if score_payload['risk_level'] in ['watch', 'urgent']:
            Recommendation.objects.create(
                user=record.user,
                meal_plan='Personalized hydration-first meal plan based on latest vitals.',
                fluid_target='2.5-3.0 Liters',
                lifestyle_guideline='; '.join(score_payload['next_actions']),
            )

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
        todays_fitness_logs = FitnessLog.objects.filter(
            user=request.user,
            timestamp__date=today,
        )

        daily_steps = sum(max(0, log.steps or 0) for log in todays_fitness_logs)
        if daily_steps == 0:
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
            'manual_activity_count': todays_fitness_logs.count(),
            'latest_record': HealthRecordSerializer(latest).data if latest else None,
        })

    @action(detail=False, methods=['get'])
    def health_summary(self, request):
        records = list(self.get_queryset().order_by('-timestamp')[:7])
        latest = records[0] if records else None
        score_payload = calculate_health_score(latest, recent_count=len(records))
        latest_snapshot = HealthScoreSnapshot.objects.filter(user=request.user).first()
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        unread_alerts = Alert.objects.filter(user=request.user, status='unread').count()
        medication_due = MedicationReminder.objects.filter(user=request.user, status='active').count()

        return Response({
            'score': score_payload['score'],
            'risk_level': score_payload['risk_level'],
            'reasons': score_payload['reasons'],
            'next_actions': score_payload['next_actions'],
            'latest_record': HealthRecordSerializer(latest).data if latest else None,
            'latest_snapshot': HealthScoreSnapshotSerializer(latest_snapshot).data if latest_snapshot else None,
            'history_depth': len(records),
            'profile_completion': self._profile_completion(profile),
            'role': get_user_role(request.user),
            'unread_alerts': unread_alerts,
            'active_medications': medication_due,
        })

    def _profile_completion(self, profile):
        fields = [
            profile.age,
            profile.weight,
            profile.height,
            profile.blood_group,
            profile.blood_pressure,
            profile.blood_glucose,
            profile.emergency_primary_contact,
            profile.medical_notes,
        ]
        completed = sum(1 for value in fields if value not in [None, '', []])
        return round((completed / len(fields)) * 100)

    @action(detail=False, methods=['get'])
    def weekly_report(self, request):
        records = list(self.get_queryset().order_by('-timestamp')[:7])
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        scores = HealthScoreSnapshot.objects.filter(user=request.user)[:7]
        alerts = Alert.objects.filter(user=request.user)[:10]
        recommendations = Recommendation.objects.filter(user=request.user)[:5]

        return Response({
            'patient': UserProfileSerializer(profile).data,
            'records': HealthRecordSerializer(records, many=True).data,
            'scores': HealthScoreSnapshotSerializer(scores, many=True).data,
            'alerts': AlertSerializer(alerts, many=True).data,
            'recommendations': RecommendationSerializer(recommendations, many=True).data,
            'generated_at': timezone.now(),
        })

    @action(detail=False, methods=['get'])
    def weekly_report_export(self, request):
        records = list(HealthRecord.objects.filter(user=request.user).order_by('-timestamp')[:7])
        profile = get_user_profile(request.user)
        scores = list(HealthScoreSnapshot.objects.filter(user=request.user)[:7])
        alerts = list(Alert.objects.filter(user=request.user)[:10])
        recommendations = list(Recommendation.objects.filter(user=request.user)[:5])
        generated_at = timezone.now()
        latest_score = scores[0] if scores else None

        lines = [
            'REMOTE HEALTH MONITORING TOOL - WEEKLY PATIENT REPORT',
            f'Generated: {generated_at.strftime("%Y-%m-%d %H:%M")}',
            f'Patient: {profile.display_name or request.user.username}',
            f'Role: {profile.role.title()}',
            f'Blood Group: {profile.blood_group or "Not set"}',
            f'Baseline: Age {profile.age or "N/A"}, Height {profile.height or "N/A"} cm, Weight {profile.weight or "N/A"} kg',
            '',
            'SUMMARY',
            f'Latest health score: {latest_score.score if latest_score else "N/A"}/100',
            f'Latest risk level: {latest_score.risk_level.title() if latest_score else "N/A"}',
            f'Vitals logged: {len(records)}',
            f'Alerts: {len(alerts)}',
            f'Care plans: {len(recommendations)}',
            '',
            'VITALS HISTORY',
        ]
        if records:
            for record in records:
                lines.append(
                    f'- {timezone.localtime(record.timestamp).strftime("%Y-%m-%d %H:%M")}: '
                    f'Temp {record.temperature} C, SpO2 {record.spo2}%, Pulse {record.heart_rate} bpm, '
                    f'Status {record.review_status.replace("_", " ").title()}'
                )
        else:
            lines.append('- No vitals logged.')

        lines.extend(['', 'CLINICAL NOTES'])
        reviewed_records = [record for record in records if record.clinician_note]
        if reviewed_records:
            for record in reviewed_records:
                lines.append(f'- {record.clinician_note}')
        else:
            lines.append('- No clinician notes yet.')

        lines.extend(['', 'RECOMMENDATIONS'])
        if recommendations:
            for recommendation in recommendations:
                lines.append(f'- {recommendation.lifestyle_guideline}')
        else:
            lines.append('- No saved recommendations yet.')

        return Response({
            'title': 'Weekly Patient Report',
            'generated_at': generated_at,
            'filename': f'rhmt-weekly-report-{request.user.username}.txt',
            'report_text': '\n'.join(lines),
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

class FoodLogViewSet(viewsets.ModelViewSet):
    queryset = FoodLog.objects.all()
    serializer_class = FoodLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return FoodLog.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        log = serializer.save(user=self.request.user)
        if log.calories >= 900:
            Alert.objects.create(
                user=self.request.user,
                severity='info',
                alert_message=f'Large meal logged ({log.calories} kcal): review hydration and balanced macros for {log.food_name}.',
            )
        SystemLog.objects.create(
            level='SYNC',
            message=f'Food log {log.id} synced for user {self.request.user.id}',
        )

class FitnessLogViewSet(viewsets.ModelViewSet):
    queryset = FitnessLog.objects.all()
    serializer_class = FitnessLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return FitnessLog.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        log = serializer.save(user=self.request.user)
        if log.intensity == 'high':
            has_unread_critical = Alert.objects.filter(
                user=self.request.user,
                severity='critical',
                status='unread',
            ).exists()
            if has_unread_critical:
                Alert.objects.create(
                    user=self.request.user,
                    severity='warning',
                    alert_message='High intensity workout was logged while critical alerts are still unread. Consider recovery mode.',
                )
        SystemLog.objects.create(
            level='SYNC',
            message=f'Fitness log {log.id} synced for user {self.request.user.id}',
        )


class HealthScoreSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HealthScoreSnapshot.objects.all()
    serializer_class = HealthScoreSnapshotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return HealthScoreSnapshot.objects.filter(user=self.request.user)


class MedicationReminderViewSet(viewsets.ModelViewSet):
    queryset = MedicationReminder.objects.all()
    serializer_class = MedicationReminderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MedicationReminder.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        reminder = serializer.save(user=self.request.user)
        SystemLog.objects.create(
            level='INFO',
            message=f'Medication reminder {reminder.medicine_name} created for user {self.request.user.id}',
        )

    @action(detail=True, methods=['post'])
    def mark_taken(self, request, pk=None):
        reminder = self.get_object()
        today = timezone.now().date()
        if reminder.dose_reset_date != today:
            reminder.doses_taken_today = 0
            reminder.dose_reset_date = today
        reminder.doses_taken_today += 1
        reminder.status = 'taken'
        reminder.last_taken_at = timezone.now()
        reminder.save(update_fields=['status', 'last_taken_at', 'doses_taken_today', 'dose_reset_date', 'updated_at'])
        # Send notification
        subject = f"MEDICATION TAKEN: {reminder.medicine_name}"
        message = (
            f"Medication marked as taken:\n"
            f"User: {reminder.user.username}\n"
            f"Medicine: {reminder.medicine_name}\n"
            f"Dosage: {reminder.dosage}\n"
            f"Doses taken today: {reminder.doses_taken_today}\n"
            f"Time: {timezone.now()}"
        )
        send_admin_notification(subject, message)
        return Response(self.get_serializer(reminder).data)

    @action(detail=True, methods=['post'])
    def mark_missed(self, request, pk=None):
        reminder = self.get_object()
        today = timezone.now().date()
        if reminder.dose_reset_date != today:
            reminder.doses_taken_today = 0
            reminder.dose_reset_date = today
        reminder.status = 'missed'
        reminder.save(update_fields=['status', 'doses_taken_today', 'dose_reset_date', 'updated_at'])
        times = [str(reminder.scheduled_time)]
        if reminder.scheduled_time_2:
            times.append(str(reminder.scheduled_time_2))
        if reminder.scheduled_time_3:
            times.append(str(reminder.scheduled_time_3))
        Alert.objects.create(
            user=request.user,
            severity='warning',
            alert_message=f'Medication reminder missed: {reminder.medicine_name} at {", ".join(times)}.',
        )
        # Send notification
        subject = f"⚠️ MEDICATION MISSED: {reminder.medicine_name}"
        message = (
            f"Medication marked as missed:\n"
            f"User: {reminder.user.username}\n"
            f"Medicine: {reminder.medicine_name}\n"
            f"Scheduled times: {', '.join(times)}\n"
            f"Time: {timezone.now()}"
        )
        send_admin_notification(subject, message)
        return Response(self.get_serializer(reminder).data)


class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if has_clinical_access(self.request.user):
            return Alert.objects.all()
        return Alert.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class EmergencyEventViewSet(viewsets.ModelViewSet):
    queryset = EmergencyEvent.objects.all()
    serializer_class = EmergencyEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if has_clinical_access(self.request.user):
            return EmergencyEvent.objects.all()
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


class ContactInquiryViewSet(viewsets.ModelViewSet):
    queryset = ContactInquiry.objects.all()
    serializer_class = ContactInquirySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if has_clinical_access(self.request.user):
            return ContactInquiry.objects.all()
        return ContactInquiry.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        inquiry = serializer.save(user=self.request.user)
        inquiry.confirmation_code = f'INQ-{inquiry.id:05d}'
        inquiry.save(update_fields=['confirmation_code'])
        SystemLog.objects.create(
            level='INFO',
            message=f'Contact inquiry {inquiry.confirmation_code} submitted by user {self.request.user.id}',
        )


class AppointmentRequestViewSet(viewsets.ModelViewSet):
    queryset = AppointmentRequest.objects.all()
    serializer_class = AppointmentRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if has_clinical_access(self.request.user):
            return AppointmentRequest.objects.all()
        return AppointmentRequest.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        patient_location = self.request.data.get('patient_location', '')
        facility = select_nearby_facility(patient_location)
        doctor = select_available_doctor()
        triage = build_appointment_triage(self.request.data.get('urgency'), self.request.data.get('reason'))
        appointment = serializer.save(
            user=self.request.user,
            patient_location=patient_location,
            triage_level=triage['triage_level'],
            triage_summary=triage['summary'],
            assigned_facility_name=facility['name'],
            assigned_facility_address=facility['address'],
            assigned_facility_contact=facility['contact'],
            assigned_doctor=doctor,
        )
        appointment.confirmation_code = f'APT-{appointment.id:05d}'
        appointment.save(update_fields=['confirmation_code'])
        Alert.objects.create(
            user=self.request.user,
            severity='critical' if appointment.urgency in ['urgent', 'emergency'] else 'info',
            alert_message=(
                f'Appointment request {appointment.confirmation_code} submitted '
                f'for {appointment.urgency} care: {appointment.reason}'
            ),
        )
        SystemLog.objects.create(
            level='WARN' if appointment.urgency in ['urgent', 'emergency'] else 'INFO',
            message=f'Appointment {appointment.confirmation_code} requested by user {self.request.user.id}',
        )
        recipient = doctor or self.request.user
        CareMessage.objects.create(
            sender=self.request.user,
            recipient=recipient,
            appointment=appointment,
            message_type='system_triage',
            body=(
                f'{appointment.confirmation_code}: {appointment.triage_summary} '
                f'Assigned facility: {appointment.assigned_facility_name}, '
                f'{appointment.assigned_facility_address}, contact {appointment.assigned_facility_contact}.'
            ),
        )


class CareMessageViewSet(viewsets.ModelViewSet):
    queryset = CareMessage.objects.all()
    serializer_class = CareMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CareMessage.objects.filter(
            Q(sender=self.request.user) | Q(recipient=self.request.user)
        )

    def perform_create(self, serializer):
        recipient = None
        recipient_id = self.request.data.get('recipient_id')
        appointment_id = self.request.data.get('appointment')
        appointment = None
        if appointment_id:
            appointment_qs = AppointmentRequest.objects.filter(id=appointment_id)
            if not has_clinical_access(self.request.user):
                appointment_qs = appointment_qs.filter(user=self.request.user)
            appointment = appointment_qs.first()

        if recipient_id:
            recipient = User.objects.filter(id=recipient_id).first()
        elif appointment:
            recipient = appointment.user if has_clinical_access(self.request.user) else appointment.assigned_doctor

        if recipient is None:
            recipient = select_available_doctor()

        if recipient is None:
            raise ValidationError({'recipient_id': 'No doctor/admin account is available to receive this message.'})

        if not has_clinical_access(self.request.user) and appointment and appointment.user != self.request.user:
            raise PermissionDenied('Patients can only message through their own appointments.')

        serializer.validated_data.pop('recipient_id', None)
        message_type = 'doctor_reply' if has_clinical_access(self.request.user) else 'patient_update'
        message = serializer.save(
            sender=self.request.user,
            recipient=recipient,
            appointment=appointment,
            message_type=message_type,
        )
        Alert.objects.create(
            user=recipient,
            severity='info',
            alert_message=f'New care message from {self.request.user.username}: {message.body[:90]}',
        )


class RecommendationViewSet(viewsets.ModelViewSet):
    queryset = Recommendation.objects.all()
    serializer_class = RecommendationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if has_clinical_access(self.request.user):
            return Recommendation.objects.all()
        return Recommendation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SystemLogViewSet(viewsets.ModelViewSet):
    queryset = SystemLog.objects.all()
    serializer_class = SystemLogSerializer
    permission_classes = [IsAuthenticated]
