from datetime import datetime, timezone
from bson import ObjectId


def create_hospital_document(
    name: str,
    country: str = "India",
    state: str | None = None,
    city: str | None = None,
    address: str | None = None,
    postal_code: str | None = None,
    phone: str | None = None,
    website: str | None = None,
    facility_type: str | None = None,
    ownership: str | None = None,
    total_beds: int | None = None,
    occupied_beds: int | None = None,
    available_beds: int | None = None,
    data_source: str = "CareBridge Verified Registry",
    source_id: str | None = None,
    source_updated_at: str | None = None,
    emergency: bool = True,
    lat: float | None = None,
    lng: float | None = None,
    rating: float | None = None,
):
    """
    Creates a unified hospital document for MongoDB storage.
    """
    now = datetime.now(timezone.utc)
    return {
        "name": name,
        "country": country,
        "state": state,
        "city": city,
        "address": address,
        "postal_code": postal_code,
        "phone": phone,
        "website": website,
        "facility_type": facility_type or "General Acute Care",
        "ownership": ownership or "Private / Trust",
        "total_beds": total_beds,
        "occupied_beds": occupied_beds,
        "available_beds": available_beds,
        "data_source": data_source,
        "source_id": source_id,
        "source_updated_at": source_updated_at or now.isoformat(),
        "retrieved_at": now.isoformat(),
        "emergency": emergency,
        "lat": lat,
        "lng": lng,
        "rating": rating or 4.5,
        "created_at": now,
        "updated_at": now,
    }
