from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('health_app', '0008_add_doctor_role'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='appointmentrequest',
            name='patient_location',
            field=models.CharField(blank=True, max_length=160),
        ),
        migrations.AddField(
            model_name='appointmentrequest',
            name='triage_level',
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name='appointmentrequest',
            name='triage_summary',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='appointmentrequest',
            name='assigned_facility_name',
            field=models.CharField(blank=True, max_length=160),
        ),
        migrations.AddField(
            model_name='appointmentrequest',
            name='assigned_facility_address',
            field=models.CharField(blank=True, max_length=220),
        ),
        migrations.AddField(
            model_name='appointmentrequest',
            name='assigned_facility_contact',
            field=models.CharField(blank=True, max_length=60),
        ),
        migrations.AddField(
            model_name='appointmentrequest',
            name='assigned_doctor',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='assigned_appointment_requests',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.CreateModel(
            name='CareMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('message_type', models.CharField(choices=[('patient_update', 'Patient Update'), ('doctor_reply', 'Doctor Reply'), ('system_triage', 'System Triage')], default='patient_update', max_length=30)),
                ('body', models.TextField()),
                ('status', models.CharField(default='unread', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('appointment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='care_messages', to='health_app.appointmentrequest')),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='received_care_messages', to=settings.AUTH_USER_MODEL)),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_care_messages', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
