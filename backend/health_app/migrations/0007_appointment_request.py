from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('health_app', '0006_roles_and_clinician_reviews'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AppointmentRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reason', models.CharField(max_length=180)),
                ('urgency', models.CharField(choices=[('routine', 'Routine'), ('soon', 'Soon'), ('urgent', 'Urgent'), ('emergency', 'Emergency')], default='routine', max_length=20)),
                ('preferred_date', models.DateField(blank=True, null=True)),
                ('preferred_time', models.TimeField(blank=True, null=True)),
                ('status', models.CharField(choices=[('requested', 'Requested'), ('confirmed', 'Confirmed'), ('cancelled', 'Cancelled'), ('completed', 'Completed')], default='requested', max_length=20)),
                ('clinician_note', models.TextField(blank=True)),
                ('confirmation_code', models.CharField(blank=True, max_length=40)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='appointment_requests', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
