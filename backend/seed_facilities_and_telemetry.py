import os
import random
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DATABASE_NAME", "carebridge_ai")

FACILITIES_SEED = [
    # --- INDIA ---
    {
        "name": "AIIMS — All India Institute of Medical Sciences",
        "facility_type": "Public",
        "ownership": "Autonomous Govt. Institute",
        "specialties": ["Cardiology", "Neurology", "Trauma & Emergency", "Oncology", "Pediatrics", "Organ Transplant"],
        "services": ["24/7 Level 1 Trauma", "Critical Care ICU", "Cardiac Cath Lab", "Emergency Telemetry"],
        "address": "Sri Aurobindo Marg, Ansari Nagar",
        "city": "New Delhi",
        "state": "Delhi",
        "country": "India",
        "phone": "+91 11 2658 8500",
        "website": "https://www.aiims.edu",
        "rating": 4.9,
        "emergency": True,
        "lat": 28.5672,
        "lng": 77.2100,
        "total_beds": 2478,
        "available_beds": 420,
        "occupied_beds": 2058,
        "icu_beds_total": 180,
        "icu_beds_available": 32,
        "ventilators_total": 95,
        "ventilators_available": 18,
    },
    {
        "name": "Apollo Hospitals Indraprastha",
        "facility_type": "Private",
        "ownership": "Apollo Hospitals Enterprise Ltd.",
        "specialties": ["Cardiology", "Robotic Surgery", "Orthopedics", "Nephrology", "Neurology"],
        "services": ["24/7 Emergency Care", "Critical Care", "Ambulance Radar", "Smart ICU"],
        "address": "Sarita Vihar, Delhi Mathura Road",
        "city": "New Delhi",
        "state": "Delhi",
        "country": "India",
        "phone": "+91 11 2692 5858",
        "website": "https://delhi.apollohospitals.com",
        "rating": 4.8,
        "emergency": True,
        "lat": 28.5355,
        "lng": 77.2874,
        "total_beds": 710,
        "available_beds": 142,
        "occupied_beds": 568,
        "icu_beds_total": 120,
        "icu_beds_available": 24,
        "ventilators_total": 45,
        "ventilators_available": 12,
    },
    {
        "name": "Tata Memorial Hospital & Cancer Center",
        "facility_type": "Trust",
        "ownership": "Tata Memorial Centre / Dept. of Atomic Energy",
        "specialties": ["Oncology", "Surgical Oncology", "Radiation Therapy", "Palliative Care", "Hematology"],
        "services": ["Comprehensive Cancer Care", "Emergency Oncology", "Bone Marrow Transplant"],
        "address": "Dr. E Borges Road, Parel",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "phone": "+91 22 2417 7000",
        "website": "https://tmc.gov.in",
        "rating": 4.9,
        "emergency": True,
        "lat": 19.0048,
        "lng": 72.8427,
        "total_beds": 629,
        "available_beds": 88,
        "occupied_beds": 541,
        "icu_beds_total": 80,
        "icu_beds_available": 14,
        "ventilators_total": 35,
        "ventilators_available": 7,
    },
    {
        "name": "Fortis Hospital Bannerghatta Road",
        "facility_type": "Private",
        "ownership": "Fortis Healthcare Ltd.",
        "specialties": ["Interventional Cardiology", "Neurology", "Orthopedics", "Emergency Medicine"],
        "services": ["24/7 Cardiac ER", "ICU Telemetry", "Organ Transplant Unit"],
        "address": "154/9 Bannerghatta Main Rd, Opp IIMB",
        "city": "Bengaluru",
        "state": "Karnataka",
        "country": "India",
        "phone": "+91 80 6621 4444",
        "website": "https://www.fortishealthcare.com",
        "rating": 4.7,
        "emergency": True,
        "lat": 12.8953,
        "lng": 77.5985,
        "total_beds": 400,
        "available_beds": 96,
        "occupied_beds": 304,
        "icu_beds_total": 60,
        "icu_beds_available": 16,
        "ventilators_total": 28,
        "ventilators_available": 8,
    },
    {
        "name": "Sir Ganga Ram Hospital",
        "facility_type": "Trust",
        "ownership": "Sir Ganga Ram Trust Society",
        "specialties": ["Gastroenterology", "Cardiology", "Nephrology", "General Surgery", "Pediatrics"],
        "services": ["24/7 Trauma Emergency", "Kidney Transplant", "Advanced Dialysis"],
        "address": "Rajinder Nagar",
        "city": "New Delhi",
        "state": "Delhi",
        "country": "India",
        "phone": "+91 11 2575 0000",
        "website": "https://sgrh.com",
        "rating": 4.8,
        "emergency": True,
        "lat": 28.6385,
        "lng": 77.1895,
        "total_beds": 675,
        "available_beds": 130,
        "occupied_beds": 545,
        "icu_beds_total": 95,
        "icu_beds_available": 22,
        "ventilators_total": 40,
        "ventilators_available": 10,
    },
    
    # --- UNITED STATES ---
    {
        "name": "Johns Hopkins Hospital",
        "facility_type": "Academic Medical Center",
        "ownership": "Johns Hopkins Medicine",
        "specialties": ["Neurosurgery", "Cardiology", "Oncology", "Pediatrics", "Trauma & Emergency"],
        "services": ["24/7 Level 1 Trauma Center", "Comprehensive Stroke Center", "Pediatric ICU"],
        "address": "1800 Orleans St",
        "city": "Baltimore",
        "state": "Maryland",
        "country": "United States",
        "phone": "+1 410 955 5000",
        "website": "https://www.hopkinsmedicine.org",
        "rating": 4.9,
        "emergency": True,
        "lat": 39.2965,
        "lng": -76.5928,
        "total_beds": 1162,
        "available_beds": 240,
        "occupied_beds": 922,
        "icu_beds_total": 150,
        "icu_beds_available": 28,
        "ventilators_total": 80,
        "ventilators_available": 19,
    },
    {
        "name": "Mayo Clinic Hospital — Saint Marys Campus",
        "facility_type": "Private",
        "ownership": "Mayo Clinic Non-Profit Healthcare",
        "specialties": ["Cardiovascular Surgery", "Oncology", "Neurology", "Orthopedics", "Gastroenterology"],
        "services": ["Level 1 Trauma & Emergency", "Digital ICU Telemetry", "Advanced Surgical Suites"],
        "address": "1216 2nd St SW",
        "city": "Rochester",
        "state": "Minnesota",
        "country": "United States",
        "phone": "+1 507 284 2511",
        "website": "https://www.mayoclinic.org",
        "rating": 5.0,
        "emergency": True,
        "lat": 44.0202,
        "lng": -92.4839,
        "total_beds": 1265,
        "available_beds": 290,
        "occupied_beds": 975,
        "icu_beds_total": 170,
        "icu_beds_available": 35,
        "ventilators_total": 90,
        "ventilators_available": 22,
    },

    # --- UNITED KINGDOM ---
    {
        "name": "St Thomas' Hospital (Guy's and St Thomas' NHS)",
        "facility_type": "Public",
        "ownership": "NHS Foundation Trust",
        "specialties": ["Cardiology", "Critical Care", "Pediatrics", "Emergency Medicine", "Renal Services"],
        "services": ["24/7 Major Trauma Centre", "Evelina Children's Hospital", "ICU Telemetry"],
        "address": "Westminster Bridge Rd",
        "city": "London",
        "state": "Greater London",
        "country": "United Kingdom",
        "phone": "+44 20 7188 7188",
        "website": "https://www.guysandstthomas.nhs.uk",
        "rating": 4.8,
        "emergency": True,
        "lat": 51.4988,
        "lng": -0.1189,
        "total_beds": 920,
        "available_beds": 165,
        "occupied_beds": 755,
        "icu_beds_total": 110,
        "icu_beds_available": 19,
        "ventilators_total": 55,
        "ventilators_available": 14,
    },

    # --- SINGAPORE ---
    {
        "name": "Singapore General Hospital (SGH)",
        "facility_type": "Public",
        "ownership": "SingHealth Public Healthcare",
        "specialties": ["Cardiology", "Hematology", "Plastic Surgery", "Trauma & Emergency", "Oncology"],
        "services": ["24/7 Emergency & Acute Care", "Hyperbaric Medicine", "Specialist Heart Centre"],
        "address": "Outram Rd",
        "city": "Singapore",
        "state": "Central Region",
        "country": "Singapore",
        "phone": "+65 6222 3322",
        "website": "https://www.sgh.com.sg",
        "rating": 4.9,
        "emergency": True,
        "lat": 1.2792,
        "lng": 103.8344,
        "total_beds": 1785,
        "available_beds": 310,
        "occupied_beds": 1475,
        "icu_beds_total": 140,
        "icu_beds_available": 26,
        "ventilators_total": 70,
        "ventilators_available": 16,
    },

    # --- UNITED ARAB EMIRATES ---
    {
        "name": "Cleveland Clinic Abu Dhabi",
        "facility_type": "Private",
        "ownership": "M42 Healthcare / Cleveland Clinic",
        "specialties": ["Heart & Vascular", "Neurological Institute", "Digestive Disease", "Emergency Medicine"],
        "services": ["24/7 Multi-Specialty Emergency", "Hybrid Operating Rooms", "Robotic Surgery"],
        "address": "Al Maryah Island",
        "city": "Abu Dhabi",
        "state": "Abu Dhabi Emirate",
        "country": "United Arab Emirates",
        "phone": "+971 800 82223",
        "website": "https://www.clevelandclinicabudhabi.ae",
        "rating": 4.9,
        "emergency": True,
        "lat": 24.5028,
        "lng": 54.3908,
        "total_beds": 364,
        "available_beds": 82,
        "occupied_beds": 282,
        "icu_beds_total": 72,
        "icu_beds_available": 18,
        "ventilators_total": 36,
        "ventilators_available": 11,
    }
]

def seed_facilities():
    print(f"Connecting to MongoDB at {MONGO_URI}...")
    try:
        if "mongodb+srv://" in MONGO_URI:
            client = MongoClient(MONGO_URI, tlsAllowInvalidCertificates=True, serverSelectionTimeoutMS=5000)
        else:
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client[DB_NAME]
        db.command("ping")
    except Exception as e:
        print(f"Failed to connect with primary URI ({e}), attempting localhost...")
        client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=3000)
        db = client[DB_NAME]

    print(f"\n[1/3] Seeding {len(FACILITIES_SEED)} global facilities...")
    inserted_facilities = []
    
    for fac in FACILITIES_SEED:
        now_time = datetime.now(timezone.utc)
        fac["created_at"] = now_time
        fac["updated_at"] = now_time
        fac["telemetry_status"] = "live"
        fac["telemetry_source"] = "CareBridge IoT Gateway v2.4"
        fac["last_telemetry_ping"] = now_time.isoformat()
        fac["location"] = {"type": "Point", "coordinates": [fac["lng"], fac["lat"]]}

        # Upsert by name
        res = db.hospitals.find_one_and_update(
            {"name": fac["name"]},
            {"$set": fac},
            upsert=True,
            return_document=True
        )
        f_id = str(res["_id"])
        inserted_facilities.append((f_id, fac["name"]))
        print(f"  -> Synced: {fac['name']} (ID: {f_id}) [{fac['country']} - {fac['city']}]")

    print("\n[2/3] Generating real-time bed telemetry units for all facilities...")
    total_beds_created = 0
    
    for f_id, f_name in inserted_facilities:
        db.beds.delete_many({"facility_id": f_id})
        
        wards = [
            {"ward": "Intensive Care Unit (ICU-A)", "type": "ICU", "count": 12, "oxygen": True},
            {"ward": "Cardiac Care Unit (CCU)", "type": "ICU", "count": 8, "oxygen": True},
            {"ward": "Emergency Trauma Resuscitation", "type": "Emergency", "count": 10, "oxygen": True},
            {"ward": "High Dependency Stepdown (HDU)", "type": "HDU", "count": 8, "oxygen": True},
            {"ward": "Ventilator Suite (Critical Care)", "type": "Ventilator", "count": 6, "oxygen": True},
            {"ward": "Inpatient Medical Ward 3B", "type": "General", "count": 20, "oxygen": False},
        ]
        
        statuses = ["Available", "Occupied", "Occupied", "Available", "Occupied", "Reserved", "Available", "Maintenance", "Occupied", "Available"]
        bed_docs = []
        status_idx = 0
        
        for w in wards:
            for i in range(1, w["count"] + 1):
                b_code = f"{w['type'][:3].upper()}-{w['ward'][:3].upper()}-{i:02d}"
                st = statuses[status_idx % len(statuses)]
                status_idx += 1
                
                bed_docs.append({
                    "bed_id": b_code,
                    "facility_id": f_id,
                    "facility_name": f_name,
                    "ward": w["ward"],
                    "bed_type": w["type"],
                    "status": st,
                    "oxygen_connected": w["oxygen"],
                    "telemetry_monitored": True,
                    "last_updated": datetime.now(timezone.utc)
                })
                
        db.beds.insert_many(bed_docs)
        total_beds_created += len(bed_docs)

    print(f"  -> Generated {total_beds_created} active bed telemetry units.")

    print("\n[3/3] Creating geospatial & telemetry indexes...")
    try:
        db.hospitals.create_index([("location", "2dsphere")])
        db.hospitals.create_index([("country", 1), ("state", 1), ("city", 1)])
        db.hospitals.create_index([("facility_type", 1)])
        db.hospitals.create_index([("emergency", 1)])
        db.beds.create_index([("facility_id", 1), ("bed_id", 1)], unique=True)
        db.beds.create_index([("facility_id", 1), ("status", 1)])
        db.beds.create_index([("facility_id", 1), ("bed_type", 1)])
        print("  -> Indexes successfully created.")
    except Exception as e:
        print(f"  -> Note on indexes: {e}")

    print("\n================ SEED SUMMARY ================")
    print(f"  Facilities in DB: {db.hospitals.count_documents({})}")
    print(f"  Total Bed Units:  {db.beds.count_documents({})}")
    print("==============================================\n")

if __name__ == "__main__":
    seed_facilities()
