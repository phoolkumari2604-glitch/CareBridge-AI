from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from datetime import datetime, UTC
import httpx
import os
import math

from app.core.database import get_database
from app.core.dependencies import (
    get_current_user,
    require_admin,
)
from app.schemas.hospital import HospitalCreate, HospitalUpdate


router = APIRouter(
    prefix="/hospitals",
    tags=["Hospitals"]
)


# ============================================================
# CREATE HOSPITAL
# ADMIN ONLY
# ============================================================

@router.post("/")
def create_hospital(
    hospital: HospitalCreate,
    current_user: dict = Depends(require_admin),
):
    db = get_database()

    data = hospital.model_dump()
    data["created_at"] = datetime.now(UTC)

    result = db.hospitals.insert_one(data)

    return {
        "message": "Hospital created successfully",
        "hospital_id": str(result.inserted_id)
    }


# ============================================================
# GET ALL HOSPITALS
# ALL AUTHENTICATED USERS
# ============================================================

@router.get("/")
def get_hospitals(
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    hospitals = list(db.hospitals.find())

    for hospital in hospitals:
        hospital["_id"] = str(hospital["_id"])

    return hospitals


# ============================================================
# REAL-TIME NEARBY HOSPITALS & POLICE STATIONS
# Fetches live geospatial facilities from OpenStreetMap / Google Places
# ============================================================

@router.get("/nearby/realtime")
async def get_realtime_nearby_facilities(
    lat: float = Query(..., description="Latitude of user"),
    lng: float = Query(..., description="Longitude of user"),
    radius_km: float = Query(10.0, description="Radius in kilometers"),
    current_user: dict = Depends(get_current_user),
):
    """
    Fetches real-time actual hospitals, medical centers, and police stations
    around the user's GPS coordinates using live Overpass API with graceful fallback.
    """
    radius_meters = int(radius_km * 1000)
    
    # Overpass QL query for hospitals, clinics, police stations
    overpass_query = f"""
    [out:json][timeout:15];
    (
      node["amenity"="hospital"](around:{radius_meters},{lat},{lng});
      way["amenity"="hospital"](around:{radius_meters},{lat},{lng});
      node["amenity"="clinic"](around:{radius_meters},{lat},{lng});
      node["amenity"="police"](around:{radius_meters},{lat},{lng});
      way["amenity"="police"](around:{radius_meters},{lat},{lng});
    );
    out center 25;
    """

    results = {
        "user_location": {"lat": lat, "lng": lng, "radius_km": radius_km},
        "hospitals": [],
        "police_stations": [],
        "source": "openstreetmap_live",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": overpass_query},
            )

            if resp.status_code == 200:
                data = resp.json()
                elements = data.get("elements", [])

                for elem in elements:
                    elem_lat = elem.get("lat") or elem.get("center", {}).get("lat")
                    elem_lng = elem.get("lon") or elem.get("center", {}).get("lon")
                    tags = elem.get("tags", {})
                    name = tags.get("name") or tags.get("name:en")
                    amenity = tags.get("amenity")

                    if not elem_lat or not elem_lng or not name:
                        continue

                    # Calculate distance
                    d_lat = math.radians(elem_lat - lat)
                    d_lon = math.radians(elem_lng - lng)
                    a = (
                        math.sin(d_lat / 2) ** 2
                        + math.cos(math.radians(lat))
                        * math.cos(math.radians(elem_lat))
                        * math.sin(d_lon / 2) ** 2
                    )
                    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                    distance = round(6371 * c, 2)

                    addr = tags.get("addr:street") or tags.get("addr:city") or tags.get("address") or "City Area"
                    phone = tags.get("phone") or tags.get("contact:phone") or ("102" if amenity in ["hospital", "clinic"] else "112")
                    gmaps_url = f"https://www.google.com/maps/search/?api=1&query={name.replace(' ', '+')}+{elem_lat},{elem_lng}"
                    directions_url = f"https://www.google.com/maps/dir/?api=1&origin={lat},{lng}&destination={elem_lat},{elem_lng}"

                    item = {
                        "id": f"osm-{elem.get('id')}",
                        "name": name,
                        "lat": elem_lat,
                        "lng": elem_lng,
                        "distance_km": distance,
                        "address": addr,
                        "phone": phone,
                        "emergency": tags.get("emergency") == "yes",
                        "google_maps_url": gmaps_url,
                        "directions_url": directions_url,
                    }

                    if amenity in ["hospital", "clinic"]:
                        item["category"] = "hospital"
                        item["beds"] = tags.get("capacity:beds") or 50
                        results["hospitals"].append(item)
                    elif amenity == "police":
                        item["category"] = "police"
                        item["division"] = tags.get("operator") or "District Police Post"
                        results["police_stations"].append(item)

    except Exception as e:
        results["source"] = "fallback"
        results["error"] = str(e)

    return results


# ============================================================
# GET SINGLE HOSPITAL
# ALL AUTHENTICATED USERS
# ============================================================

@router.get("/{hospital_id}")
def get_hospital(
    hospital_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    if not ObjectId.is_valid(hospital_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid hospital ID"
        )

    hospital = db.hospitals.find_one(
        {"_id": ObjectId(hospital_id)}
    )

    if not hospital:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found"
        )

    hospital["_id"] = str(hospital["_id"])

    return hospital


# ============================================================
# UPDATE HOSPITAL
# ADMIN ONLY
# ============================================================

@router.put("/{hospital_id}")
def update_hospital(
    hospital_id: str,
    hospital: HospitalUpdate,
    current_user: dict = Depends(require_admin),
):
    db = get_database()

    if not ObjectId.is_valid(hospital_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid hospital ID"
        )

    data = {
        key: value
        for key, value in hospital.model_dump().items()
        if value is not None
    }

    result = db.hospitals.update_one(
        {"_id": ObjectId(hospital_id)},
        {"$set": data}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found"
        )

    return {
        "message": "Hospital updated successfully"
    }


# ============================================================
# DELETE HOSPITAL
# ADMIN ONLY
# ============================================================

@router.delete("/{hospital_id}")
def delete_hospital(
    hospital_id: str,
    current_user: dict = Depends(require_admin),
):
    db = get_database()

    if not ObjectId.is_valid(hospital_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid hospital ID"
        )

    result = db.hospitals.delete_one(
        {"_id": ObjectId(hospital_id)}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found"
        )

    return {
        "message": "Hospital deleted successfully"
    }


# ============================================================
# SEARCH HOSPITALS BY CITY
# ALL AUTHENTICATED USERS
# ============================================================

@router.get("/search/by-city")
def search_hospitals_by_city(
    city: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    hospitals = list(
        db.hospitals.find(
            {
                "city": {
                    "$regex": city,
                    "$options": "i"
                }
            }
        )
    )

    for hospital in hospitals:
        hospital["_id"] = str(hospital["_id"])

    return hospitals
