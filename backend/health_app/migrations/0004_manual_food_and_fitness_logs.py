from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('health_app', '0003_remove_devices_add_contact_inquiry'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='FitnessLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('activity_name', models.CharField(default='Manual activity', max_length=120)),
                ('steps', models.IntegerField(default=0)),
                ('duration_minutes', models.IntegerField(default=0)),
                ('heart_rate', models.IntegerField(blank=True, null=True)),
                ('intensity', models.CharField(choices=[('recovery', 'Recovery'), ('low', 'Low'), ('moderate', 'Moderate'), ('high', 'High')], default='low', max_length=20)),
                ('goal_note', models.CharField(blank=True, max_length=255)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fitness_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-timestamp'],
            },
        ),
        migrations.CreateModel(
            name='FoodLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('meal_type', models.CharField(choices=[('breakfast', 'Breakfast'), ('lunch', 'Lunch'), ('dinner', 'Dinner'), ('snack', 'Snack')], default='breakfast', max_length=20)),
                ('food_name', models.CharField(max_length=120)),
                ('calories', models.IntegerField(default=0)),
                ('carbs_g', models.FloatField(default=0)),
                ('protein_g', models.FloatField(default=0)),
                ('fat_g', models.FloatField(default=0)),
                ('note', models.CharField(blank=True, max_length=255)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='food_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-timestamp'],
            },
        ),
    ]
