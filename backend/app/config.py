import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "carebridge_ai")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "carebridge_ai_super_secret_jwt_key_2026")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours
PORT = int(os.getenv("PORT", "5000"))
FLASK_ENV = os.getenv("FLASK_ENV", "production")

APP_URL = os.getenv("APP_URL", "http://localhost:5173")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "phoolkumari2603@gmail.com").strip().lower()
ADMIN_NAME = os.getenv("ADMIN_NAME", "Phool Kumari").strip()
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "phoolkumari2603@gmail.com").strip().lower()

# SMTP & Transactional Email
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAILS_FROM_EMAIL = os.getenv("EMAILS_FROM_EMAIL", "support@carebridge.ai")
EMAILS_FROM_NAME = os.getenv("EMAILS_FROM_NAME", "CareBridge AI")

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
