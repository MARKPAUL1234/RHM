from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('health_app', '0007_appointment_request'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userprofile',
            name='role',
            field=models.CharField(
                choices=[
                    ('patient', 'Patient'),
                    ('doctor', 'Doctor'),
                    ('clinician', 'Clinician'),
                    ('caregiver', 'Caregiver'),
                    ('admin', 'Admin'),
                ],
                default='patient',
                max_length=20,
            ),
        ),
    ]
