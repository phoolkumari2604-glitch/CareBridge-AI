import os
import sys
from datetime import datetime, timezone
from bson import ObjectId

# Ensure backend root on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import get_database
from app.services.organ_service import compute_organ_status, get_patient_organ_dossier


def seed_internal_organs_data(db=None):
    if db is None:
        db = get_database()

    print("[Seed Phase 2] Locating demo patient 'Manjusha'...")
    patient = db.patients.find_one({"name": "Manjusha"})
    if not patient:
        print("[Seed Phase 2] Patient 'Manjusha' not found! Creating demo patient record...")
        user = db.users.find_one({"email": "phoolkumari2606@gmail.com"})
        user_id = str(user["_id"]) if user else str(ObjectId())
        res = db.patients.insert_one({
            "name": "Manjusha",
            "user_id": user_id,
            "email": "phoolkumari2606@gmail.com",
            "phone": "+91 7541871864",
            "age": 18,
            "gender": "Female",
            "blood_group": "AB-",
            "created_at": datetime.now(timezone.utc),
        })
        patient = db.patients.find_one({"_id": res.inserted_id})

    patient_id = str(patient["_id"])
    print(f"[Seed Phase 2] Found patient Manjusha with ID: {patient_id}")

    # Remove previous demo organ collections for Manjusha to ensure clean idempotency
    from app.services.organ_service import to_patient_id_filter
    pid_filter = to_patient_id_filter(patient_id)

    db.patient_findings.delete_many({"patientId": pid_filter})
    db.patient_telemetry.delete_many({"patientId": pid_filter})
    db.patient_clinical_state.delete_many({"patientId": pid_filter})
    db.patient_organ_reports.delete_many({"patientId": pid_filter})
    db.patient_organs.delete_many({"patientId": pid_filter})

    now = datetime.now(timezone.utc)

    # ============================================================
    # 1. KIDNEYS (Telemetry: None, Findings: 2 Watch -> Status: WATCH)
    # ============================================================
    db.patient_findings.insert_many([
        {
            "patientId": patient_id,
            "organId": "kidneys",
            "title": "Mild Cortical Thinning",
            "label": "Mild Cortical Thinning",
            "description": "Early bilateral cortical echogenicity and cortical thickness narrowing on renal ultrasound.",
            "note": "Early bilateral cortical echogenicity and cortical thickness narrowing on renal ultrasound.",
            "severity": "watch",
            "x": 36.0,
            "y": 52.0,
            "recordedBy": "Dr. Rajesh Sharma (Nephrology)",
            "recordedAt": now,
            "resolvedAt": None,
        },
        {
            "patientId": patient_id,
            "organId": "kidneys",
            "title": "Elevated Resistance Index",
            "label": "Elevated Resistance Index",
            "description": "Renal interlobar arterial Doppler resistance index is 0.72, signaling vascular stiffness.",
            "note": "Renal interlobar arterial Doppler resistance index is 0.72, signaling vascular stiffness.",
            "severity": "watch",
            "x": 62.0,
            "y": 40.0,
            "recordedBy": "Dr. Rajesh Sharma (Nephrology)",
            "recordedAt": now,
            "resolvedAt": None,
        }
    ])
    db.patient_clinical_state.insert_one({
        "patientId": patient_id,
        "organId": "kidneys",
        "text": "Renal clearance fluctuation detected in active clinical alerts.",
        "updatedAt": now,
    })
    db.patient_organ_reports.insert_one({
        "patientId": patient_id,
        "organId": "kidneys",
        "title": "Renal Duplex Doppler & Cortical Evaluation",
        "fileUrl": "/reports/renal-ultrasound-2026.pdf",
        "uploadedAt": now,
    })

    # ============================================================
    # 2. BRAIN (Findings: 1 Critical, 3 Watch -> Status: CRITICAL)
    # ============================================================
    db.patient_findings.insert_many([
        {
            "patientId": patient_id,
            "organId": "brain",
            "title": "Frontal Lobe Finding",
            "label": "Frontal Lobe Finding",
            "description": "Transient frontal perfusion compromise with focal microvascular flow variance.",
            "note": "Transient frontal perfusion compromise with focal microvascular flow variance.",
            "severity": "critical",
            "x": 22.0,
            "y": 42.0,
            "recordedBy": "Dr. Ananya Sen (Neurology)",
            "recordedAt": now,
            "resolvedAt": None,
        },
        {
            "patientId": patient_id,
            "organId": "brain",
            "title": "Parietal Lobe (Top) Finding",
            "label": "Parietal Lobe (Top) Finding",
            "description": "Mild parietal somatosensory cortical asymmetry on transcranial Doppler.",
            "note": "Mild parietal somatosensory cortical asymmetry on transcranial Doppler.",
            "severity": "watch",
            "x": 60.0,
            "y": 22.0,
            "recordedBy": "Dr. Ananya Sen (Neurology)",
            "recordedAt": now,
            "resolvedAt": None,
        },
        {
            "patientId": patient_id,
            "organId": "brain",
            "title": "Temporal Lobe Finding",
            "label": "Temporal Lobe Finding",
            "description": "Temporal lobe autoregulation fluctuation during orthostatic posture change.",
            "note": "Temporal lobe autoregulation fluctuation during orthostatic posture change.",
            "severity": "watch",
            "x": 34.0,
            "y": 63.0,
            "recordedBy": "Dr. Ananya Sen (Neurology)",
            "recordedAt": now,
            "resolvedAt": None,
        },
        {
            "patientId": patient_id,
            "organId": "brain",
            "title": "Cerebellum Finding",
            "label": "Cerebellum Finding",
            "description": "Posterior fossa cerebellar coordination signaling within stable reserve boundaries.",
            "note": "Posterior fossa cerebellar coordination signaling within stable reserve boundaries.",
            "severity": "watch",
            "x": 72.0,
            "y": 68.0,
            "recordedBy": "Dr. Ananya Sen (Neurology)",
            "recordedAt": now,
            "resolvedAt": None,
        }
    ])
    db.patient_clinical_state.insert_one({
        "patientId": patient_id,
        "organId": "brain",
        "text": "Neuro-vascular stress and autonomic tension patterns observed.",
        "updatedAt": now,
    })
    db.patient_organ_reports.insert_one({
        "patientId": patient_id,
        "organId": "brain",
        "title": "Transcranial Doppler Cerebrovascular Flow Report",
        "fileUrl": "/reports/tcd-brain-perfusion.pdf",
        "uploadedAt": now,
    })

    # ============================================================
    # 3. STOMACH (No Data -> Status: NO_DATA)
    # ============================================================
    # Deliberately no telemetry, no findings, no reports for Stomach
    # Shows exact "No data yet" and "0 on file"

    # ============================================================
    # 4. PANCREAS (Findings: 1 Critical, 2 Watch; Glucose 310 -> Status: CRITICAL)
    # ============================================================
    db.patient_findings.insert_many([
        {
            "patientId": patient_id,
            "organId": "pancreas",
            "title": "Pancreatic Body Finding",
            "label": "Pancreatic Body Finding",
            "description": "Endocrine islet cell stress pattern secondary to persistent glycemic variability.",
            "note": "Endocrine islet cell stress pattern secondary to persistent glycemic variability.",
            "severity": "critical",
            "x": 50.0,
            "y": 40.0,
            "recordedBy": "Dr. Vikram Malhotra (Endocrinology)",
            "recordedAt": now,
            "resolvedAt": None,
        },
        {
            "patientId": patient_id,
            "organId": "pancreas",
            "title": "Pancreatic Head Finding",
            "label": "Pancreatic Head Finding",
            "description": "Exocrine ductal parenchymal echotexture within borderline postprandial limits.",
            "note": "Exocrine ductal parenchymal echotexture within borderline postprandial limits.",
            "severity": "watch",
            "x": 30.0,
            "y": 52.0,
            "recordedBy": "Dr. Vikram Malhotra (Endocrinology)",
            "recordedAt": now,
            "resolvedAt": None,
        },
        {
            "patientId": patient_id,
            "organId": "pancreas",
            "title": "Pancreatic Tail Finding",
            "label": "Pancreatic Tail Finding",
            "description": "Distal pancreatic tail microperfusion impedance on Doppler sonography.",
            "note": "Distal pancreatic tail microperfusion impedance on Doppler sonography.",
            "severity": "watch",
            "x": 84.0,
            "y": 38.0,
            "recordedBy": "Dr. Vikram Malhotra (Endocrinology)",
            "recordedAt": now,
            "resolvedAt": None,
        }
    ])
    db.patient_telemetry.insert_one({
        "patientId": patient_id,
        "organId": "pancreas",
        "indicatorKey": "blood_glucose",
        "label": "Blood Glucose",
        "value": 310,
        "unit": "mg/dL",
        "safeMin": 70,
        "safeMax": 140,
        "note": "Continuous CGM interstitial telemetry spike",
        "source": "Continuous Glucose Monitor (CGM)",
        "recordedAt": now,
    })
    db.patient_clinical_state.insert_one({
        "patientId": patient_id,
        "organId": "pancreas",
        "text": "Endocrine glucose-insulin regulatory patterns under metabolic observation.",
        "updatedAt": now,
    })
    db.patient_organ_reports.insert_one({
        "patientId": patient_id,
        "organId": "pancreas",
        "title": "Comprehensive Glycemic & HbA1c Pathology Report",
        "fileUrl": "/reports/pancreas-cgm-dossier.pdf",
        "uploadedAt": now,
    })

    # ============================================================
    # 5. THYROID (Findings: 3 Watch; TSH 4.8 mIU/L -> Status: WATCH)
    # ============================================================
    db.patient_findings.insert_many([
        {
            "patientId": patient_id,
            "organId": "thyroid",
            "title": "Left Lobe Hypoechoic Nodule",
            "label": "Left Lobe Hypoechoic Nodule",
            "description": "Solitary well-circumscribed 8mm hypoechoic nodule in left thyroid lobe, EU-TIRADS 3.",
            "note": "Solitary well-circumscribed 8mm hypoechoic nodule in left thyroid lobe, EU-TIRADS 3.",
            "severity": "watch",
            "x": 32.0,
            "y": 45.0,
            "recordedBy": "Dr. Priya Sharma (Endocrinology)",
            "recordedAt": now,
            "resolvedAt": None,
        },
        {
            "patientId": patient_id,
            "organId": "thyroid",
            "title": "Right Lobe Colloid Nodule",
            "label": "Right Lobe Colloid Nodule",
            "description": "Benign colloid-filled cyst in right thyroid lobe without microcalcifications.",
            "note": "Benign colloid-filled cyst in right thyroid lobe without microcalcifications.",
            "severity": "watch",
            "x": 68.0,
            "y": 42.0,
            "recordedBy": "Dr. Priya Sharma (Endocrinology)",
            "recordedAt": now,
            "resolvedAt": None,
        },
        {
            "patientId": patient_id,
            "organId": "thyroid",
            "title": "Isthmus Parenchymal Heterogeneity",
            "label": "Isthmus Parenchymal Heterogeneity",
            "description": "Diffuse mild heterogeneity across the thyroid isthmus consistent with autoimmune thyroiditis reserve.",
            "note": "Diffuse mild heterogeneity across the thyroid isthmus consistent with autoimmune thyroiditis reserve.",
            "severity": "watch",
            "x": 50.0,
            "y": 60.0,
            "recordedBy": "Dr. Priya Sharma (Endocrinology)",
            "recordedAt": now,
            "resolvedAt": None,
        }
    ])
    db.patient_telemetry.insert_one({
        "patientId": patient_id,
        "organId": "thyroid",
        "indicatorKey": "tsh",
        "label": "Thyroid Stimulating Hormone (TSH)",
        "value": 4.8,
        "unit": "mIU/L",
        "safeMin": 0.4,
        "safeMax": 4.0,
        "note": "Subclinical thyroid axis elevation on morning fasting panel",
        "source": "Clinical Lab Panel (Abbott Architect)",
        "recordedAt": now,
    })
    db.patient_clinical_state.insert_one({
        "patientId": patient_id,
        "organId": "thyroid",
        "text": "Metabolic rate, thyroid stimulating hormone, and heart rate within clinical bounds.",
        "updatedAt": now,
    })
    db.patient_organ_reports.insert_one({
        "patientId": patient_id,
        "organId": "thyroid",
        "title": "Thyroid Ultrasound & TIRADS Stratification",
        "fileUrl": "/reports/thyroid-ultrasound-tirads.pdf",
        "uploadedAt": now,
    })

    # ============================================================
    # 6. INTESTINES (Findings: 3 Watch; BP 185/115 -> Status: WATCH)
    # ============================================================
    db.patient_findings.insert_many([
        {
            "patientId": patient_id,
            "organId": "intestines",
            "title": "Upper Small Intestine Finding",
            "label": "Upper Small Intestine Finding",
            "description": "Duodenal mucosal transit hypermotility under autonomic stimulation.",
            "note": "Duodenal mucosal transit hypermotility under autonomic stimulation.",
            "severity": "watch",
            "x": 35.0,
            "y": 38.0,
            "recordedBy": "Dr. Sarah Jenkins (Gastroenterology)",
            "recordedAt": now,
            "resolvedAt": None,
        },
        {
            "patientId": patient_id,
            "organId": "intestines",
            "title": "Middle Small Intestine Finding",
            "label": "Middle Small Intestine Finding",
            "description": "Jejunal loop peristaltic irregularity following dietary trigger exposure.",
            "note": "Jejunal loop peristaltic irregularity following dietary trigger exposure.",
            "severity": "watch",
            "x": 50.0,
            "y": 55.0,
            "recordedBy": "Dr. Sarah Jenkins (Gastroenterology)",
            "recordedAt": now,
            "resolvedAt": None,
        },
        {
            "patientId": patient_id,
            "organId": "intestines",
            "title": "Lower Small Intestine Finding",
            "label": "Lower Small Intestine Finding",
            "description": "Terminal ileum lymphoid tissue prominence without stricture or wall thickening.",
            "note": "Terminal ileum lymphoid tissue prominence without stricture or wall thickening.",
            "severity": "watch",
            "x": 65.0,
            "y": 72.0,
            "recordedBy": "Dr. Sarah Jenkins (Gastroenterology)",
            "recordedAt": now,
            "resolvedAt": None,
        }
    ])
    db.patient_telemetry.insert_one({
        "patientId": patient_id,
        "organId": "intestines",
        "indicatorKey": "blood_pressure",
        "label": "Arterial Perfusion (BP)",
        "value": "185/115",
        "unit": "mmHg",
        "safeMin": 90,
        "safeMax": 120,
        "note": "Mesenteric vascular resistance correlation",
        "source": "Omron Arterial Telemetry Cuff",
        "recordedAt": now,
    })
    db.patient_clinical_state.insert_one({
        "patientId": patient_id,
        "organId": "intestines",
        "text": "Gastrointestinal transit, motility, and enteric vascular perfusion patterns.",
        "updatedAt": now,
    })
    # Set doctor statusOverride to 'watch' as per spec
    db.patient_organs.update_one(
        {"patientId": patient_id, "organId": "intestines"},
        {"$set": {"statusOverride": "watch", "status": "watch", "updatedAt": now}},
        upsert=True,
    )
    db.patient_organ_reports.insert_one({
        "patientId": patient_id,
        "organId": "intestines",
        "title": "Enteric Motility & Mesenteric Perfusion Doppler",
        "fileUrl": "/reports/enteric-doppler.pdf",
        "uploadedAt": now,
    })

    # ============================================================
    # VERIFY AND SYNC STATUSES
    # ============================================================
    for org in ["kidneys", "brain", "stomach", "pancreas", "thyroid", "intestines", "lungs"]:
        status, override = compute_organ_status(patient_id, org, db)
        db.patient_organs.update_one(
            {"patientId": patient_id, "organId": org},
            {"$set": {"status": status, "statusOverride": override, "updatedAt": now}},
            upsert=True,
        )

    # Validate resulting dossier
    dossier = get_patient_organ_dossier(patient_id, db)
    print("==================================================")
    print(f"PHASE 2 INTERNAL ORGANS SEED FOR {patient['name']} ({patient_id}):")
    for org, data in dossier.items():
        if org in ["kidneys", "brain", "stomach", "pancreas", "thyroid", "intestines"]:
            print(f"  {org.capitalize():12} -> Status: {data['status'].upper():10} | Findings: {len(data['findings'])} | Telemetry: {len(data['telemetry'])} | Reports: {data['reportsCount']}")
    print("==================================================")

    # Assert exact statuses required by user specification:
    assert dossier["kidneys"]["status"] == "watch", f"Kidneys status expected 'watch', got {dossier['kidneys']['status']}"
    assert dossier["brain"]["status"] == "critical", f"Brain status expected 'critical', got {dossier['brain']['status']}"
    assert dossier["stomach"]["status"] == "no_data", f"Stomach status expected 'no_data', got {dossier['stomach']['status']}"
    assert dossier["pancreas"]["status"] == "critical", f"Pancreas status expected 'critical', got {dossier['pancreas']['status']}"
    assert dossier["thyroid"]["status"] == "watch", f"Thyroid status expected 'watch', got {dossier['thyroid']['status']}"
    assert dossier["intestines"]["status"] == "watch", f"Intestines status expected 'watch', got {dossier['intestines']['status']}"
    print("[Seed Phase 2] ALL CLINICAL SPECIFICATIONS STRICTLY VALIDATED!")
    return patient_id


if __name__ == "__main__":
    seed_internal_organs_data()
