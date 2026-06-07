from django.contrib.auth.models import User
from django.test import Client, TestCase

from .models import (
    Alert,
    AppointmentRequest,
    CareMessage,
    FitnessLog,
    FoodLog,
    HealthRecord,
    NutritionLog,
    Recommendation,
    UserProfile,
)


class AuthCorsTests(TestCase):
    origin = "http://localhost:8081"

    def setUp(self):
        self.client = Client(HTTP_ORIGIN=self.origin)

    def test_token_preflight_returns_cors_headers(self):
        response = self.client.options(
            "/api/token/",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type",
        )

        self.assertEqual(response.status_code, 204)
        self.assertEqual(response["Access-Control-Allow-Origin"], self.origin)
        self.assertIn("POST", response["Access-Control-Allow-Methods"])
        self.assertIn("content-type", response["Access-Control-Allow-Headers"])

    def test_register_login_and_me_work_from_expo_origin(self):
        register_response = self.client.post(
            "/api/users/",
            data={
                "username": "mark",
                "email": "mark@example.com",
                "password": "markpass123",
            },
            content_type="application/json",
        )

        self.assertEqual(register_response.status_code, 201)
        self.assertEqual(register_response["Access-Control-Allow-Origin"], self.origin)
        self.assertTrue(User.objects.filter(username="mark").exists())

        login_response = self.client.post(
            "/api/token/",
            data={"username": "mark", "password": "markpass123"},
            content_type="application/json",
        )

        self.assertEqual(login_response.status_code, 200)
        self.assertEqual(login_response["Access-Control-Allow-Origin"], self.origin)
        access_token = login_response.json()["access"]

        me_response = self.client.get(
            "/api/users/me/",
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )

        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response["Access-Control-Allow-Origin"], self.origin)
        self.assertEqual(me_response.json()["username"], "mark")


class HealthWorkflowTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.patient = User.objects.create_user(
            username="patient",
            email="patient@example.com",
            password="patientpass123",
        )
        UserProfile.objects.create(user=self.patient, display_name="Test Patient")
        login_response = self.client.post(
            "/api/token/",
            data={"username": "patient", "password": "patientpass123"},
            content_type="application/json",
        )
        self.patient_token = login_response.json()["access"]

    def auth(self, token=None):
        return {"HTTP_AUTHORIZATION": f"Bearer {token or self.patient_token}"}

    def test_invalid_vitals_are_rejected(self):
        response = self.client.post(
            "/api/records/",
            data={
                "temperature": 36.7,
                "heart_rate": 72,
                "spo2": 105,
                "symptoms_array": [],
            },
            content_type="application/json",
            **self.auth(),
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("spo2", response.json())

    def test_weekly_report_export_uses_saved_patient_records(self):
        HealthRecord.objects.create(
            user=self.patient,
            temperature=36.7,
            heart_rate=74,
            spo2=98,
            symptoms_array=[],
        )
        export_response = self.client.get(
            "/api/records/weekly_report_export/",
            **self.auth(),
        )
        self.assertEqual(export_response.status_code, 200)
        self.assertIn("WEEKLY PATIENT REPORT", export_response.json()["report_text"])

    def test_urgent_appointment_request_creates_alertable_booking(self):
        doctor = User.objects.create_user(
            username="bookingdoctor",
            email="bookingdoctor@example.com",
            password="doctorpass123",
        )
        UserProfile.objects.create(user=doctor, display_name="Booking Doctor", role="doctor")
        response = self.client.post(
            "/api/appointment-requests/",
            data={
                "reason": "Red alert vitals review",
                "urgency": "urgent",
                "patient_location": "Kampala central",
                "preferred_date": "2026-06-04",
                "preferred_time": "09:00",
            },
            content_type="application/json",
            **self.auth(),
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["confirmation_code"].startswith("APT-"))
        self.assertEqual(response.json()["assigned_facility_name"], "Kampala City Medical Centre")
        self.assertEqual(response.json()["assigned_doctor_username"], "bookingdoctor")
        self.assertEqual(AppointmentRequest.objects.filter(user=self.patient, urgency="urgent").count(), 1)
        self.assertEqual(CareMessage.objects.filter(recipient=doctor, message_type="system_triage").count(), 1)

    def test_patient_and_doctor_can_exchange_care_messages(self):
        doctor = User.objects.create_user(
            username="messagedoctor",
            email="messagedoctor@example.com",
            password="doctorpass123",
        )
        UserProfile.objects.create(user=doctor, display_name="Message Doctor", role="doctor")
        appointment = AppointmentRequest.objects.create(
            user=self.patient,
            reason="Need review",
            urgency="soon",
            assigned_doctor=doctor,
        )

        patient_message = self.client.post(
            "/api/care-messages/",
            data={"appointment": appointment.id, "body": "My headache is still present."},
            content_type="application/json",
            **self.auth(),
        )
        self.assertEqual(patient_message.status_code, 201)
        self.assertEqual(patient_message.json()["recipient_username"], "messagedoctor")

        login_response = self.client.post(
            "/api/token/",
            data={"username": "messagedoctor", "password": "doctorpass123"},
            content_type="application/json",
        )
        doctor_token = login_response.json()["access"]

        doctor_messages = self.client.get("/api/care-messages/", **self.auth(doctor_token))
        self.assertEqual(len(doctor_messages.json()), 1)

        doctor_reply = self.client.post(
            "/api/care-messages/",
            data={
                "appointment": appointment.id,
                "recipient_id": self.patient.id,
                "body": "Please rest and come for review if pain persists.",
            },
            content_type="application/json",
            **self.auth(doctor_token),
        )
        self.assertEqual(doctor_reply.status_code, 201)
        self.assertEqual(doctor_reply.json()["recipient_username"], "patient")

        patient_messages = self.client.get("/api/care-messages/", **self.auth())
        self.assertEqual(len(patient_messages.json()), 2)

    def test_only_clinical_roles_can_review_records(self):
        record = HealthRecord.objects.create(
            user=self.patient,
            temperature=36.8,
            heart_rate=74,
            spo2=98,
        )

        patient_review = self.client.patch(
            f"/api/records/{record.id}/review/",
            data={"review_status": "reviewed", "clinician_note": "Looks stable."},
            content_type="application/json",
            **self.auth(),
        )
        self.assertEqual(patient_review.status_code, 403)

        clinician = User.objects.create_user(
            username="clinician",
            email="clinician@example.com",
            password="clinicianpass123",
        )
        UserProfile.objects.create(user=clinician, display_name="Test Clinician", role="clinician")
        login_response = self.client.post(
            "/api/token/",
            data={"username": "clinician", "password": "clinicianpass123"},
            content_type="application/json",
        )
        clinician_token = login_response.json()["access"]

        clinician_review = self.client.patch(
            f"/api/records/{record.id}/review/",
            data={"review_status": "reviewed", "clinician_note": "Looks stable."},
            content_type="application/json",
            **self.auth(clinician_token),
        )
        self.assertEqual(clinician_review.status_code, 200)
        self.assertEqual(clinician_review.json()["review_status"], "reviewed")

    def test_patient_and_clinician_scopes_are_separated(self):
        other = User.objects.create_user(
            username="otherpatient",
            email="other@example.com",
            password="otherpass123",
        )
        UserProfile.objects.create(user=other, display_name="Other Patient")
        Alert.objects.create(user=other, severity="critical", alert_message="Other patient alert")

        patient_alerts = self.client.get("/api/alerts/", **self.auth())
        self.assertEqual(patient_alerts.status_code, 200)
        self.assertEqual(len(patient_alerts.json()), 0)

        patient_overview = self.client.get("/api/users/patient_overview/", **self.auth())
        self.assertEqual(patient_overview.status_code, 200)
        self.assertFalse(patient_overview.json()["clinical_access"])
        self.assertEqual(len(patient_overview.json()["rows"]), 1)
        self.assertEqual(patient_overview.json()["rows"][0]["username"], "patient")

        clinician = User.objects.create_user(
            username="scopeclinician",
            email="scopeclinician@example.com",
            password="clinicianpass123",
        )
        UserProfile.objects.create(user=clinician, display_name="Scope Clinician", role="clinician")
        login_response = self.client.post(
            "/api/token/",
            data={"username": "scopeclinician", "password": "clinicianpass123"},
            content_type="application/json",
        )
        clinician_token = login_response.json()["access"]

        clinician_alerts = self.client.get("/api/alerts/", **self.auth(clinician_token))
        self.assertEqual(clinician_alerts.status_code, 200)
        self.assertEqual(len(clinician_alerts.json()), 1)

        clinician_overview = self.client.get("/api/users/patient_overview/", **self.auth(clinician_token))
        self.assertTrue(clinician_overview.json()["clinical_access"])
        self.assertGreaterEqual(len(clinician_overview.json()["rows"]), 2)

    def test_reset_my_data_clears_patient_records_but_keeps_account(self):
        profile = UserProfile.objects.get(user=self.patient)
        profile.age = 33
        profile.weight = 76
        profile.daily_water_goal_ml = 2200
        profile.save()
        HealthRecord.objects.create(user=self.patient, temperature=37.1, heart_rate=82, spo2=97)
        NutritionLog.objects.create(user=self.patient, entry_type="water", value=250, unit="ml")
        FoodLog.objects.create(user=self.patient, meal_type="lunch", food_name="Rice", calories=450)
        FitnessLog.objects.create(user=self.patient, activity_name="Walking", steps=1200, duration_minutes=12)
        Alert.objects.create(user=self.patient, severity="info", alert_message="Test alert")
        Recommendation.objects.create(
            user=self.patient,
            meal_plan="Hydrate",
            fluid_target="2L",
            lifestyle_guideline="Rest",
        )

        response = self.client.post("/api/users/reset_my_data/", content_type="application/json", **self.auth())

        self.assertEqual(response.status_code, 200)
        self.assertTrue(User.objects.filter(username="patient").exists())
        self.assertEqual(HealthRecord.objects.filter(user=self.patient).count(), 0)
        self.assertEqual(NutritionLog.objects.filter(user=self.patient).count(), 0)
        self.assertEqual(FoodLog.objects.filter(user=self.patient).count(), 0)
        self.assertEqual(FitnessLog.objects.filter(user=self.patient).count(), 0)
        self.assertEqual(Alert.objects.filter(user=self.patient).count(), 0)
        self.assertEqual(Recommendation.objects.filter(user=self.patient).count(), 0)
        profile.refresh_from_db()
        self.assertIsNone(profile.age)
        self.assertIsNone(profile.weight)
        self.assertEqual(profile.daily_water_goal_ml, 0)
