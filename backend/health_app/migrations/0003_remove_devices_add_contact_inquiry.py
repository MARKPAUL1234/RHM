from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('health_app', '0002_userprofile_blood_glucose_userprofile_blood_pressure_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveField(
            model_name='userprofile',
            name='device_id',
        ),
        migrations.CreateModel(
            name='ContactInquiry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('purpose', models.CharField(max_length=120)),
                ('message', models.TextField()),
                ('preferred_response_time', models.CharField(blank=True, default='Within 24 hours', max_length=80)),
                ('status', models.CharField(choices=[('submitted', 'Submitted'), ('in_review', 'In Review'), ('closed', 'Closed')], default='submitted', max_length=20)),
                ('confirmation_code', models.CharField(blank=True, max_length=40)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='contact_inquiries', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-timestamp'],
            },
        ),
    ]
