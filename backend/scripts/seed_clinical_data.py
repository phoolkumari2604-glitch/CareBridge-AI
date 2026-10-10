import os
import sys
import random
from datetime import datetime, timezone, timedelta
from bson import ObjectId

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.core.database import get_database

def seed_clinical_data():
    db = get_database()
    print("Seeding rich clinical data for Doctor Portal and CareBridge AI...")
    
    # 1. Doctors lookup
    doctors = list(db.doctors.find({"verification_status": "Verified"}))
    if not doctors:
        doctors = list(db.doctors.find({}))
    if not doctors:
        print("Error: No doctors found in database. Please seed doctors first.")
        return
        
    primary_doctor = doctors[0]
    primary_doc_id = primary_doctor["_id"]
    primary_doc_name = primary_doctor.get("name", "Dr. Rajesh Sharma, MD")
    hospital_name = primary_doctor.get("hospital_name") or primary_doctor.get("hospital", "CareBridge Super Specialty Hospital")

    # 2. Patients list
    patient_defs = [
        {
            "name": "Aarav Patel",
            "age": 52,
            "gender": "Male",
            "phone": "+91 98201 44521",
            "email": "aarav.patel@carebridge.health",
            "blood_group": "B+",
            "allergies": ["Penicillin", "Sulfa drugs"],
            "medical_history": ["Hypertension (Stage 2)", "Type 2 Diabetes Mellitus", "Coronary Artery Disease"],
            "emergency_contact": "Sunita Patel (+91 98201 44522)",
            "status": "Active",
            "patient_code": "482019"
        },
        {
            "name": "Priya Sharma",
            "age": 34,
            "gender": "Female",
            "phone": "+91 98112 33410",
            "email": "priya.sharma@carebridge.health",
            "blood_group": "O+",
            "allergies": ["Aspirin"],
            "medical_history": ["Post-partum Arrhythmia", "Mild Asthma"],
            "emergency_contact": "Vikram Sharma (+91 98112 33411)",
            "status": "Active",
            "patient_code": "721945"
        },
        {
            "name": "Kavita Reddy",
            "age": 68,
            "gender": "Female",
            "phone": "+91 94401 88923",
            "email": "kavita.reddy@carebridge.health",
            "blood_group": "A+",
            "allergies": ["Ibuprofen"],
            "medical_history": ["Congestive Heart Failure (NYHA II)", "Chronic Kidney Disease Stage 3"],
            "emergency_contact": "Suresh Reddy (+91 94401 88924)",
            "status": "Active",
            "patient_code": "391084"
        },
        {
            "name": "Rohan Deshmukh",
            "age": 41,
            "gender": "Male",
            "phone": "+91 99230 11245",
            "email": "rohan.deshmukh@carebridge.health",
            "blood_group": "AB+",
            "allergies": [],
            "medical_history": ["Hypertrophic Cardiomyopathy", "Elevated LDL Cholesterol"],
            "emergency_contact": "Meera Deshmukh (+91 99230 11246)",
            "status": "Active",
            "patient_code": "560218"
        },
        {
            "name": "Vikram Malhotra",
            "age": 63,
            "gender": "Male",
            "phone": "+91 98710 66782",
            "email": "vikram.malhotra@carebridge.health",
            "blood_group": "O-",
            "allergies": ["Contrast dye"],
            "medical_history": ["Post-PTCA (LAD Stent 2024)", "Dyslipidemia"],
            "emergency_contact": "Anita Malhotra (+91 98710 66783)",
            "status": "Active",
            "patient_code": "843190"
        },
        {
            "name": "Ananya Sen",
            "age": 29,
            "gender": "Female",
            "phone": "+91 98300 77412",
            "email": "ananya.sen@carebridge.health",
            "blood_group": "A-",
            "allergies": ["Peanuts"],
            "medical_history": ["Sinus Tachycardia", "Iron Deficiency Anemia"],
            "emergency_contact": "Debashis Sen (+91 98300 77413)",
            "status": "Active",
            "patient_code": "194832"
        },
        {
            "name": "Harish Iyer",
            "age": 58,
            "gender": "Male",
            "phone": "+91 98402 99120",
            "email": "harish.iyer@carebridge.health",
            "blood_group": "B-",
            "allergies": [],
            "medical_history": ["Atrial Fibrillation (Paroxysmal)", "Hypertension"],
            "emergency_contact": "Laxmi Iyer (+91 98402 99121)",
            "status": "Active",
            "patient_code": "627415"
        },
        {
            "name": "Dr. Sarah Jenkins",
            "age": 47,
            "gender": "Female",
            "phone": "+1 415 892 4102",
            "email": "sarah.jenkins@stanford.med",
            "blood_group": "O+",
            "allergies": ["Latex"],
            "medical_history": ["Mitral Valve Prolapse (Mild)", "Migraine with Aura"],
            "emergency_contact": "David Jenkins (+1 415 892 4103)",
            "status": "Active",
            "patient_code": "912304"
        }
    ]

    seeded_patient_ids = []
    for p_def in patient_defs:
        code = p_def["patient_code"]
        existing = db.patients.find_one({"$or": [{"patient_code": code}, {"email": p_def["email"]}]})
        if existing:
            db.patients.update_one({"_id": existing["_id"]}, {"$set": {
                **p_def,
                "patient_id_code": code,
                "is_test": False,
                "updated_at": datetime.now(timezone.utc)
            }})
            seeded_patient_ids.append((existing["_id"], p_def["name"], code))
        else:
            doc = {
                **p_def,
                "patient_id_code": code,
                "is_test": False,
                "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(10, 180)),
                "updated_at": datetime.now(timezone.utc)
            }
            res = db.patients.insert_one(doc)
            seeded_patient_ids.append((res.inserted_id, p_def["name"], code))

    print(f"Ensured {len(seeded_patient_ids)} realistic clinical patient profiles.")

    # 3. Seed Today's & Upcoming Appointments for Primary Doctor & others
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tomorrow_str = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    day_after_str = (datetime.now(timezone.utc) + timedelta(days=2)).strftime("%Y-%m-%d")
    next_week_str = (datetime.now(timezone.utc) + timedelta(days=5)).strftime("%Y-%m-%d")

    # Clear old appointments for these specific seeded patients to ensure pristine schedule
    patient_oids = [p[0] for p in seeded_patient_ids]
    db.appointments.delete_many({"patient_id": {"$in": patient_oids}})
    db.approvals.delete_many({"patient_id": {"$in": patient_oids}})

    schedule_templates = [
        # Today's slots
        {
            "patient_idx": 0,
            "date": today_str,
            "time": "09:00 AM",
            "reason": "Cardiac Telemetry Review & Holter Follow-up",
            "status": "COMPLETED",
            "approval_status": "APPROVED",
            "doctor_id": primary_doc_id,
            "doctor_name": primary_doc_name,
            "type": "In-Person Consultation"
        },
        {
            "patient_idx": 1,
            "date": today_str,
            "time": "10:30 AM",
            "reason": "Post-partum ECG & Palpitations Evaluation",
            "status": "IN_CONSULTATION",
            "approval_status": "APPROVED",
            "doctor_id": primary_doc_id,
            "doctor_name": primary_doc_name,
            "type": "Echocardiogram Review"
        },
        {
            "patient_idx": 2,
            "date": today_str,
            "time": "11:45 AM",
            "reason": "Congestive Heart Failure Medication Adjustment",
            "status": "APPROVED",
            "approval_status": "APPROVED",
            "doctor_id": primary_doc_id,
            "doctor_name": primary_doc_name,
            "type": "Clinical Follow-up"
        },
        {
            "patient_idx": 3,
            "date": today_str,
            "time": "02:15 PM",
            "reason": "Cardiomyopathy Genetic Workup & Lipid Panel",
            "status": "APPROVED",
            "approval_status": "APPROVED",
            "doctor_id": primary_doc_id,
            "doctor_name": primary_doc_name,
            "type": "Diagnostic Consultation"
        },
        {
            "patient_idx": 4,
            "date": today_str,
            "time": "03:45 PM",
            "reason": "Post-Stent Routine Angiography Checkup",
            "status": "PENDING",
            "approval_status": "PENDING",
            "doctor_id": primary_doc_id,
            "doctor_name": primary_doc_name,
            "type": "Post-Op Review"
        },
        {
            "patient_idx": 5,
            "date": today_str,
            "time": "05:00 PM",
            "reason": "Sinus Tachycardia Holter Disconnection",
            "status": "APPROVED",
            "approval_status": "APPROVED",
            "doctor_id": primary_doc_id,
            "doctor_name": primary_doc_name,
            "type": "Triage & Vitals"
        },
        # Upcoming slots
        {
            "patient_idx": 6,
            "date": tomorrow_str,
            "time": "10:00 AM",
            "reason": "Atrial Fibrillation Anticoagulation Management",
            "status": "APPROVED",
            "approval_status": "APPROVED",
            "doctor_id": primary_doc_id,
            "doctor_name": primary_doc_name,
            "type": "Anticoagulation Clinic"
        },
        {
            "patient_idx": 7,
            "date": tomorrow_str,
            "time": "02:30 PM",
            "reason": "International Remote Second Opinion (Mitral Valve)",
            "status": "APPROVED",
            "approval_status": "APPROVED",
            "doctor_id": primary_doc_id,
            "doctor_name": primary_doc_name,
            "type": "Telehealth Video"
        },
        {
            "patient_idx": 0,
            "date": day_after_str,
            "time": "11:00 AM",
            "reason": "Stress Thallium Scan & Treadmill Test",
            "status": "PENDING",
            "approval_status": "PENDING",
            "doctor_id": primary_doc_id,
            "doctor_name": primary_doc_name,
            "type": "Diagnostic Scan"
        },
        {
            "patient_idx": 2,
            "date": next_week_str,
            "time": "09:30 AM",
            "reason": "Renal & Cardiac Biomarker Panel",
            "status": "APPROVED",
            "approval_status": "APPROVED",
            "doctor_id": primary_doc_id,
            "doctor_name": primary_doc_name,
            "type": "Laboratory Follow-up"
        }
    ]

    for item in schedule_templates:
        pid, pname, pcode = seeded_patient_ids[item["patient_idx"]]
        booking_code = f"APT-{random.randint(100000, 999999)}"
        
        appt_doc = {
            "booking_id": booking_code,
            "patient_id": pid,
            "patient_name": pname,
            "patient_code": pcode,
            "patient_id_code": pcode,
            "patient_phone": patient_defs[item["patient_idx"]]["phone"],
            "patient_email": patient_defs[item["patient_idx"]]["email"],
            "doctor_id": item["doctor_id"],
            "doctor_name": item["doctor_name"],
            "hospital_name": hospital_name,
            "specialty": "Cardiology & Internal Medicine",
            "appointment_date": item["date"],
            "appointment_time": item["time"],
            "reason": item["reason"],
            "consultation_type": item["type"],
            "status": item["status"],
            "approval_status": item["approval_status"],
            "is_test": False,
            "created_at": datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 48)),
            "updated_at": datetime.now(timezone.utc)
        }
        res = db.appointments.insert_one(appt_doc)
        
        # Approval record
        db.approvals.insert_one({
            "appointment_id": res.inserted_id,
            "patient_id": pid,
            "patient_name": pname,
            "patient_code": pcode,
            "patient_id_code": pcode,
            "patient_phone": patient_defs[item["patient_idx"]]["phone"],
            "patient_email": patient_defs[item["patient_idx"]]["email"],
            "doctor_id": item["doctor_id"],
            "doctor_name": item["doctor_name"],
            "hospital_name": hospital_name,
            "appointment_date": item["date"],
            "appointment_time": item["time"],
            "reason": item["reason"],
            "status": item["approval_status"],
            "is_test": False,
            "created_at": appt_doc["created_at"],
            "updated_at": datetime.now(timezone.utc)
        })

    print(f"Created {len(schedule_templates)} appointments with synchronized approvals.")

    # 4. Seed Health Records (Consultations, Prescriptions, Lab Reports, Diagnoses)
    db.health_records.delete_many({"patient_id": {"$in": patient_oids}})

    health_records_templates = [
        # Aarav Patel
        {
            "patient_idx": 0,
            "record_type": "CONSULTATION",
            "title": "Cardiology Comprehensive Outpatient Review",
            "doctor_name": primary_doc_name,
            "hospital_name": hospital_name,
            "record_date": today_str,
            "diagnosis": "Coronary Artery Disease with Stage 2 Essential Hypertension",
            "description": "Patient reports mild exertional shortness of breath over the past 2 weeks. Resting ECG reveals sinus rhythm with non-specific ST-T wave changes in lateral leads. Blood pressure recorded at 148/92 mmHg.",
            "medications": ["Atorvastatin 40mg (OD at bedtime)", "Telmisartan 40mg (OD morning)", "Amlodipine 5mg (OD evening)", "Aspirin 75mg (OD post lunch)"],
            "notes": "Advised low-sodium DASH diet, daily 30-minute moderate walking, and 24-hour ambulatory BP monitoring."
        },
        {
            "patient_idx": 0,
            "record_type": "PRESCRIPTION",
            "title": "Cardiovascular Maintenance Prescription",
            "doctor_name": primary_doc_name,
            "hospital_name": hospital_name,
            "record_date": today_str,
            "diagnosis": "Hypertensive Heart Disease Management",
            "description": "Adjusted Telmisartan dosage from 20mg to 40mg. Added Atorvastatin 40mg for aggressive LDL control target < 70 mg/dL.",
            "medications": ["Telmisartan 40mg", "Atorvastatin 40mg", "Metoprolol Succinate 25mg ER", "Aspirin 75mg"],
            "notes": "Refill authorized for 90 days. Repeat lipid profile in 6 weeks."
        },
        {
            "patient_idx": 0,
            "record_type": "LAB_REPORT",
            "title": "Comprehensive Fasting Metabolic & Lipid Panel",
            "doctor_name": primary_doc_name,
            "hospital_name": hospital_name,
            "record_date": (datetime.now(timezone.utc) - timedelta(days=2)).strftime("%Y-%m-%d"),
            "diagnosis": "Mixed Dyslipidemia with Impaired Fasting Glucose",
            "description": "Total Cholesterol: 224 mg/dL, Triglycerides: 198 mg/dL, HDL: 38 mg/dL, LDL: 146 mg/dL. Fasting Blood Sugar: 128 mg/dL, HbA1c: 6.8%. Serum Creatinine: 1.05 mg/dL.",
            "medications": ["Metformin 500mg (BD)"],
            "notes": "Elevated LDL and borderline HbA1c require dietary adjustment and tight pharmacological control."
        },
        # Priya Sharma
        {
            "patient_idx": 1,
            "record_type": "CONSULTATION",
            "title": "Post-Partum Arrhythmia & Telemetry Workup",
            "doctor_name": primary_doc_name,
            "hospital_name": hospital_name,
            "record_date": today_str,
            "diagnosis": "Frequent Premature Ventricular Contractions (PVCs) - Benign",
            "description": "Patient experiencing episodic flutter sensations in chest. 2D-Echocardiogram demonstrates normal LV systolic function with EF 62%. No structural abnormalities or valvular regurgitation identified.",
            "medications": ["Bisoprolol 2.5mg (OD)", "Oral Magnesium Glycinate 200mg"],
            "notes": "Reassured patient regarding benign nature. Minimize caffeine intake and optimize hydration."
        },
        # Kavita Reddy
        {
            "patient_idx": 2,
            "record_type": "CONSULTATION",
            "title": "Heart Failure & Nephrology Combined Review",
            "doctor_name": primary_doc_name,
            "hospital_name": hospital_name,
            "record_date": (datetime.now(timezone.utc) - timedelta(days=3)).strftime("%Y-%m-%d"),
            "diagnosis": "Congestive Heart Failure (NYHA Class II) with Cardiorenal Syndrome",
            "description": "Mild bilateral pedal edema noted. Lung auscultation clear. Serum eGFR calculated at 48 mL/min/1.73m². NT-proBNP level 820 pg/mL (elevated).",
            "medications": ["Torsemide 10mg (OD morning)", "Sacubitril/Valsartan 24/26mg (BD)", "Dapagliflozin 10mg (OD)"],
            "notes": "Daily weight monitoring log initiated. Restrict fluid intake to 1.5 Liters/day."
        },
        {
            "patient_idx": 2,
            "record_type": "PRESCRIPTION",
            "title": "Heart Failure Guideline Directed Medical Therapy (GDMT)",
            "doctor_name": primary_doc_name,
            "hospital_name": hospital_name,
            "record_date": (datetime.now(timezone.utc) - timedelta(days=3)).strftime("%Y-%m-%d"),
            "diagnosis": "Heart Failure with Reduced Ejection Fraction (HFrEF)",
            "description": "Initiation of quadruplet GDMT tailored for CKD stage 3 tolerance.",
            "medications": ["Sacubitril/Valsartan 24/26mg", "Dapagliflozin 10mg", "Spironolactone 12.5mg", "Carvedilol 6.25mg"],
            "notes": "Monitor serum potassium and renal panel in 14 days."
        },
        # Rohan Deshmukh
        {
            "patient_idx": 3,
            "record_type": "CONSULTATION",
            "title": "Hypertrophic Cardiomyopathy Surveillance",
            "doctor_name": primary_doc_name,
            "hospital_name": hospital_name,
            "record_date": (datetime.now(timezone.utc) - timedelta(days=5)).strftime("%Y-%m-%d"),
            "diagnosis": "Non-obstructive Hypertrophic Cardiomyopathy (HCM)",
            "description": "Interventricular septal thickness measured at 17mm. No resting LVOT gradient. Continuous telemetry showed no sustained ventricular tachyarrhythmias.",
            "medications": ["Metoprolol Succinate 50mg (OD)", "Rosuvastatin 20mg (OD)"],
            "notes": "First-degree family screening recommended. Advised against strenuous competitive athletics."
        },
        # Vikram Malhotra
        {
            "patient_idx": 4,
            "record_type": "CONSULTATION",
            "title": "6-Month Post-Angioplasty Surveillance",
            "doctor_name": primary_doc_name,
            "hospital_name": hospital_name,
            "record_date": (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d"),
            "diagnosis": "Coronary Artery Disease Status Post-DES to Mid-LAD",
            "description": "Asymptomatic, exercising on treadmill 40 mins/day without angina. Dual antiplatelet therapy well tolerated with no bleeding manifestations.",
            "medications": ["Ticagrelor 90mg (BD)", "Aspirin 75mg (OD)", "Rosuvastatin 40mg + Ezetimibe 10mg (OD)"],
            "notes": "Complete 12-month DAPT course prior to considering step-down to Aspirin monotherapy."
        }
    ]

    for h_rec in health_records_templates:
        pid, pname, pcode = seeded_patient_ids[h_rec["patient_idx"]]
        doc = {
            "patient_id": pid,
            "patient_name": pname,
            "patient_code": pcode,
            "patient_id_code": pcode,
            "record_type": h_rec["record_type"],
            "title": h_rec["title"],
            "doctor_name": h_rec["doctor_name"],
            "hospital_name": h_rec["hospital_name"],
            "record_date": h_rec["record_date"],
            "diagnosis": h_rec["diagnosis"],
            "description": h_rec["description"],
            "medications": h_rec["medications"],
            "notes": h_rec.get("notes", ""),
            "attachments": [],
            "is_test": False,
            "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(1, 15)),
            "updated_at": datetime.now(timezone.utc)
        }
        db.health_records.insert_one(doc)

    print(f"Seeded {len(health_records_templates)} comprehensive medical health records.")

    # 5. Seed Vitals & Telemetry for active patients
    db.vital_signs.delete_many({"patient_id": {"$in": patient_oids}})
    db.health_alerts.delete_many({"patient_id": {"$in": patient_oids}})

    vitals_presets = [
        {"hr": 78, "sbp": 138, "dbp": 88, "spo2": 98, "temp": 98.4, "bs": 126, "alert": None},
        {"hr": 92, "sbp": 122, "dbp": 78, "spo2": 99, "temp": 98.6, "bs": 94, "alert": None},
        {"hr": 68, "sbp": 146, "dbp": 92, "spo2": 95, "temp": 98.2, "bs": 110, "alert": "Elevated Systolic BP (>140 mmHg) flagged on telemetry"},
        {"hr": 74, "sbp": 128, "dbp": 82, "spo2": 98, "temp": 98.6, "bs": 102, "alert": None},
        {"hr": 72, "sbp": 120, "dbp": 76, "spo2": 99, "temp": 98.4, "bs": 98, "alert": None},
        {"hr": 104, "sbp": 118, "dbp": 74, "spo2": 99, "temp": 99.1, "bs": 90, "alert": "Tachycardia alert: Resting Heart Rate > 100 BPM"},
        {"hr": 84, "sbp": 134, "dbp": 84, "spo2": 97, "temp": 98.5, "bs": 118, "alert": None},
        {"hr": 70, "sbp": 116, "dbp": 72, "spo2": 100, "temp": 98.4, "bs": 88, "alert": None}
    ]

    for idx, (pid, pname, pcode) in enumerate(seeded_patient_ids):
        preset = vitals_presets[idx % len(vitals_presets)]
        
        # Insert 3 historical vital recordings
        for offset_min in [120, 60, 0]:
            v_doc = {
                "patient_id": pid,
                "patient_code": pcode,
                "heart_rate": preset["hr"] + random.randint(-4, 4),
                "systolic_bp": preset["sbp"] + random.randint(-5, 5),
                "diastolic_bp": preset["dbp"] + random.randint(-3, 3),
                "spo2": preset["spo2"],
                "temperature": preset["temp"],
                "blood_sugar": preset["bs"],
                "recorded_at": datetime.now(timezone.utc) - timedelta(minutes=offset_min),
                "created_at": datetime.now(timezone.utc) - timedelta(minutes=offset_min)
            }
            db.vital_signs.insert_one(v_doc)
            
        # If alert preset, create health alert
        if preset["alert"]:
            db.health_alerts.insert_one({
                "patient_id": pid,
                "patient_code": pcode,
                "severity": "High",
                "alert_type": "VITALS_ANOMALY",
                "message": preset["alert"],
                "is_acknowledged": False,
                "created_at": datetime.now(timezone.utc) - timedelta(minutes=15)
            })

    print("Seeded vitals telemetry and health alerts successfully.")
    print("\n Clinical data seed complete! Real dataset is now active.")

if __name__ == "__main__":
    seed_clinical_data()
