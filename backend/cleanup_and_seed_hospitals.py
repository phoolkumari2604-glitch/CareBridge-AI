"""
Cleanup and seed verified hospitals in MongoDB with 2dsphere geolocation index.
"""
from datetime import datetime, timezone
from app.core.database import connect_to_mongodb

def cleanup_and_seed():
    db = connect_to_mongodb()
    print("Connected to MongoDB.")

    # 1. Delete all test/seed hospitals with fake names or test numbers
    del_result = db.hospitals.delete_many({
        "$or": [
            {"name": {"$regex": r"^(Appointment|Approval|Doctor|Queue|SmartFlow|Test|CareBridge Test|OPD Test)", "$options": "i"}},
            {"phone": {"$in": ["9000000030", "9000000010", "9000000020", "9000000120", "9000000011"]}},
            {"name": {"$in": ["string", "None", "", None]}},
            {"city": "Guntur", "phone": {"$regex": r"^9000000"}}
        ]
    })
    print(f"Deleted {del_result.deleted_count} test/placeholder hospitals.")

    # 2. Curated real clinical hospitals across India and metro locations
    verified_hospitals = [
        {
            "name": "AIIMS (All India Institute of Medical Sciences)",
            "facility_type": "Government Apex Super Specialty",
            "type": "Super Specialty Hospital",
            "ownership": "Government of India",
            "city": "New Delhi",
            "state": "Delhi",
            "country": "India",
            "address": "Sri Aurobindo Marg, Ansari Nagar, New Delhi, Delhi 110029",
            "postal_code": "110029",
            "phone": "+91 11 2658 8500",
            "website": "https://www.aiims.edu",
            "lat": 28.5672,
            "lng": 77.2100,
            "location": {"type": "Point", "coordinates": [77.2100, 28.5672]},
            "rating": 4.9,
            "total_beds": 2478,
            "occupied_beds": 2210,
            "available_beds": 268,
            "icu_beds": 310,
            "emergency_beds": 120,
            "emergency": True,
            "specialties": ["Cardiology", "Neurology", "Oncology", "Trauma & Emergency", "Gastroenterology", "Nephrology", "Pediatrics"],
            "services": ["24/7 Emergency", "Air Ambulance", "Organ Transplant", "Advanced Imaging (3T MRI)", "Radiotherapy"],
            "data_source": "CareBridge Verified Registry",
            "status": "ACTIVE",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "name": "Medanta - The Medicity",
            "facility_type": "Multi-Super Specialty Hospital",
            "type": "Multi-Specialty Hospital",
            "ownership": "Private Healthcare",
            "city": "Gurugram",
            "state": "Haryana",
            "country": "India",
            "address": "CH Bakhtawar Singh Road, Sector 38, Gurugram, Haryana 122001",
            "postal_code": "122001",
            "phone": "+91 124 414 1414",
            "website": "https://www.medanta.org",
            "lat": 28.4390,
            "lng": 77.0429,
            "location": {"type": "Point", "coordinates": [77.0429, 28.4390]},
            "rating": 4.8,
            "total_beds": 1250,
            "occupied_beds": 1040,
            "available_beds": 210,
            "icu_beds": 280,
            "emergency_beds": 80,
            "emergency": True,
            "specialties": ["Cardiovascular Surgery", "Liver Transplant", "Neurosciences", "Robotic Surgery", "Orthopedics", "Oncology"],
            "services": ["24/7 Cardiac Emergency", "Robotic DaVinci Surgery", "CyberKnife", "Blood Bank", "Telemedicine"],
            "data_source": "CareBridge Verified Registry",
            "status": "ACTIVE",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "name": "Fortis Escorts Heart Institute",
            "facility_type": "Specialized Cardiac Institute",
            "type": "Cardiac Specialty Hospital",
            "ownership": "Private / Fortis Healthcare",
            "city": "New Delhi",
            "state": "Delhi",
            "country": "India",
            "address": "Okhla Road, Sukhdev Vihar Metro Station, New Delhi, Delhi 110025",
            "postal_code": "110025",
            "phone": "+91 11 4713 5000",
            "website": "https://www.fortishealthcare.com",
            "lat": 28.5608,
            "lng": 77.2798,
            "location": {"type": "Point", "coordinates": [77.2798, 28.5608]},
            "rating": 4.7,
            "total_beds": 310,
            "occupied_beds": 260,
            "available_beds": 50,
            "icu_beds": 95,
            "emergency_beds": 35,
            "emergency": True,
            "specialties": ["Interventional Cardiology", "Pediatric Cardiac Surgery", "Heart Transplant", "Electrophysiology"],
            "services": ["24/7 Heart Attack Center", "Cath Labs", "ECMO Support", "Cardiac Rehabilitation"],
            "data_source": "CareBridge Verified Registry",
            "status": "ACTIVE",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "name": "Max Super Speciality Hospital, Saket",
            "facility_type": "Super Specialty Medical Center",
            "type": "Multi-Specialty Hospital",
            "ownership": "Max Healthcare",
            "city": "New Delhi",
            "state": "Delhi",
            "country": "India",
            "address": "1, 2 Press Enclave Road, Saket, New Delhi, Delhi 110017",
            "postal_code": "11017",
            "phone": "+91 11 2651 5050",
            "website": "https://www.maxhealthcare.in",
            "lat": 28.5284,
            "lng": 77.2126,
            "location": {"type": "Point", "coordinates": [77.2126, 28.5284]},
            "rating": 4.8,
            "total_beds": 530,
            "occupied_beds": 450,
            "available_beds": 80,
            "icu_beds": 140,
            "emergency_beds": 50,
            "emergency": True,
            "specialties": ["Oncology (Max Cancer Center)", "Bone Marrow Transplant", "Neurology", "Urology", "Orthopedics"],
            "services": ["24/7 Trauma Emergency", "TrueBeam Linac", "Intraoperative MRI", "Comprehensive Cancer Care"],
            "data_source": "CareBridge Verified Registry",
            "status": "ACTIVE",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "name": "Apollo Hospitals, Greams Road",
            "facility_type": "Flagship Multi-Specialty Hospital",
            "type": "Multi-Specialty Hospital",
            "ownership": "Apollo Hospitals Enterprise",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "country": "India",
            "address": "21 Greams Lane, Off Greams Road, Thousand Lights, Chennai, Tamil Nadu 600006",
            "postal_code": "600006",
            "phone": "+91 44 2829 0200",
            "website": "https://www.apollohospitals.com",
            "lat": 13.0604,
            "lng": 80.2496,
            "location": {"type": "Point", "coordinates": [80.2496, 13.0604]},
            "rating": 4.9,
            "total_beds": 600,
            "occupied_beds": 510,
            "available_beds": 90,
            "icu_beds": 160,
            "emergency_beds": 60,
            "emergency": True,
            "specialties": ["Cardiothoracic Surgery", "Oncology", "Orthopedics", "Robotic Surgery", "Renal Sciences"],
            "services": ["24/7 Critical Care", "Proton Beam Therapy", "Comprehensive Stroke Unit", "Apollo Prism"],
            "data_source": "CareBridge Verified Registry",
            "status": "ACTIVE",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "name": "Tata Memorial Hospital",
            "facility_type": "Specialized Cancer Center & Research",
            "type": "Oncology Specialty Hospital",
            "ownership": "Department of Atomic Energy, Govt of India",
            "city": "Mumbai",
            "state": "Maharashtra",
            "country": "India",
            "address": "Dr. E Borges Road, Parel, Mumbai, Maharashtra 400012",
            "postal_code": "400012",
            "phone": "+91 22 2417 7000",
            "website": "https://tmc.gov.in",
            "lat": 19.0048,
            "lng": 72.8427,
            "location": {"type": "Point", "coordinates": [72.8427, 19.0048]},
            "rating": 4.9,
            "total_beds": 700,
            "occupied_beds": 660,
            "available_beds": 40,
            "icu_beds": 110,
            "emergency_beds": 40,
            "emergency": True,
            "specialties": ["Surgical Oncology", "Medical Oncology", "Radiation Oncology", "Pediatric Oncology", "Bone Marrow Transplant"],
            "services": ["Comprehensive Cancer Diagnostics", "Palliative Care", "PET-CT Scan", "Molecular Pathology"],
            "data_source": "CareBridge Verified Registry",
            "status": "ACTIVE",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "name": "Manipal Hospital, HAL Airport Road",
            "facility_type": "Quaternary Care Multi-Specialty Hospital",
            "type": "Multi-Specialty Hospital",
            "ownership": "Manipal Health Enterprises",
            "city": "Bengaluru",
            "state": "Karnataka",
            "country": "India",
            "address": "98, HAL Old Airport Rd, Kodihalli, Bengaluru, Karnataka 560017",
            "postal_code": "560017",
            "phone": "+91 80 2502 4444",
            "website": "https://www.manipalhospitals.com",
            "lat": 12.9582,
            "lng": 77.6486,
            "location": {"type": "Point", "coordinates": [77.6486, 12.9582]},
            "rating": 4.8,
            "total_beds": 650,
            "occupied_beds": 540,
            "available_beds": 110,
            "icu_beds": 150,
            "emergency_beds": 55,
            "emergency": True,
            "specialties": ["Cardiology", "Neurology", "Organ Transplants", "Oncology", "Gastroenterology", "Orthopedics"],
            "services": ["24/7 Stroke Management", "Pediatric Intensive Care", "Robotic Surgery", "Level 1 Trauma Care"],
            "data_source": "CareBridge Verified Registry",
            "status": "ACTIVE",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "name": "KIMS Hospitals, Secunderabad",
            "facility_type": "Multi-Super Specialty Healthcare Center",
            "type": "Multi-Specialty Hospital",
            "ownership": "Krishna Institute of Medical Sciences",
            "city": "Hyderabad",
            "state": "Telangana",
            "country": "India",
            "address": "1-8-31/1, Minister Road, Krishna Nagar Colony, Begumpet, Secunderabad, Telangana 500003",
            "postal_code": "500003",
            "phone": "+91 40 4488 5000",
            "website": "https://www.kimshospitals.com",
            "lat": 17.4375,
            "lng": 78.4839,
            "location": {"type": "Point", "coordinates": [78.4839, 17.4375]},
            "rating": 4.7,
            "total_beds": 1000,
            "occupied_beds": 820,
            "available_beds": 180,
            "icu_beds": 220,
            "emergency_beds": 70,
            "emergency": True,
            "specialties": ["Heart & Lung Transplant", "Neurosciences", "Oncology", "Gastroenterology", "Renal Sciences"],
            "services": ["24/7 Emergency & Trauma", "ECMO Center", "Minimal Access Surgery", "Comprehensive Dialysis Unit"],
            "data_source": "CareBridge Verified Registry",
            "status": "ACTIVE",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "name": "Artemis Hospital",
            "facility_type": "Super Specialty JCI & NABH Accredited",
            "type": "Multi-Specialty Hospital",
            "ownership": "Artemis Medicare Services",
            "city": "Gurugram",
            "state": "Haryana",
            "country": "India",
            "address": "Sector 51, Gurugram, Haryana 122001",
            "postal_code": "122001",
            "phone": "+91 124 451 1111",
            "website": "https://www.artemishospitals.com",
            "lat": 28.4326,
            "lng": 77.0708,
            "location": {"type": "Point", "coordinates": [77.0708, 28.4326]},
            "rating": 4.7,
            "total_beds": 400,
            "occupied_beds": 320,
            "available_beds": 80,
            "icu_beds": 110,
            "emergency_beds": 40,
            "emergency": True,
            "specialties": ["Cardiology", "Oncology", "Neurosurgery", "Bariatric Surgery", "Orthopedics"],
            "services": ["24/7 Critical Care", "Interventional Radiology", "Bone Marrow Transplant Unit"],
            "data_source": "CareBridge Verified Registry",
            "status": "ACTIVE",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "name": "Sir Ganga Ram Hospital",
            "facility_type": "Multi-Specialty Trust Hospital",
            "type": "Multi-Specialty Hospital",
            "ownership": "Sir Ganga Ram Trust",
            "city": "New Delhi",
            "state": "Delhi",
            "country": "India",
            "address": "Sir Ganga Ram Hospital Marg, Old Rajinder Nagar, New Delhi, Delhi 110060",
            "postal_code": "110060",
            "phone": "+91 11 2575 0000",
            "website": "https://sgrh.com",
            "lat": 28.6385,
            "lng": 77.1895,
            "location": {"type": "Point", "coordinates": [77.1895, 28.6385]},
            "rating": 4.8,
            "total_beds": 675,
            "occupied_beds": 580,
            "available_beds": 95,
            "icu_beds": 150,
            "emergency_beds": 50,
            "emergency": True,
            "specialties": ["Internal Medicine", "Gastroenterology", "Nephrology", "Cardiology", "General Surgery"],
            "services": ["24/7 Emergency & Ambulance", "Blood Bank", "Advanced Dialysis", "Robotic Surgery"],
            "data_source": "CareBridge Verified Registry",
            "status": "ACTIVE",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    ]

    for h in verified_hospitals:
        db.hospitals.update_one(
            {"name": h["name"]},
            {"$set": h},
            upsert=True
        )

    # 3. Create 2dsphere index on location field
    try:
        db.hospitals.create_index([("location", "2dsphere")])
        print("Created 2dsphere index on 'location'.")
    except Exception as e:
        print(f"Error creating 2dsphere index: {e}")

    # Ensure all hospitals without GeoJSON location have it set
    all_h = list(db.hospitals.find())
    for doc in all_h:
        lat = doc.get("lat") or doc.get("latitude")
        lng = doc.get("lng") or doc.get("longitude")
        if lat and lng and not doc.get("location"):
            db.hospitals.update_one(
                {"_id": doc["_id"]},
                {"$set": {"location": {"type": "Point", "coordinates": [float(lng), float(lat)]}}}
            )

    print(f"Verified hospital database ready. Total active hospitals: {db.hospitals.count_documents({})}")

if __name__ == "__main__":
    cleanup_and_seed()
