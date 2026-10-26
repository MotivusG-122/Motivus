
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    HTTPException,
    Request,
    Response,
)
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pwdlib import PasswordHash
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import SessionLocal


# Load environment variables from backend/.env
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
ADMIN_SETUP_SECRET = os.getenv("ADMIN_SETUP_SECRET", "")

JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60
COOKIE_NAME = "motivus_session"

if len(JWT_SECRET_KEY) < 32:
    raise RuntimeError("JWT_SECRET_KEY must be at least 32 characters")

if len(ADMIN_SETUP_SECRET) < 32:
    raise RuntimeError("ADMIN_SETUP_SECRET must be at least 32 characters")

password_hash = PasswordHash.recommended()
router = APIRouter(prefix="/auth", tags=["Authentication"])


# Request and response schemas
class SignupInput(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class LoginInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class BootstrapAdminInput(SignupInput):
    setup_secret: str = Field(min_length=32, max_length=256)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    role: str
    is_active: bool


# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Validate request origin to protect cookie-based endpoints
def require_same_origin(request: Request):
    expected_origin = os.getenv(
        "FRONTEND_ORIGIN", "http://localhost:3000"
    ).rstrip("/")

    origin = request.headers.get("origin", "").rstrip("/")

    allowed_origins = {
        expected_origin,
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    }

    if origin not in allowed_origins:
        raise HTTPException(
            status_code=403,
            detail="Invalid request origin",
        )


# JWT session helpers
def create_token(user_id: int, role: str) -> str:
    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=TOKEN_EXPIRE_MINUTES),
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def set_session_cookie(response: Response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
        samesite="lax",
        max_age=TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


def issue_session(response: Response, user):
    token = create_token(user["id"], user["role"])
    set_session_cookie(response, token)


# Authenticate current session
def current_user(
    session_token: str | None = Cookie(default=None, alias=COOKIE_NAME),
    db: Session = Depends(get_db),
):
    if not session_token:
        raise HTTPException(status_code=401, detail="Please log in")

    try:
        payload = jwt.decode(
            session_token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["sub", "exp", "iat"]},
        )
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, ValueError, KeyError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session",
        )

    user = db.execute(
        text("""
            SELECT id, full_name, email, role, is_active
            FROM users
            WHERE id = :user_id
        """),
        {"user_id": user_id},
    ).mappings().first()

    if not user or not user["is_active"]:
        raise HTTPException(
            status_code=401,
            detail="Account is inactive or unavailable",
        )

    return dict(user)


def require_admin(user=Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )
    return user


# Public signup: new accounts always get viewer role
@router.post("/signup", response_model=UserOut, status_code=201)
def signup(
    data: SignupInput,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    require_same_origin(request)

    email = str(data.email).strip().lower()

    try:
        result = db.execute(
            text("""
                INSERT INTO users (full_name, email, password_hash, role)
                VALUES (:full_name, :email, :password_hash, 'viewer')
                RETURNING id, full_name, email, role, is_active
            """),
            {
                "full_name": data.full_name.strip(),
                "email": email,
                "password_hash": password_hash.hash(data.password),
            },
        ).mappings().one()

        db.commit()

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="An account with this email may already exist",
        )

    user = dict(result)
    issue_session(response, user)
    return user


# Login
@router.post("/login", response_model=UserOut)
def login(
    data: LoginInput,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    require_same_origin(request)

    email = str(data.email).strip().lower()

    user = db.execute(
        text("""
            SELECT id, full_name, email, password_hash, role, is_active
            FROM users
            WHERE email = :email
        """),
        {"email": email},
    ).mappings().first()

    if not user or not password_hash.verify(
        data.password,
        user["password_hash"],
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=403,
            detail="Account is inactive",
        )

    db.execute(
        text("UPDATE users SET last_login_at = NOW() WHERE id = :id"),
        {"id": user["id"]},
    )
    db.commit()

    public_user = {
        "id": user["id"],
        "full_name": user["full_name"],
        "email": user["email"],
        "role": user["role"],
        "is_active": user["is_active"],
    }

    issue_session(response, public_user)
    return public_user


# Logout
@router.post("/logout", status_code=204)
def logout(request: Request, response: Response):
    require_same_origin(request)

    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
        samesite="lax",
        path="/",
    )

    response.status_code = 204
    return response


# Current logged-in user
@router.get("/me", response_model=UserOut)
def me(user=Depends(current_user)):
    return user


# One-time initial admin setup
@router.post(
    "/bootstrap-admin",
    response_model=UserOut,
    status_code=201,
)
def bootstrap_admin(
    data: BootstrapAdminInput,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    require_same_origin(request)

    if not secrets.compare_digest(
        data.setup_secret,
        ADMIN_SETUP_SECRET,
    ):
        raise HTTPException(
            status_code=403,
            detail="Invalid setup secret",
        )

    # Prevent simultaneous first-admin creation
    db.execute(text("SELECT pg_advisory_xact_lock(734219805)"))

    admin_exists = db.execute(
        text("SELECT EXISTS (SELECT 1 FROM users WHERE role = 'admin')")
    ).scalar_one()

    if admin_exists:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Initial admin has already been created",
        )

    email = str(data.email).strip().lower()

    try:
        result = db.execute(
            text("""
                INSERT INTO users (full_name, email, password_hash, role)
                VALUES (:full_name, :email, :password_hash, 'admin')
                RETURNING id, full_name, email, role, is_active
            """),
            {
                "full_name": data.full_name.strip(),
                "email": email,
                "password_hash": password_hash.hash(data.password),
            },
        ).mappings().one()

        db.commit()

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Could not create initial admin account",
        )

    user = dict(result)
    issue_session(response, user)
    return user
