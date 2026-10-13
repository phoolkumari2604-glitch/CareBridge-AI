import os
import random
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from app.core.database import connect_to_mongodb

def run_migration():
    db = connect_to_mongodb()
    print("[1] Connected to MongoDB Atlas: carebridge_ai")

    # 1. Flag known test records and patients
    test_substrings = [
        "test registration patient",
        "live test patient",
        "demo patient",
        "fnmngn",
        "smartflow test patient",
        "health test patient",
        "conversation test patient",
        "ai assistant patient",
        "ownership test patient",
        "test patient"
    ]

    all_patients = list(db.patients.find())
    print(f"Total patients in collection: {len(all_patients)}")

    # Ensure 6-digit numeric codes and mark test records
    used_codes = set()
    for p in all_patients:
        code = str(p.get("patient_code") or "")
        if code.isdigit() and len(code) == 6:
            used_codes.add(code)

    def generate_unique_code():
        while True:
            c = str(random.randint(100000, 999999))
            if c not in used_codes:
                used_codes.add(c)
                return c

    flagged_test_count = 0
    updated_code_count = 0

    for p in all_patients:
        name_lower = str(p.get("name") or "").strip().lower()
        email_lower = str(p.get("email") or "").strip().lower()
        
        is_test = False
        for sub in test_substrings:
            if sub in name_lower or sub in email_lower:
                is_test = True
                break
        if "test" in email_lower and not ("carebridge.org" in email_lower or "carebridge.health" in email_lower):
            is_test = True

        code = str(p.get("patient_code") or "")
        needs_code_fix = not (code.isdigit() and len(code) == 6)
        new_code = generate_unique_code() if needs_code_fix else code

        update_fields = {}
        if is_test != p.get("is_test"):
            update_fields["is_test"] = is_test
            flagged_test_count += 1
        if needs_code_fix:
            update_fields["patient_code"] = new_code
            update_fields["patient_id_code"] = new_code
            updated_code_count += 1

        if update_fields:
            db.patients.update_one({"_id": p["_id"]}, {"$set": update_fields})

    print(f"Flagged/updated test flags: {flagged_test_count}, Fixed 6-digit codes: {updated_code_count}")

    # 2. Get Real Patients
    real_patients = list(db.patients.find({"is_test": {"$ne": True}}))
    print(f"[2] Identified {len(real_patients)} clean, real clinical patients:")
    for p in real_patients:
        print(f" - {p.get('name')} (Code: {p.get('patient_code')})")

    # 3. Find Doctor Dr. Ananya Sharma (Primary Doctor user)
    doc_user = db.users.find_one({"email": "doctor@carebridge.ai"})
    doc = db.doctors.find_one({"email": "doctor@carebridge.ai"})
    
    if not doc and doc_user:
        doc_id = db.doctors.insert_one({
            "name": doc_user.get("name", "Dr. Ananya Sharma"),
            "email": "doctor@carebridge.ai",
            "user_id": str(doc_user["_id"]),
            "specialization": "Cardiology & Critical Care",
            "department": "Cardiology",
            "hospital": "CareBridge Medical Center",
            "hospital_name": "CareBridge Medical Center",
            "phone": doc_user.get("phone", "+91 9876543211"),
            "created_at": datetime.now(timezone.utc)
        }).inserted_id
        doc = db.doctors.find_one({"_id": doc_id})
    elif not doc:
        doc = db.doctors.find_one()
        
    doctor_id = doc["_id"] if doc else ObjectId()
    doctor_user_id = str(doc_user["_id"]) if doc_user else (str(doc.get("user_id")) if doc and doc.get("user_id") else str(doctor_id))
    doctor_name = doc.get("name", "Dr. Ananya Sharma") if doc else "Dr. Ananya Sharma"
    hospital_name = "CareBridge Medical Center"
    print(f"[3] Using Doctor: {doctor_name} (Doctor ID: {doctor_id}, User ID: {doctor_user_id})")

    # Ensure sample clinical report file exists on disk in uploads directory
    uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    sample_pdf_path = os.path.join(uploads_dir, "sample_clinical_report.pdf")
    if not os.path.exists(sample_pdf_path) or os.path.getsize(sample_pdf_path) < 100:
        minimal_pdf = (
            b"%PDF-1.4\n"
            b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
            b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n"
            b"4 0 obj<</Length 95>>stream\n"
            b"BT\n/F1 18 Tf\n72 720 Td\n(CareBridge AI - Clinical Health Record & Laboratory Summary) Tj\nET\n"
            b"endstream\nendobj\n"
            b"xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\n0000000212 00000 n\n"
            b"trailer<</Size 5/Root 1 0 R>>\nstartxref\n356\n%%EOF\n"
        )
        with open(sample_pdf_path, "wb") as f:
            f.write(minimal_pdf)
        print(f"Created authentic sample report PDF at: {sample_pdf_path}")

    # Ensure approvals exist for Dr. Ananya Sharma across all real patients
    now = datetime.now(timezone.utc)
    for p in real_patients:
        db.approvals.update_one(
            {"patient_id": p["_id"]},
            {"$set": {
                "patient_id": p["_id"],
                "doctor_id": doctor_id,
                "approved_by": doctor_user_id,
                "status": "APPROVED",
                "reason": "Direct clinical chart clearance",
                "updated_at": now
            }},
            upsert=True
        )

    # 4. Reset health records to guarantee clean, rich, structured clinical data
    db.health_records.delete_many({})
    print("[4] Purged outdated health records. Seeding clinical records for real patients...")

    # Realistic clinical seed templates
    clinical_scenarios = [
        {
            "record_type": "CONSULTATION",
            "title": "Comprehensive Cardiovascular & Metabolic Evaluation",
            "diagnosis": "Essential (primary) hypertension, Stage 2 with borderline dyslipidemia",
            "icd10_code": "I10",
            "medications": [
                {"name": "Telmisartan", "dose": "40 mg", "frequency": "Once daily (OD)", "duration": "30 days", "drug_class": "Antihypertensive (ARB)"},
                {"name": "Amlodipine Besylate", "dose": "5 mg", "frequency": "Once daily (OD) in morning", "duration": "30 days", "drug_class": "Calcium Channel Blocker"},
                {"name": "Atorvastatin", "dose": "10 mg", "frequency": "Once daily at bedtime (HS)", "duration": "30 days", "drug_class": "Statin (Lipid-lowering)"}
            ],
            "notes": "Patient presents with occipital headache and morning fatigue. Seated resting BP measured 152/94 mmHg. Recommended dietary sodium restriction (<2g/day) and DASH dietary protocol. Scheduled 4-week ambulatory BP review.",
            "status": "final",
            "is_abnormal": True,
            "days_ago": 3
        },
        {
            "record_type": "DIAGNOSIS",
            "title": "Endocrine & Glycemic Assessment",
            "diagnosis": "Type 2 diabetes mellitus without acute complications (HbA1c 7.8%)",
            "icd10_code": "E11.9",
            "medications": [
                {"name": "Metformin Hydrochloride", "dose": "500 mg", "frequency": "Twice daily with meals (BD)", "duration": "60 days", "drug_class": "Biguanide (Antidiabetic)"},
                {"name": "Empagliflozin", "dose": "10 mg", "frequency": "Once daily in morning", "duration": "30 days", "drug_class": "SGLT2 Inhibitor"}
            ],
            "notes": "Fasting blood glucose elevated at 148 mg/dL. Urine microalbumin negative. Counseled on home glucose monitoring (Fasting & Post-prandial thrice weekly) and diabetic foot care.",
            "status": "final",
            "is_abnormal": False,
            "days_ago": 7
        },
        {
            "record_type": "PRESCRIPTION",
            "title": "Respiratory Management & Maintenance Inhaler Regimen",
            "diagnosis": "Unspecified asthma, uncomplicated with nocturnal wheezing",
            "icd10_code": "J45.909",
            "medications": [
                {"name": "Budesonide / Formoterol Inhaler", "dose": "200/6 mcg", "frequency": "2 puffs twice daily (BD)", "duration": "30 days", "drug_class": "Corticosteroid / LABA"},
                {"name": "Levocetirizine", "dose": "5 mg", "frequency": "Once daily at night (HS)", "duration": "14 days", "drug_class": "Antihistamine"},
                {"name": "Montelukast", "dose": "10 mg", "frequency": "Once daily (OD)", "duration": "30 days", "drug_class": "Leukotriene Receptor Antagonist"}
            ],
            "notes": "Demonstrated correct metered-dose inhaler spacer technique. Advised avoidance of aerosol sprays and cold environments. Emergency peak flow action plan provided.",
            "status": "final",
            "is_abnormal": False,
            "days_ago": 12
        },
        {
            "record_type": "CHECKUP",
            "title": "Annual Executive Health Checkup & Renal Profile",
            "diagnosis": "Chronic kidney disease, stage 2 (mild) with preserved urine output",
            "icd10_code": "N18.2",
            "medications": [
                {"name": "Sodium Bicarbonate", "dose": "500 mg", "frequency": "Twice daily (BD)", "duration": "30 days", "drug_class": "Alkalinizing Agent"},
                {"name": "Torsemide", "dose": "10 mg", "frequency": "Once daily in morning", "duration": "30 days", "drug_class": "Loop Diuretic"}
            ],
            "notes": "eGFR 72 mL/min/1.73m2. Serum creatinine 1.3 mg/dL. Electrolytes within normal limits. Hydration maintained at 2.5L/day. Renoprotective measures reviewed.",
            "status": "final",
            "is_abnormal": True,
            "days_ago": 18
        },
        {
            "record_type": "CONSULTATION",
            "title": "Arrhythmia Follow-up & ECG Holter Correlation",
            "diagnosis": "Paroxysmal atrial fibrillation, rate-controlled",
            "icd10_code": "I48.0",
            "medications": [
                {"name": "Metoprolol Succinate ER", "dose": "25 mg", "frequency": "Once daily (OD)", "duration": "45 days", "drug_class": "Beta Blocker"},
                {"name": "Apixaban", "dose": "5 mg", "frequency": "Twice daily (BD)", "duration": "45 days", "drug_class": "Direct Oral Anticoagulant (DOAC)"}
            ],
            "notes": "24-hr Holter showed 2 brief paroxysmal AF runs (<45s each). Resting pulse 72 bpm. CHA2DS2-VASc score calculated at 2. Anticoagulation counseling completed.",
            "status": "final",
            "is_abnormal": True,
            "days_ago": 22
        },
        {
            "record_type": "CHECKUP",
            "title": "Post-Prandial Glycemic & Thyroid Follow-up",
            "diagnosis": "Hypothyroidism under thyroid hormone replacement",
            "icd10_code": "E03.9",
            "medications": [
                {"name": "Levothyroxine Sodium", "dose": "50 mcg", "frequency": "Once daily on empty stomach 30 mins before breakfast", "duration": "90 days", "drug_class": "Thyroid Hormone"}
            ],
            "notes": "Serum TSH 2.45 mIU/L (euthyroid target achieved). Patient reports resolution of lethargy and cold intolerance. Repeat TSH in 6 months.",
            "status": "final",
            "is_abnormal": False,
            "days_ago": 28
        },
        {
            "record_type": "PRESCRIPTION",
            "title": "Gastroenterology Consultation & GERD Regimen",
            "diagnosis": "Gastro-esophageal reflux disease without esophagitis",
            "icd10_code": "K21.9",
            "medications": [
                {"name": "Pantoprazole", "dose": "40 mg", "frequency": "Once daily before breakfast", "duration": "14 days", "drug_class": "Proton Pump Inhibitor (PPI)"},
                {"name": "Domperidone", "dose": "10 mg", "frequency": "Once daily before meals", "duration": "10 days", "drug_class": "Prokinetic"}
            ],
            "notes": "Patient reports retrosternal burning triggered by spicy meals. Advised meal timing adjustments and head-of-bed elevation.",
            "status": "draft",
            "is_abnormal": False,
            "days_ago": 2
        },
        {
            "record_type": "DIAGNOSIS",
            "title": "Post-Operative Orthopedic Clearance & Pain Protocol",
            "diagnosis": "Primary osteoarthritis of left knee, mild degenerative progression",
            "icd10_code": "M17.12",
            "medications": [
                {"name": "Paracetamol ER", "dose": "1000 mg", "frequency": "As needed (SOS) max thrice daily", "duration": "10 days", "drug_class": "Analgesic / Antipyretic"},
                {"name": "Glucosamine Sulfate", "dose": "1500 mg", "frequency": "Once daily with food", "duration": "60 days", "drug_class": "Nutraceutical"}
            ],
            "notes": "Joint crepitus noted on flexion. Quadriceps strengthening exercises demonstrated by physical therapy team. Low-impact swimming recommended.",
            "status": "amended",
            "is_abnormal": False,
            "days_ago": 14
        }
    ]

    total_inserted = 0
    for idx, p in enumerate(real_patients):
        # Pick 2-4 realistic clinical scenarios for each real patient
        num_scenarios = 3 if idx % 2 == 0 else 2
        selected = [clinical_scenarios[(idx + offset) % len(clinical_scenarios)] for offset in range(num_scenarios)]
        
        for sc in selected:
            rec_date = (now - timedelta(days=sc["days_ago"] + (idx % 5))).strftime("%Y-%m-%d")
            rec_dt = datetime.strptime(rec_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            
            record_doc = {
                "patient_id": p["_id"],
                "patient_code": str(p.get("patient_code")),
                "patient_name": p.get("name"),
                "patient_age": p.get("age"),
                "patient_gender": p.get("gender"),
                "doctor_id": doctor_id,
                "created_by_user_id": doctor_user_id,
                "doctor_name": doctor_name,
                "hospital_name": hospital_name,
                "record_type": sc["record_type"],
                "title": f"{sc['title']} - {p.get('name')}",
                "description": sc["notes"],
                "diagnosis": sc["diagnosis"],
                "icd10_code": sc["icd10_code"],
                "medications": sc["medications"],
                "notes": sc["notes"],
                "attachments": [
                    {
                        "file_name": f"Clinical_Report_{p.get('patient_code')}_{sc['record_type'].lower()}.pdf",
                        "file_url": f"/api/health-records/files/sample_clinical_report.pdf",
                        "size_bytes": 142850
                    }
                ],
                "file_url": f"/api/health-records/files/sample_clinical_report.pdf",
                "file_name": f"Clinical_Report_{p.get('patient_code')}_{sc['record_type'].lower()}.pdf",
                "status": sc["status"],
                "is_abnormal": sc["is_abnormal"],
                "record_date": rec_date,
                "recorded_at": rec_dt,
                "created_at": rec_dt,
                "updated_at": rec_dt,
                "deleted_at": None,
                "is_test": False
            }
            db.health_records.insert_one(record_doc)
            total_inserted += 1

    print(f"[5] Successfully inserted {total_inserted} clinical records across all {len(real_patients)} real patients.")

    # 5. Build optimal MongoDB indexes
    print("[6] Creating database indexes on health_records...")
    try:
        db.health_records.drop_indexes()
    except Exception as e:
        print(f"Index drop notice: {e}")

    db.health_records.create_index([("patient_id", 1), ("recorded_at", -1)], name="idx_patient_recorded_at")
    db.health_records.create_index([("patient_code", 1), ("recorded_at", -1)], name="idx_patient_code_recorded_at")
    db.health_records.create_index([("record_type", 1)], name="idx_record_type")
    db.health_records.create_index([("status", 1)], name="idx_status")
    db.health_records.create_index([("deleted_at", 1)], name="idx_deleted_at")
    db.health_records.create_index([("is_test", 1)], name="idx_is_test")
    
    # Text index for fast multi-field search
    db.health_records.create_index([
        ("title", "text"),
        ("diagnosis", "text"),
        ("notes", "text"),
        ("icd10_code", "text"),
        ("medications.name", "text")
    ], name="idx_fulltext_health_records")

    print("[Success] All indexes created successfully.")
    print("Migration and Seeding Complete!")

if __name__ == "__main__":
    run_migration()
