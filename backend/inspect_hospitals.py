import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from app import create_app
from app.core.database import get_database

app = create_app()
with app.app_context():
    db = get_database()
    total = db.hospitals.count_documents({})
    print(f"Total hospitals in DB: {total}")

    # Look for invalid/test entries
    bad_docs = list(db.hospitals.find({
        "$or": [
            {"name": {"$in": ["string", "N/A", "n/a", "", None]}},
            {"name": {"$regex": "^string$", "$options": "i"}},
            {"city": "string"}
        ]
    }))
    print(f"Found {len(bad_docs)} bad records to clean up:")
    for b in bad_docs:
        print(f" - ID: {b['_id']}, Name: {b.get('name')}, City: {b.get('city')}")

    if bad_docs:
        del_res = db.hospitals.delete_many({
            "$or": [
                {"name": {"$in": ["string", "N/A", "n/a", "", None]}},
                {"name": {"$regex": "^string$", "$options": "i"}},
                {"city": "string"}
            ]
        })
        print(f"Cleaned up {del_res.deleted_count} invalid records from db.hospitals.")

    countries = db.hospitals.distinct("country")
    types = list(set(filter(None, db.hospitals.distinct("type") + db.hospitals.distinct("facility_type"))))
    print("Distinct countries:", countries)
    print("Distinct types:", types)
