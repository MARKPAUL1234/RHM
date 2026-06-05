from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('health_app', '0004_manual_food_and_fitness_logs'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='HealthScoreSnapshot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('score', models.IntegerField(default=100)),
                ('risk_level', models.CharField(choices=[('stable', 'Stable'), ('watch', 'Watch'), ('urgent', 'Urgent')], default='stable', max_length=20)),
                ('reasons', models.JSONField(blank=True, default=list)),
                ('next_actions', models.JSONField(blank=True, default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('record', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='score_snapshots', to='health_app.healthrecord')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='health_scores', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='MedicationReminder',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('medicine_name', models.CharField(max_length=120)),
                ('dosage', models.CharField(blank=True, max_length=80)),
                ('scheduled_time', models.TimeField()),
                ('frequency', models.CharField(default='Daily', max_length=80)),
                ('status', models.CharField(choices=[('active', 'Active'), ('taken', 'Taken'), ('missed', 'Missed'), ('paused', 'Paused')], default='active', max_length=20)),
                ('notes', models.CharField(blank=True, max_length=255)),
                ('last_taken_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='medication_reminders', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['scheduled_time', 'medicine_name'],
            },
        ),
    ]
