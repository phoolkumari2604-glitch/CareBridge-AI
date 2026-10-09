import os
from pymongo import MongoClient
from app.config import MONGO_URI, DATABASE_NAME

client = None
db = None

def connect_to_mongodb():
    global client, db

    uri = MONGO_URI or "mongodb://localhost:27017"

    try:
        if "mongodb+srv://" in uri or "tls=true" in uri.lower():
            client = MongoClient(uri, tlsAllowInvalidCertificates=True, serverSelectionTimeoutMS=5000)
        else:
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)

        # Verify the connection
        client.admin.command("ping")
        db = client[DATABASE_NAME]
        print(f"[MongoDB] Successfully connected to database '{DATABASE_NAME}'")
        return db
    except Exception as e:
        print(f"[MongoDB Connection Warning] Atlas ping failed ({e}). Falling back to local MongoDB...")
        try:
            local_uri = "mongodb://localhost:27017"
            client = MongoClient(local_uri, serverSelectionTimeoutMS=3000)
            client.admin.command("ping")
            db = client[DATABASE_NAME]
            print(f"[MongoDB] Successfully connected to local database '{DATABASE_NAME}'")
            return db
        except Exception as local_err:
            print(f"[MongoDB Error] Could not connect to local database: {local_err}")
            # Keep client initialized so queries won't crash entire server
            client = MongoClient(uri, tlsAllowInvalidCertificates=True, serverSelectionTimeoutMS=3000)
            db = client[DATABASE_NAME]
            return db

def get_database():
    global db
    if db is None:
        db = connect_to_mongodb()
    return db

def close_mongodb_connection():
    global client, db
    if client:
        client.close()
        client = None
        db = None