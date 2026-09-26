import os

from dotenv import load_dotenv


load_dotenv()


MONGO_URI = os.getenv("MONGO_URI")

DATABASE_NAME = os.getenv(
    "DATABASE_NAME",
    "carebridge_ai"
)


JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY"
)

JWT_ALGORITHM = "HS256"

JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 60