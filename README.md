# Remote Health Monitoring Tool

RHMT is a manual remote health monitoring portal built with React Native Expo and Django REST Framework. It does not require IoT devices or connected sensors. Patients enter their own health, nutrition, and fitness data, then the backend stores records, generates alerts, and keeps a reviewable admin history.

## Completed Manual Scope

The original diagram is implemented as these app areas:

- Home page: registration, login, project overview, and session access.
- Dashboard: latest manual vitals, alert summary, recommendations, emergency events, and offline queue status.
- Services: manual patient monitoring, nutrition, and fitness tracker.
- Visualization: charts built from saved health records.
- Notifications: critical alerts, care recommendations, emergency events, and backend logs.
- Contact us: inquiry form with confirmation code and response-time preference.
- Account settings: profile, age, weight, height, blood group, diagnosed conditions, water goal, and step goal.
- Emergency: contacts, disclaimer, emergency event creation, and critical alert creation.
- Admin: backend collection review for manual records, food logs, fitness logs, nutrition logs, alerts, recommendations, emergency events, and logs.

## Manual Data Users Can Add

- Vitals: temperature, heart rate, oxygen saturation, symptoms, medicine taken, and wellbeing score.
- Patient baseline: age, weight, height, blood group, diagnosed conditions, water goal, and step goal.
- Nutrition: water intake, weight history, meals, calories, carbs, protein, fat, and notes.
- Fitness: activity name, steps, duration, optional heart rate, intensity, and goal notes.
- Support: contact inquiries and emergency events.

The app still supports an offline queue for manual vitals. This is only for network availability, not device syncing.

## Project Structure

```text
RHM/
|-- frontend/                  # React Native Expo app
|   |-- App.js                 # App state and Django data refresh
|   |-- src/
|   |   |-- navigation/        # App tabs
|   |   |-- screens/           # Dashboard, services, alerts, admin, etc.
|   |   |-- services/          # Django API client
|   |   |-- context/           # Shared health context
|   |   `-- styles/            # Theme and responsive metrics
|   |-- app.json
|   |-- package.json
|   `-- assets/
`-- backend/                   # Django REST API
    |-- health_app/
    |   |-- models.py          # Manual health, food, fitness, alert models
    |   |-- serializers.py
    |   |-- views.py
    |   |-- urls.py
    |   `-- migrations/
    |-- rhmt_backend/
    |-- manage.py
    `-- requirements.txt
```

## Quick Start

### Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The backend runs at `http://localhost:8000`.

### Frontend

Always run Expo from the `frontend/` directory.

```bash
cd frontend
npm install
npm start

# Web
npm run web
```

The frontend uses `EXPO_PUBLIC_API_BASE_URL` when set. By default it calls:

```text
http://localhost:8000/api
```

## Main API Collections

- `POST /api/users/` for registration.
- `POST /api/token/` for JWT login.
- `/api/profiles/` for patient baselines.
- `/api/records/` for manual vital records.
- `/api/nutrition-logs/` for water and weight logs.
- `/api/food-logs/` for meals, calories, and macros.
- `/api/fitness-logs/` for steps, workouts, duration, and intensity.
- `/api/alerts/` for clinical alerts.
- `/api/recommendations/` for generated care guidance.
- `/api/contact-inquiries/` for support forms.
- `/api/emergency-events/` for emergency records.
- `/api/logs/` for backend activity logs.

## Notes

- No IoT setup is needed.
- Manual entries are owned by the authenticated user.
- Critical SpO2, fever, and condition-based rules create alerts and recommendations.
- Admin review is for inspecting backend collections; local cache clearing does not delete backend records.
