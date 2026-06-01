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
    device_id = models.CharField(max_length=100, blank=True, default='ESP32-RHM-NODE-001')
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
