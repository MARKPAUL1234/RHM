
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import (
    HealthRecord,
    MedicationReminder,
    AppointmentRequest,
    CareMessage,
    EmergencyEvent,
    ContactInquiry
)
from .notifications import send_admin_notification


@receiver(post_save, sender=User)
def notify_new_user(sender, instance, created, **kwargs):
    if created:
        subject = "NEW USER ACCOUNT CREATED"
        message = (
            f"A new user has registered on RHMT:\n"
            f"Username: {instance.username}\n"
            f"Email: {instance.email}\n"
            f"Date joined: {instance.date_joined}"
        )
        send_admin_notification(subject, message)


@receiver(post_save, sender=HealthRecord)
def notify_new_health_record(sender, instance, created, **kwargs):
    if created:
        subject = "NEW HEALTH RECORD LOGGED"
        message = (
            f"A new health record has been logged:\n"
            f"User: {instance.user.username}\n"
            f"Temperature: {instance.temperature}°C\n"
            f"SpO2: {instance.spo2}%\n"
            f"Pulse: {instance.heart_rate} bpm\n"
            f"Symptoms: {', '.join(instance.symptoms_array) if instance.symptoms_array else 'None'}\n"
            f"Timestamp: {instance.timestamp}"
        )
        send_admin_notification(subject, message)


@receiver(post_save, sender=MedicationReminder)
def notify_new_medication_reminder(sender, instance, created, **kwargs):
    if created:
        subject = "NEW MEDICATION REMINDER CREATED"
        message = (
            f"A new medication reminder has been created:\n"
            f"User: {instance.user.username}\n"
            f"Medicine: {instance.medicine_name}\n"
            f"Dosage: {instance.dosage}\n"
            f"Frequency: {instance.frequency}\n"
            f"Start date: {instance.start_date}"
        )
        send_admin_notification(subject, message)


@receiver(post_save, sender=AppointmentRequest)
def notify_new_appointment_request(sender, instance, created, **kwargs):
    if created:
        subject = "NEW APPOINTMENT REQUEST"
        message = (
            f"A new appointment request has been submitted:\n"
            f"User: {instance.user.username}\n"
            f"Reason: {instance.reason}\n"
            f"Urgency: {instance.urgency}\n"
            f"Patient location: {instance.patient_location}\n"
            f"Preferred date: {instance.preferred_date}\n"
            f"Preferred time: {instance.preferred_time}\n"
            f"Confirmation code: {instance.confirmation_code}"
        )
        send_admin_notification(subject, message)


@receiver(post_save, sender=CareMessage)
def notify_new_care_message(sender, instance, created, **kwargs):
    if created:
        subject = "NEW CARE MESSAGE"
        message = (
            f"A new care message has been sent:\n"
            f"From: {instance.sender.username}\n"
            f"To: {instance.recipient.username}\n"
            f"Type: {instance.message_type}\n"
            f"Body: {instance.body}\n"
            f"Timestamp: {instance.created_at}"
        )
        send_admin_notification(subject, message)


@receiver(post_save, sender=EmergencyEvent)
def notify_new_emergency_event(sender, instance, created, **kwargs):
    if created:
        subject = "EMERGENCY EVENT TRIGGERED"
        message = (
            f"⚠️ EMERGENCY EVENT TRIGGERED ⚠️\n"
            f"User: {instance.user.username}\n"
            f"Primary contact: {instance.primary_contact}\n"
            f"Medical notes: {instance.medical_notes}\n"
            f"SMS content: {instance.sms_content}\n"
            f"Status: {instance.status}\n"
            f"Timestamp: {instance.timestamp}"
        )
        send_admin_notification(subject, message)


@receiver(post_save, sender=ContactInquiry)
def notify_new_contact_inquiry(sender, instance, created, **kwargs):
    if created:
        subject = "NEW CONTACT INQUIRY"
        message = (
            f"A new contact inquiry has been submitted:\n"
            f"User: {instance.user.username}\n"
            f"Purpose: {instance.purpose}\n"
            f"Message: {instance.message}\n"
            f"Preferred response time: {instance.preferred_response_time}\n"
            f"Confirmation code: {instance.confirmation_code}"
        )
        send_admin_notification(subject, message)
