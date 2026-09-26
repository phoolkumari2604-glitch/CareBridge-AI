from app.core.database import connect_to_mongodb


try:
    db = connect_to_mongodb()

    print("MongoDB connection successful!")
    print("Database:", db.name)

except Exception as e:
    print("MongoDB connection failed!")
    print("Error:", e)