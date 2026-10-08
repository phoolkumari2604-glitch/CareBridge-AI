from app.core.database import get_database


def create_indexes():
    db = get_database()

    # Users
    db.users.create_index(
        "email",
        unique=True,
        name="users_email_unique",
    )

    # Patients
    db.patients.create_index(
        "user_id",
        name="patients_user_id",
    )

    # Hospitals
    db.hospitals.create_index("city", name="hospitals_city")
    db.hospitals.create_index("name", name="hospitals_name")
    db.hospitals.create_index("state", name="hospitals_state")
    db.hospitals.create_index("country", name="hospitals_country")
    db.hospitals.create_index("facility_type", name="hospitals_facility_type")
    db.hospitals.create_index("data_source", name="hospitals_data_source")

    # Doctors
    db.doctors.create_index(
        "hospital_id",
        name="doctors_hospital_id",
    )

    # Appointments
    db.appointments.create_index(
        "patient_id",
        name="appointments_patient_id",
    )

    db.appointments.create_index(
        "doctor_id",
        name="appointments_doctor_id",
    )

    db.appointments.create_index(
        "appointment_date",
        name="appointments_date",
    )

    # Queue
    db.queue.create_index(
        "appointment_id",
        name="queue_appointment_id",
    )

    # Vital signs
    db.vital_signs.create_index(
        "patient_id",
        name="vitals_patient_id",
    )

    db.vital_signs.create_index(
        [("patient_id", 1), ("recorded_at", -1)],
        name="vitals_patient_recorded",
    )

    # Health records
    db.health_records.create_index(
        "patient_id",
        name="health_records_patient_id",
    )

    # Audit logs
    db.audit_logs.create_index(
        [("created_at", -1)],
        name="audit_created_at",
    )

    # Notifications
    db.notifications.create_index(
        [("patient_id", 1), ("created_at", -1)],
        name="notifications_patient_created",
    )

    # AI conversation history
    db.ai_conversations.create_index(
        [("patient_id", 1), ("created_at", -1)],
        name="ai_conversations_patient_created",
    )

    print("MongoDB indexes created successfully.")