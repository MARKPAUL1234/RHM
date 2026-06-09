from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('patient', 'Patient'),
        ('doctor', 'Doctor'),
        ('clinician', 'Clinician'),
        ('caregiver', 'Caregiver'),
        ('admin', 'Admin'),
    ]
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
        ('prefer_not', 'Prefer not to say'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='patient')
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, null=True, blank=True)
    age = models.IntegerField(null=True, blank=True)
    weight = models.FloatField(null=True, blank=True)
    height = models.FloatField(null=True, blank=True)
    blood_group = models.CharField(max_length=5, null=True, blank=True)
    diagnosed_conditions = models.JSONField(default=list, blank=True)
    blood_pressure = models.CharField(max_length=20, blank=True, default='120/80')
    blood_glucose = models.CharField(max_length=20, blank=True, default='95')
    respiratory_rate = models.IntegerField(default=16)
    daily_water_goal_ml = models.IntegerField(default=3000)
    daily_step_goal = models.IntegerField(default=10000)
    emergency_primary_contact = models.CharField(max_length=40, blank=True, default='+254 712 345 678')
    emergency_secondary_contact = models.CharField(max_length=40, blank=True, default='+254 789 012 345')
    medical_notes = models.TextField(blank=True, default='Active treatment baseline. Update allergies and clinical remarks here.')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"

class HealthRecord(models.Model):
    REVIEW_CHOICES = [
        ('pending', 'Pending Review'),
        ('reviewed', 'Reviewed'),
        ('follow_up', 'Needs Follow Up'),
        ('escalated', 'Escalated'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='health_records')
    temperature = models.FloatField()
    heart_rate = models.IntegerField()
    symptoms_array = models.JSONField(default=list, blank=True)
    meds_taken = models.BooleanField(default=False)
    wellbeing_score = models.IntegerField(default=3)
    review_status = models.CharField(max_length=20, choices=REVIEW_CHOICES, default='pending')
    clinician_note = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_health_records',
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    is_synced = models.BooleanField(default=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.timestamp.strftime('%Y-%m-%d %H:%M')}"

class HealthScoreSnapshot(models.Model):
    RISK_CHOICES = [
        ('stable', 'Stable'),
        ('watch', 'Watch'),
        ('urgent', 'Urgent'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='health_scores')
    record = models.ForeignKey(HealthRecord, on_delete=models.SET_NULL, null=True, blank=True, related_name='score_snapshots')
    score = models.IntegerField(default=100)
    risk_level = models.CharField(max_length=20, choices=RISK_CHOICES, default='stable')
    reasons = models.JSONField(default=list, blank=True)
    next_actions = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.score}/100 ({self.risk_level})"

class MedicationReminder(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('taken', 'Taken'),
        ('missed', 'Missed'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
    ]
    FREQUENCY_CHOICES = [
        ('once', 'Once daily'),
        ('twice', 'Twice daily'),
        ('thrice', 'Three times daily'),
        ('custom', 'Custom'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='medication_reminders')
    medicine_name = models.CharField(max_length=120)
    dosage = models.CharField(max_length=80, blank=True)
    scheduled_time = models.TimeField()
    scheduled_time_2 = models.TimeField(blank=True, null=True)
    scheduled_time_3 = models.TimeField(blank=True, null=True)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='once')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    notes = models.CharField(max_length=255, blank=True)
    doctor_instructions = models.TextField(blank=True, help_text='Instructions written by the prescribing doctor')
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    duration_days = models.PositiveIntegerField(blank=True, null=True, help_text='How many days to take the medicine')
    doses_taken_today = models.PositiveIntegerField(default=0)
    dose_reset_date = models.DateField(blank=True, null=True)
    last_taken_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scheduled_time', 'medicine_name']

    def __str__(self):
        times = [str(self.scheduled_time)]
        if self.scheduled_time_2:
            times.append(str(self.scheduled_time_2))
        if self.scheduled_time_3:
            times.append(str(self.scheduled_time_3))
        return f"{self.user.username} - {self.medicine_name} at {', '.join(times)}"

class NutritionLog(models.Model):
    ENTRY_CHOICES = [
        ('weight', 'Weight'),
        ('water', 'Water'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='nutrition_logs')
    entry_type = models.CharField(max_length=20, choices=ENTRY_CHOICES)
    value = models.FloatField()
    unit = models.CharField(max_length=20)
    note = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.entry_type}: {self.value}{self.unit}"

class FoodLog(models.Model):
    MEAL_CHOICES = [
        ('breakfast', 'Breakfast'),
        ('lunch', 'Lunch'),
        ('dinner', 'Dinner'),
        ('snack', 'Snack'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='food_logs')
    meal_type = models.CharField(max_length=20, choices=MEAL_CHOICES, default='breakfast')
    food_name = models.CharField(max_length=120)
    calories = models.IntegerField(default=0)
    carbs_g = models.FloatField(default=0)
    protein_g = models.FloatField(default=0)
    fat_g = models.FloatField(default=0)
    note = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.food_name}: {self.calories} kcal"

class FitnessLog(models.Model):
    INTENSITY_CHOICES = [
        ('recovery', 'Recovery'),
        ('low', 'Low'),
        ('moderate', 'Moderate'),
        ('high', 'High'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fitness_logs')
    activity_name = models.CharField(max_length=120, default='Manual activity')
    steps = models.IntegerField(default=0)
    duration_minutes = models.IntegerField(default=0)
    heart_rate = models.IntegerField(null=True, blank=True)
    intensity = models.CharField(max_length=20, choices=INTENSITY_CHOICES, default='low')
    goal_note = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.activity_name}: {self.steps} steps"

class Alert(models.Model):
    SEVERITY_CHOICES = [
        ('critical', 'Critical'),
        ('warning', 'Warning'),
        ('info', 'Info'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alerts')
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='info')
    alert_message = models.TextField()
    status = models.CharField(max_length=20, default='unread')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.severity}] {self.user.username}: {self.alert_message[:50]}"

class EmergencyEvent(models.Model):
    STATUS_CHOICES = [
        ('dispatched', 'Dispatched'),
        ('queued', 'Queued'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='emergency_events')
    primary_contact = models.CharField(max_length=40)
    secondary_contact = models.CharField(max_length=40, blank=True)
    medical_notes = models.TextField(blank=True)
    sms_content = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='dispatched')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Emergency event for {self.user.username} - {self.status}"

class ContactInquiry(models.Model):
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('in_review', 'In Review'),
        ('closed', 'Closed'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contact_inquiries')
    purpose = models.CharField(max_length=120)
    message = models.TextField()
    preferred_response_time = models.CharField(max_length=80, blank=True, default='Within 24 hours')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted')
    confirmation_code = models.CharField(max_length=40, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Inquiry {self.confirmation_code or self.id} - {self.user.username}"

class AppointmentRequest(models.Model):
    STATUS_CHOICES = [
        ('requested', 'Requested'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    ]
    URGENCY_CHOICES = [
        ('routine', 'Routine'),
        ('soon', 'Soon'),
        ('urgent', 'Urgent'),
        ('emergency', 'Emergency'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='appointment_requests')
    reason = models.CharField(max_length=180)
    urgency = models.CharField(max_length=20, choices=URGENCY_CHOICES, default='routine')
    patient_location = models.CharField(max_length=160, blank=True)
    preferred_date = models.DateField(null=True, blank=True)
    preferred_time = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='requested')
    triage_level = models.CharField(max_length=30, blank=True)
    triage_summary = models.TextField(blank=True)
    assigned_facility_name = models.CharField(max_length=160, blank=True)
    assigned_facility_address = models.CharField(max_length=220, blank=True)
    assigned_facility_contact = models.CharField(max_length=60, blank=True)
    assigned_doctor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_appointment_requests',
    )
    clinician_note = models.TextField(blank=True)
    confirmation_code = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Appointment {self.confirmation_code or self.id} - {self.user.username}"

class CareMessage(models.Model):
    MESSAGE_CHOICES = [
        ('patient_update', 'Patient Update'),
        ('doctor_reply', 'Doctor Reply'),
        ('system_triage', 'System Triage'),
    ]
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_care_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_care_messages')
    appointment = models.ForeignKey(
        AppointmentRequest,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='care_messages',
    )
    message_type = models.CharField(max_length=30, choices=MESSAGE_CHOICES, default='patient_update')
    body = models.TextField()
    status = models.CharField(max_length=20, default='unread')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.sender.username} -> {self.recipient.username}: {self.body[:40]}"

class Recommendation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recommendations')
    meal_plan = models.TextField()
    fluid_target = models.CharField(max_length=50)
    lifestyle_guideline = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Recommendation for {self.user.username} - {self.created_at.strftime('%Y-%m-%d')}"

class SystemLog(models.Model):
    LEVEL_CHOICES = [
        ('INFO', 'Info'),
        ('WARN', 'Warning'),
        ('QUEUE', 'Queue'),
        ('SYNC', 'Sync'),
        ('ERROR', 'Error'),
    ]
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='INFO')
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.level}] {self.timestamp.strftime('%Y-%m-%d %H:%M')}: {self.message[:50]}"
