from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('health_app', '0005_health_score_and_medication_reminders'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='role',
            field=models.CharField(
                choices=[
                    ('patient', 'Patient'),
                    ('clinician', 'Clinician'),
                    ('caregiver', 'Caregiver'),
                    ('admin', 'Admin'),
                ],
                default='patient',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='healthrecord',
            name='review_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending Review'),
                    ('reviewed', 'Reviewed'),
                    ('follow_up', 'Needs Follow Up'),
                    ('escalated', 'Escalated'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='healthrecord',
            name='clinician_note',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='healthrecord',
            name='reviewed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='healthrecord',
            name='reviewed_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='reviewed_health_records',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
