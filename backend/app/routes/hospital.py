from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g, Response
from bson import ObjectId
from app.core.database import get_database
from app.utils.decorators import token_required, staff_or_admin_required
from app.utils.helpers import serialize_doc, is_valid_object_id
from app.services.map_service import fetch_realtime_osm_facilities, generate_hospitals_map_html

hospital_bp = Blueprint("hospitals", __name__)

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
    result = db.hospitals.insert_one(data)
    return jsonify({
        "message": "Hospital created successfully",
        "hospital_id": str(result.inserted_id)
    }), 201

@hospital_bp.route("", methods=["GET"], strict_slashes=False)
@hospital_bp.route("/", methods=["GET"], strict_slashes=False)
@token_required
def get_hospitals():
    db = get_database()
    city = request.args.get("city")
    query = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
        
    hospitals = list(db.hospitals.find(query))
    return jsonify(serialize_doc(hospitals)), 200

@hospital_bp.route("/search/by-city", methods=["GET"], strict_slashes=False)
@token_required
def search_hospitals_by_city():
    db = get_database()
    city = request.args.get("city", "")
    hospitals = list(db.hospitals.find({"city": {"$regex": city, "$options": "i"}}))
    return jsonify(serialize_doc(hospitals)), 200

@hospital_bp.route("/nearby/realtime", methods=["GET"], strict_slashes=False)
@token_required
def get_nearby_realtime():
    try:
        lat = float(request.args.get("lat", 28.6139))
        lng = float(request.args.get("lng", 77.2090))
        radius_km = float(request.args.get("radius_km", 10.0))
    except (ValueError, TypeError):
        return jsonify({"error": "Validation Error", "detail": "Invalid lat, lng or radius_km"}), 400

    results = fetch_realtime_osm_facilities(lat, lng, radius_km)
    
    # Also fetch database registered hospitals and include them with calculated distances
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
                        "is_partner": True
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
        user_lng=float(lng) if lng else None
    )
    return Response(html_content, mimetype="text/html")

@hospital_bp.route("/<hospital_id>", methods=["GET"], strict_slashes=False)
@token_required
def get_hospital(hospital_id):
    db = get_database()
    if not is_valid_object_id(hospital_id):
        return jsonify({"error": "Validation Error", "detail": "Invalid hospital ID"}), 400
        
    hospital = db.hospitals.find_one({"_id": ObjectId(hospital_id)})
    if not hospital:
        return jsonify({"error": "Not Found", "detail": "Hospital not found"}), 404
        
    return jsonify(serialize_doc(hospital)), 200

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
