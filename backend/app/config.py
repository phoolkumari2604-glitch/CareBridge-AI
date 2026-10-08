import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "carebridge_ai")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "carebridge_ai_super_secret_jwt_key_2026")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours
PORT = int(os.getenv("PORT", "5000"))
FLASK_ENV = os.getenv("FLASK_ENV", "development")
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
