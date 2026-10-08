from pymongo import MongoClient
from app.config import MONGO_URI, DATABASE_NAME


client = None
db = None


def connect_to_mongodb():
    global client, db

    if not MONGO_URI:
        raise ValueError("MONGO_URI is not connnected in .env")

    client = MongoClient(MONGO_URI)

    # Verify the connection
    client.admin.command("ping")

    db = client[DATABASE_NAME]

    return db


def get_database():
    if db is None:
        raise RuntimeError("MongoDB is not connected")

    return db


def close_mongodb_connection():
    global client

    if client:
        client.close()
        client = None