# RHMT Site Map

## Local Development URLs

- Frontend Expo: `http://localhost:8081`
- Backend Django API: `http://localhost:8080/api`
- Django Admin: `http://localhost:8080/admin`

## Public Entry

- Login and Register
  - Register patient account.
  - Login with JWT authentication.
  - Load authenticated profile and role.

## Patient Application

Patients see a self-journaling health workspace.

- Dashboard Overview
  - Daily health score.
  - Latest body temperature, SpO2, pulse, and symptoms.
  - Risk engine reasons and next actions.
  - Vital statistics cards.
  - Seven-day vitals history trend.

- Log Daily Vitals
  - Visible manual record checklist.
  - Body temperature slider.
  - SpO2 numeric input.
  - Pulse numeric input.
  - Symptom tag selection.
  - Frontend and backend validation.
  - Secure save and diagnostics execution.

- Medical & Lifestyle Insights
  - Diet and nutrition guidance.
  - Active fitness checklist.
  - Medication reminders.
  - Recommendation history.
  - Notification center.
  - Red-alert urgent care banner.
  - Urgent appointment booking with typed location.
  - Assigned nearby facility and care contact.
  - Doctor interaction messages.

- Profile & History Ledger
  - Baseline metrics.
  - Historical vitals table.
  - Weekly report export.

## Doctor, Clinician, Caregiver, And Admin Application

Clinical roles see review and care-coordination tools instead of patient self-journaling.

- Clinical Overview
  - Patient count.
  - Urgent risk count.
  - Pending review count.
  - Urgent booking count.
  - Clinical review queue.

- Appointments & Alerts
  - Appointment requests from patients.
  - Patient location.
  - Assigned facility.
  - Triage summary.
  - Clinical notifications.
  - Doctor replies to patients.

- Patients & Reports
  - Patient risk rows.
  - Latest health score.
  - Review status.
  - Reviewed action.
  - Follow-up action.

## Backend API Map

- Auth
  - `POST /api/users/`
  - `POST /api/token/`
  - `POST /api/token/refresh/`
  - `GET /api/users/me/`

- Profiles And Roles
  - `GET /api/profiles/my_profile/`
  - `PATCH /api/profiles/my_profile/`
  - `GET /api/users/patient_overview/`

- Manual Health Records
  - `GET /api/records/`
  - `POST /api/records/`
  - `GET /api/records/health_summary/`
  - `GET /api/records/weekly_report/`
  - `GET /api/records/weekly_report_export/`
  - `PATCH /api/records/{id}/review/`

- Health Intelligence
  - `GET /api/health-scores/`
  - `GET /api/recommendations/`
  - `GET /api/alerts/`
  - `PATCH /api/alerts/{id}/`

- Care Coordination
  - `GET /api/appointment-requests/`
  - `POST /api/appointment-requests/`
  - `GET /api/care-messages/`
  - `POST /api/care-messages/`
  - `GET /api/emergency-events/`
  - `POST /api/emergency-events/`
  - `GET /api/contact-inquiries/`
  - `POST /api/contact-inquiries/`

- Lifestyle Logs
  - `GET /api/medication-reminders/`
  - `POST /api/medication-reminders/`
  - `POST /api/medication-reminders/{id}/mark_taken/`
  - `POST /api/medication-reminders/{id}/mark_missed/`
  - `GET /api/nutrition-logs/`
  - `POST /api/nutrition-logs/`
  - `GET /api/food-logs/`
  - `POST /api/food-logs/`
  - `GET /api/fitness-logs/`
  - `POST /api/fitness-logs/`
  - `GET /api/records/fitness_summary/`

- System
  - `GET /api/logs/`

## Role Visibility Summary

- Patient users can see only their own records, alerts, appointments, messages, reminders, and reports.
- Doctor, clinician, caregiver, and admin users can see clinical overview rows, appointment requests, care messages addressed to them, and clinical alerts.
- Patients cannot promote themselves into clinical roles from the app.
