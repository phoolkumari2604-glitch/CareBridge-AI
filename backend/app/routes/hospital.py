from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g, Response
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id
from app.services.map_service import fetch_realtime_osm_facilities, generate_hospitals_map_html
from app.services.hospital_service import (
    get_aggregated_hospitals,
    get_hospital_details,
    calculate_hospital_statistics,
    get_bed_availability_data,
    get_all_sources_status,
)

hospital_bp = Blueprint("hospitals", __name__)


# ------------------------------------------------------------
# 1. HOSPITAL LISTING & FILTERING WITH PAGINATION
# ------------------------------------------------------------
@hospital_bp.route("", methods=["GET"], strict_slashes=False)
@hospital_bp.route("/", methods=["GET"], strict_slashes=False)
def get_hospitals():
    """
    Returns hospital listings with pagination, supported filters (name, city, state,
    country, type, ownership, source), source information, and data freshness metadata.
    """
    try:
        page = int(request.args.get("page", 1))
        limit = min(50, max(1, int(request.args.get("limit", 12))))
    except (ValueError, TypeError):
        page = 1
        limit = 12

    search = request.args.get("search") or request.args.get("q") or request.args.get("name")
    city = request.args.get("city")
    state = request.args.get("state")
    country = request.args.get("country")
    facility_type = request.args.get("type") or request.args.get("facility_type")
    ownership = request.args.get("ownership")
    source = request.args.get("source", "all").lower()
    sort_by = request.args.get("sort_by", "recommended")

    has_emergency_param = request.args.get("emergency") or request.args.get("has_emergency")
    has_emergency = None
    if has_emergency_param is not None:
        has_emergency = has_emergency_param.lower() in ["true", "1", "yes"]

    data = get_aggregated_hospitals(
        page=page,
        limit=limit,
        search=search,
        city=city,
        state=state,
        country=country,
        facility_type=facility_type,
        ownership=ownership,
        source=source,
        has_emergency=has_emergency,
        sort_by=sort_by,
    )

    return jsonify(data), 200


# ------------------------------------------------------------
# 2. FAST HOSPITAL SEARCH
# ------------------------------------------------------------
@hospital_bp.route("/search", methods=["GET"], strict_slashes=False)
def search_hospitals():
    """
    Searches hospitals using supported location, type, and name filters.
    """
    q = request.args.get("q") or request.args.get("search") or request.args.get("name")
    city = request.args.get("city")
    state = request.args.get("state")
    country = request.args.get("country")
    source = request.args.get("source", "all")

    try:
        limit = min(50, max(1, int(request.args.get("limit", 20))))
    except (ValueError, TypeError):
        limit = 20

    data = get_aggregated_hospitals(
        page=1,
        limit=limit,
        search=q,
        city=city,
        state=state,
        country=country,
        source=source,
    )

    return jsonify({
        "results": data.get("hospitals", []),
        "total": data.get("total", 0),
        "sources_status": data.get("sources_status", {}),
        "retrieved_at": data.get("retrieved_at"),
    }), 200


@hospital_bp.route("/search/by-city", methods=["GET"], strict_slashes=False)
def search_hospitals_by_city():
    city = request.args.get("city", "")
    data = get_aggregated_hospitals(page=1, limit=50, city=city)
    return jsonify(data.get("hospitals", [])), 200


# ------------------------------------------------------------
# 3. HEALTHCARE STATISTICS & AGGREGATIONS
# ------------------------------------------------------------
@hospital_bp.route("/statistics", methods=["GET"], strict_slashes=False)
def get_hospital_statistics():
    """
    Returns healthcare statistics calculated from available and validated records.
    Never fabricates random data.
    """
    stats = calculate_hospital_statistics()
    return jsonify(stats), 200


# ------------------------------------------------------------
# 4. BED AVAILABILITY
# ------------------------------------------------------------
@hospital_bp.route("/availability", methods=["GET"], strict_slashes=False)
def get_bed_availability():
    """
    Returns verified bed availability or an explicit unavailable status.
    """
    availability_data = get_bed_availability_data()
    return jsonify(availability_data), 200


# ------------------------------------------------------------
# 5. DATA SOURCES STATUS
# ------------------------------------------------------------
@hospital_bp.route("/sources", methods=["GET"], strict_slashes=False)
def get_sources():
    """
    Returns integration status for API Ninjas, U.S. CMS, India HMIS, and MongoDB.
    """
    sources_status = get_all_sources_status()
    return jsonify(sources_status), 200


# ------------------------------------------------------------
# 6. LEAFMAP INTERACTIVE MAP & NEARBY OPENSTREETMAP FACILITIES
# ------------------------------------------------------------
@hospital_bp.route("/nearby/realtime", methods=["GET"], strict_slashes=False)
def get_nearby_realtime():
    try:
        lat = float(request.args.get("lat", 28.6139))
        lng = float(request.args.get("lng", 77.2090))
        radius_km = float(request.args.get("radius_km", 10.0))
    except (ValueError, TypeError):
        return jsonify({"error": "Validation Error", "detail": "Invalid lat, lng or radius_km"}), 400

    results = fetch_realtime_osm_facilities(lat, lng, radius_km)
    
    # Also fetch database registered hospitals with distance calculations
    db = get_database()
    db_hospitals = list(db.hospitals.find())
    for h in db_hospitals:
        h_lat = h.get("lat") or h.get("latitude")
        h_lng = h.get("lng") or h.get("longitude")
        if h_lat and h_lng:
            try:
                from app.services.map_service import haversine_distance
                dist = haversine_distance(lat, lng, float(h_lat), float(h_lng))
                if dist <= radius_km:
                    results["hospitals"].insert(0, {
                        "id": str(h["_id"]),
                        "name": h.get("name"),
                        "lat": float(h_lat),
                        "lng": float(h_lng),
                        "distance_km": dist,
                        "address": h.get("address") or f"{h.get('city', '')}",
                        "phone": h.get("phone", "102"),
                        "emergency": True,
                        "category": "hospital",
                        "beds": h.get("total_beds", 100),
                        "is_partner": True,
                    })
            except Exception:
                continue

    return jsonify(results), 200


@hospital_bp.route("/map/html", methods=["GET"], strict_slashes=False)
def get_hospital_map_view():
    """Renders a dynamic Leafmap interactive HTML map for hospitals."""
    db = get_database()
    hospitals = list(db.hospitals.find())
    serialized = serialize_doc(hospitals)
    
    lat = request.args.get("lat")
    lng = request.args.get("lng")
    html_content = generate_hospitals_map_html(
        serialized,
        user_lat=float(lat) if lat else None,
        user_lng=float(lng) if lng else None,
    )
    return Response(html_content, mimetype="text/html")


# ------------------------------------------------------------
# 7. HOSPITAL DETAILS BY ID
# ------------------------------------------------------------
@hospital_bp.route("/<hospital_id>", methods=["GET"], strict_slashes=False)
def get_hospital(hospital_id):
    """
    Returns details for a specific hospital, including contact, facility,
    bed data (where verified), and source attribution.
    """
    hospital = get_hospital_details(hospital_id)
    if not hospital:
        return jsonify({"error": "Not Found", "detail": "Hospital not found"}), 404

    return jsonify(hospital), 200


# ------------------------------------------------------------
# 8. CRUD FOR STAFF / ADMIN
# ------------------------------------------------------------
@hospital_bp.route("", methods=["POST"], strict_slashes=False)
@hospital_bp.route("/", methods=["POST"], strict_slashes=False)
@staff_or_admin_required
def create_hospital():
    db = get_database()
    data = request.get_json() or {}
    
    name = data.get("name")
    if not name:
        return jsonify({"error": "Validation Error", "detail": "Hospital name is required"}), 400
        
    data["created_at"] = datetime.now(timezone.utc)
    data["data_source"] = data.get("data_source", "CareBridge Verified Registry")
    result = db.hospitals.insert_one(data)
    return jsonify({
        "message": "Hospital created successfully",
        "hospital_id": str(result.inserted_id),
    }), 201


@hospital_bp.route("/<hospital_id>", methods=["PUT"], strict_slashes=False)
@staff_or_admin_required
def update_hospital(hospital_id):
    db = get_database()
    if not is_valid_object_id(hospital_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid hospital ID"}), 400
        
    data = request.get_json() or {}
    data.pop("_id", None)
    data["updated_at"] = datetime.now(timezone.utc)
    
    result = db.hospitals.update_one({"_id": ObjectId(hospital_id)}, {"$set": data})
    if result.matched_count == 0:
        return jsonify({"error": "Not Found", "detail": "Hospital not found"}), 404
        
    return jsonify({"message": "Hospital updated successfully"}), 200


@hospital_bp.route("/<hospital_id>", methods=["DELETE"], strict_slashes=False)
@staff_or_admin_required
def delete_hospital(hospital_id):
    db = get_database()
    if not is_valid_object_id(hospital_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid hospital ID"}), 400
        
    result = db.hospitals.delete_one({"_id": ObjectId(hospital_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Not Found", "detail": "Hospital not found"}), 404
        
    return jsonify({"message": "Hospital deleted successfully"}), 200
