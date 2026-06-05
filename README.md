# Remote Health Monitoring Tool

RHMT is a manual remote health monitoring portal built with React Native Expo and Django REST Framework. It does not require IoT devices or connected sensors. Patients enter their own health, nutrition, and fitness data, then the backend stores records, generates alerts, and keeps a reviewable admin history.

## Completed Manual Scope

The current defense-ready dashboard is implemented as these app areas:

- Home page: registration, login, project overview, and session access.
- Dashboard Overview: latest manual vitals, health score, risk engine, summary statistics, and seven-day trend chart.
- Log Daily Vitals: manual temperature slider, SpO2, pulse, symptoms, validation, and backend diagnostics execution.
- Medical & Lifestyle Insights: diet guidance, fitness checklist, medication reminders, saved recommendations, and notification center.
- Profile & History Ledger: baseline metrics, chronological logs, weekly report export, and clinician review queue.

## Real-World Completion Features

- Manual-only tracking: no physical sensors, IoT devices, or automatic device syncing are required.
- Dynamic greetings: the workspace changes between morning, afternoon, and evening using the real clock.
- Health score snapshots: each saved vital record generates a score, risk level, reasons, and next actions.
- Role-aware access: profiles support patient, clinician, caregiver, and admin roles. Patients cannot promote themselves.
- Role-scoped navigation: patients see self-journaling pages, while doctors/admins see clinical review pages.
- Clinician review workflow: clinical roles can mark records reviewed or needing follow-up and add notes.
- Printable report export: the weekly report endpoint prepares a downloadable text report for clinical or defense review.
- Notification center: alerts can be reviewed and marked as read from the dashboard.
- Medication adherence: reminders can be created and marked taken or missed.
- Red-alert appointment booking: urgent vitals advise immediate help and can create an appointment request.
- Intelligent care routing: appointment requests use typed patient location to suggest a nearby facility and assign an available doctor/admin account.
- Patient-doctor messaging: patients can send symptom updates and doctors can reply from the clinical dashboard.
- Stronger validation: impossible vitals such as SpO2 above 100 are rejected by both frontend and backend.

## Manual Data Users Can Add

- Vitals: temperature, heart rate, oxygen saturation, symptoms, medicine taken, and wellbeing score.
- Patient baseline: age, weight, height, blood group, diagnosed conditions, water goal, and step goal.
- Nutrition: water intake, weight history, meals, calories, carbs, protein, fat, and notes.
- Fitness: activity name, steps, duration, optional heart rate, intensity, and goal notes.
- Support: contact inquiries and emergency events.

The app still supports an offline queue for manual vitals. This is only for network availability, not device syncing.

## Role-Based Screens

Patient users see:

- Dashboard Overview: personal health score, latest vitals, risk engine, and trend chart.
- Log Daily Vitals: manual temperature, SpO2, pulse, symptoms, and diagnostics submission.
- Medical & Lifestyle Insights: nutrition, fitness, medication reminders, red-alert appointment booking, and notifications.
- Doctor Interaction: patient updates, doctor replies, appointment assignment, and nearby facility details.
- Profile & History Ledger: baseline metrics, personal history, and weekly report export.

Doctor, clinician, caregiver, and admin users see:

- Clinical Overview: patient counts, urgent-risk counts, pending reviews, urgent bookings, and review queue.
- Appointments & Alerts: appointment requests and clinical notifications.
- Patient-Doctor Messages: updates from patients and doctor replies linked to appointment requests.
- Patients & Reports: clinical patient review queue with reviewed/follow-up actions.

Patients do not see doctor/admin review controls. Clinical roles do not see patient self-journaling controls.

## Project Structure

```text
RHM/
|-- SITE_MAP.md                # Role-based app and API sitemap
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
python manage.py runserver 8080
```

The backend runs at `http://localhost:8080`.

Production-sensitive settings are read from environment variables. Copy `.env.example`
for local reference and set at least `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`,
`DJANGO_ALLOWED_HOSTS`, and the HTTPS cookie/security values before deployment.

### Frontend

Always run Expo from the `frontend/` directory.

```bash
cd frontend
npm install
npm start

# Web
npm run web

# Syntax check
npm run check
```

The Expo frontend runs at `http://localhost:8081`.

The frontend uses `EXPO_PUBLIC_API_BASE_URL` when set. By default it calls:

```text
http://localhost:8080/api
```

## Main API Collections

- `POST /api/users/` for registration.
- `POST /api/token/` for JWT login.
- `/api/profiles/` for patient baselines.
- `/api/records/` for manual vital records.
- `/api/records/health_summary/` for score, risk, next actions, and dashboard summary.
- `/api/records/weekly_report/` for report data.
- `/api/records/weekly_report_export/` for downloadable report text.
- `/api/records/{id}/review/` for clinician review status and notes.
- `/api/health-scores/` for saved health score snapshots.
- `/api/medication-reminders/` for medication reminders and adherence.
- `/api/nutrition-logs/` for water and weight logs.
- `/api/food-logs/` for meals, calories, and macros.
- `/api/fitness-logs/` for steps, workouts, duration, and intensity.
- `/api/alerts/` for clinical alerts.
- `/api/recommendations/` for generated care guidance.
- `/api/contact-inquiries/` for support forms.
- `/api/appointment-requests/` for urgent or routine appointment booking.
- `/api/care-messages/` for patient-doctor updates and replies.
- `/api/emergency-events/` for emergency records.
- `/api/logs/` for backend activity logs.

## Notes

- No IoT setup is needed.
- Manual entries are owned by the authenticated user.
- Critical SpO2, fever, and condition-based rules create alerts and recommendations.
- Clinical review actions require clinician, caregiver, admin, or Django staff access.
- Local cache clearing does not delete backend records.
