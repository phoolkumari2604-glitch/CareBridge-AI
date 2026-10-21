from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
import jwt
from app.config import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_ACCESS_TOKEN_EXPIRE_MINUTES

def hash_password(password: str) -> str:
    """Convert a plain-text password into a secure bcrypt hash."""
    if not password:
        raise ValueError("Password cannot be empty")
    pwd_bytes = password.encode("utf-8") if isinstance(password, str) else bytes(password)
    # Truncate to 72 bytes to strictly conform to bcrypt specification
    pwd_bytes = pwd_bytes[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against its stored hash safely (bcrypt, werkzeug, or passlib)."""
    if not plain_password or not hashed_password:
        return False

    # 1. Try standard bcrypt check
    try:
        pwd_bytes = plain_password.encode("utf-8") if isinstance(plain_password, str) else bytes(plain_password)
        pwd_bytes = pwd_bytes[:72]
        hash_bytes = hashed_password.encode("utf-8") if isinstance(hashed_password, str) else bytes(hashed_password)
        if hash_bytes.startswith((b"$2b$", b"$2a$", b"$2y$")):
            return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        pass

    # 2. Try werkzeug check_password_hash (for pbkdf2, scrypt, argon2)
    try:
        from werkzeug.security import check_password_hash
        if check_password_hash(hashed_password, plain_password):
            return True
    except Exception:
        pass

    # 3. Fallback for legacy passlib formats or unexpected salt encodings
    try:
        from passlib.context import CryptContext
        ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return ctx.verify(plain_password, hashed_password)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT access token."""
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
