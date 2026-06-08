
from django.core.mail import send_mail
from django.conf import settings

# Admin contact details as provided
ADMIN_EMAIL = "mubirumarkpaul53@gmail.com"
ADMIN_PHONE = "0706362038"


def send_email_notification(subject, message):
    """Send email notification to admin"""
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ADMIN_EMAIL],
            fail_silently=False,
        )
        print(f"Email sent to {ADMIN_EMAIL}")
    except Exception as e:
        print(f"Error sending email: {e}")


def send_sms_notification(message):
    """Send SMS notification to admin (placeholder - integrate with Twilio/other service later)"""
    try:
        # For now, just print the SMS (in production, integrate with Twilio, AfricasTalking, etc.)
        print(f"[SMS TO {ADMIN_PHONE}]: {message}")
        # Example Twilio integration:
        # from twilio.rest import Client
        # client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        # message = client.messages.create(
        #     body=message,
        #     from_=settings.TWILIO_PHONE_NUMBER,
        #     to=ADMIN_PHONE
        # )
    except Exception as e:
        print(f"Error sending SMS: {e}")


def send_admin_notification(subject, message):
    """Send both email and SMS notifications to admin"""
    send_email_notification(subject, message)
    send_sms_notification(message)
