import os
import sys
import random
import re

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import get_database

def generate_unique_6digit_code(existing_codes):
    while True:
        code = str(random.randint(100000, 999999))
        if code not in existing_codes:
            existing_codes.add(code)
            return code

def migrate_patients():
    db = get_database()
    patients_col = db.patients
    
    print("Starting Patient 6-Digit ID & Data Quality Migration...")
    
    # Collect all existing 6-digit codes
    existing_codes = set()
    all_patients = list(patients_col.find({}))
    print(f"Found {len(all_patients)} total patient records in database.")
    
    for p in all_patients:
        code = p.get("patient_code")
        if code and isinstance(code, str) and re.match(r"^\d{6}$", code):
            existing_codes.add(code)
            
    updated_count = 0
    test_count = 0
    
    for p in all_patients:
        pid = p["_id"]
        current_code = p.get("patient_code")
        needs_code = not (current_code and isinstance(current_code, str) and re.match(r"^\d{6}$", current_code))
        
        name = p.get("name", "")
        email = p.get("email", "") or ""
        
        is_test = False
        if any(w in name.lower() for w in ["test", "dummy", "sample", "temp", "fake", "foo", "bar"]) or \
           any(w in email.lower() for w in ["test", "dummy", "example.com", "test.com", "fake"]):
            is_test = True
            test_count += 1
            
        update_fields = {"is_test": is_test}
        
        if needs_code:
            new_code = generate_unique_6digit_code(existing_codes)
            update_fields["patient_code"] = new_code
            update_fields["patient_id_code"] = new_code # Keep sync
            updated_count += 1
        else:
            # ensure patient_id_code is also 6-digit string
            update_fields["patient_id_code"] = current_code
            
        patients_col.update_one({"_id": pid}, {"$set": update_fields})
        
    print(f"Migration complete: {updated_count} patients assigned new 6-digit codes. {test_count} flagged as test accounts.")
    
    # Ensure index on patient_code
    try:
        patients_col.create_index("patient_code", unique=True, sparse=True)
        print("Unique index on 'patient_code' verified.")
    except Exception as e:
        print(f"Index creation note: {e}")

    # Verify a few samples
    sample = list(patients_col.find({}, {"name": 1, "patient_code": 1, "phone": 1, "is_test": 1}).limit(10))
    for s in sample:
        print(f"Patient: {s.get('name')} | Code: {s.get('patient_code')} | Phone: {s.get('phone')} | Test: {s.get('is_test')}")

if __name__ == "__main__":
    migrate_patients()
