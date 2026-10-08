from bson import ObjectId
from datetime import datetime, date

def serialize_doc(doc):
    """Recursively convert MongoDB document (ObjectIds, datetimes) to JSON-serializable dict."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for k, v in doc.items():
            if isinstance(v, ObjectId):
                result[k] = str(v)
            elif isinstance(v, (datetime, date)):
                result[k] = v.isoformat()
            elif isinstance(v, (dict, list)):
                result[k] = serialize_doc(v)
            else:
                result[k] = v
        return result
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, (datetime, date)):
        return doc.isoformat()
    return doc

def is_valid_object_id(id_str):
    """Check if string is a valid MongoDB ObjectId."""
    if not id_str:
        return False
    return ObjectId.is_valid(str(id_str))

def parse_object_id(id_str):
    """Safely convert string to ObjectId or None."""
    if not is_valid_object_id(id_str):
        return None
    return ObjectId(str(id_str))
