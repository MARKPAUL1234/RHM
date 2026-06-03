from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=150, blank=True)
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
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='health_records')
    temperature = models.FloatField()
    heart_rate = models.IntegerField()
    spo2 = models.IntegerField()
    symptoms_array = models.JSONField(default=list, blank=True)
    meds_taken = models.BooleanField(default=False)
    wellbeing_score = models.IntegerField(default=3)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_synced = models.BooleanField(default=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.timestamp.strftime('%Y-%m-%d %H:%M')}"

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
