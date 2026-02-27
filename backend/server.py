from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
import secrets
import hashlib
import asyncio
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7

# Email config
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# File upload config
UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png'}
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png'}

# Resend cooldown (60 seconds)
RESEND_COOLDOWN_SECONDS = 60

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    sharing_code: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    username: str
    email: str
    email_verified: bool
    sharing_code: Optional[str] = None
    avatar_url: Optional[str] = None
    last_relapse_datetime: str
    created_at: str
    streak_seconds: int = 0
    badge: str = "Beginner"
    rank: Optional[int] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class VerifyEmailRequest(BaseModel):
    token: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class UpdateProfileRequest(BaseModel):
    sharing_code: Optional[str] = None
    remove_avatar: Optional[bool] = False

class UpdateRelapseRequest(BaseModel):
    last_relapse_datetime: str

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(username: str) -> str:
    payload = {
        'sub': username,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def generate_verification_token() -> tuple[str, str, datetime]:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expiry = datetime.now(timezone.utc) + timedelta(hours=24)
    return token, token_hash, expiry

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get('sub')
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"username": username}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def calculate_streak(last_relapse_datetime: str) -> int:
    """Calculate streak in seconds from UTC datetime string"""
    relapse_time = datetime.fromisoformat(last_relapse_datetime.replace('Z', '+00:00'))
    now = datetime.now(timezone.utc)
    delta = now - relapse_time
    return int(delta.total_seconds())

def get_badge(streak_seconds: int) -> str:
    days = streak_seconds / 86400
    if days >= 365:
        return "Grandmaster"
    elif days >= 180:
        return "Legend"
    elif days >= 90:
        return "Master"
    elif days >= 30:
        return "Elite"
    elif days >= 14:
        return "Warrior"
    elif days >= 7:
        return "Disciplined"
    elif days >= 3:
        return "Apprentice"
    else:
        return "Beginner"

async def send_verification_email(email: str, token: str):
    """Send verification email using Resend API"""
    verification_link = f"{FRONTEND_URL}/verify-email?token={token}"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #121212; color: #fafafa; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #1A1A1A; padding: 30px; border-radius: 8px; border: 1px solid #333;">
                <h1 style="color: #f59e0b; text-transform: uppercase;">No Nut November War</h1>
                <h2>Verify Your Email</h2>
                <p>Welcome to the war! Click the button below to verify your email and activate your account.</p>
                <a href="{verification_link}" style="display: inline-block; background-color: #f59e0b; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">Verify Email</a>
                <p style="color: #a1a1aa; font-size: 14px;">Or copy this link: {verification_link}</p>
                <p style="color: #a1a1aa; font-size: 14px;">This link expires in 24 hours.</p>
            </div>
        </body>
    </html>
    """
    
    if RESEND_API_KEY:
        try:
            params = {
                "from": SENDER_EMAIL,
                "to": [email],
                "subject": "Verify Your Email - No Nut November War",
                "html": html_content
            }
            await asyncio.to_thread(resend.Emails.send, params)
            logging.info(f"Verification email sent to {email}")
        except Exception as e:
            logging.error(f"Failed to send email to {email}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to send verification email")
    else:
        # Fallback for development/testing
        logging.info(f"MOCK EMAIL: Verification link for {email}: {verification_link}")

# Routes
@api_router.post("/auth/signup")
async def signup(user_data: UserCreate):
    # Check if username exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email exists - don't reveal if email exists for security
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Generate verification token
    token, token_hash, token_expiry = generate_verification_token()
    
    # Create user with UTC timestamp
    user_dict = {
        "username": user_data.username,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "email_verified": False,
        "verification_token_hash": token_hash,
        "verification_token_expiry": token_expiry.isoformat(),
        "sharing_code": user_data.sharing_code,
        "avatar_url": None,
        "last_relapse_datetime": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_verification_sent": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_dict)
    
    # Send verification email
    await send_verification_email(user_data.email, token)
    
    return {"message": "Account created. Please check your email to verify your account."}

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if not user["email_verified"]:
        raise HTTPException(status_code=403, detail="Please verify your email to activate your account.")
    
    token = create_access_token(user["username"])
    
    # Calculate streak and badge
    streak_seconds = calculate_streak(user["last_relapse_datetime"])
    badge = get_badge(streak_seconds)
    
    user_response = UserResponse(
        username=user["username"],
        email=user["email"],
        email_verified=user["email_verified"],
        sharing_code=user.get("sharing_code"),
        avatar_url=user.get("avatar_url"),
        last_relapse_datetime=user["last_relapse_datetime"],
        created_at=user["created_at"],
        streak_seconds=streak_seconds,
        badge=badge
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/verify-email")
async def verify_email(request: VerifyEmailRequest):
    token_hash = hashlib.sha256(request.token.encode()).hexdigest()
    
    user = await db.users.find_one({
        "verification_token_hash": token_hash,
        "email_verified": False
    }, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    # Check expiry
    expiry = datetime.fromisoformat(user["verification_token_expiry"])
    if datetime.now(timezone.utc) > expiry:
        raise HTTPException(status_code=400, detail="Verification token has expired")
    
    # Verify email and remove token (single-use)
    await db.users.update_one(
        {"username": user["username"]},
        {
            "$set": {"email_verified": True},
            "$unset": {"verification_token_hash": "", "verification_token_expiry": ""}
        }
    )
    
    return {"message": "Email verified successfully"}

@api_router.post("/auth/resend-verification")
async def resend_verification(request: ResendVerificationRequest):
    # Generic message to not reveal if email exists
    generic_message = "If an account exists with that email, a verification link has been sent."
    
    user = await db.users.find_one({"email": request.email, "email_verified": False}, {"_id": 0})
    
    if not user:
        # Don't reveal if email doesn't exist
        return {"message": generic_message}
    
    # Check cooldown (60 seconds)
    if "last_verification_sent" in user:
        last_sent = datetime.fromisoformat(user["last_verification_sent"])
        time_since_last = (datetime.now(timezone.utc) - last_sent).total_seconds()
        if time_since_last < RESEND_COOLDOWN_SECONDS:
            remaining = int(RESEND_COOLDOWN_SECONDS - time_since_last)
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {remaining} seconds before requesting another verification email"
            )
    
    # Generate new token
    token, token_hash, token_expiry = generate_verification_token()
    
    await db.users.update_one(
        {"email": request.email},
        {
            "$set": {
                "verification_token_hash": token_hash,
                "verification_token_expiry": token_expiry.isoformat(),
                "last_verification_sent": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Send email
    await send_verification_email(request.email, token)
    
    return {"message": generic_message}

@api_router.get("/users/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    streak_seconds = calculate_streak(current_user["last_relapse_datetime"])
    badge = get_badge(streak_seconds)
    
    return UserResponse(
        username=current_user["username"],
        email=current_user["email"],
        email_verified=current_user["email_verified"],
        sharing_code=current_user.get("sharing_code"),
        avatar_url=current_user.get("avatar_url"),
        last_relapse_datetime=current_user["last_relapse_datetime"],
        created_at=current_user["created_at"],
        streak_seconds=streak_seconds,
        badge=badge
    )

@api_router.get("/users/{username}", response_model=UserResponse)
async def get_user_profile(username: str):
    # Only show verified users on public profiles
    user = await db.users.find_one({
        "username": username,
        "email_verified": True
    }, {"_id": 0, "password_hash": 0, "verification_token_hash": 0, "verification_token_expiry": 0, "email": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    streak_seconds = calculate_streak(user["last_relapse_datetime"])
    badge = get_badge(streak_seconds)
    
    # Get rank
    all_users = await db.users.find({"email_verified": True}, {"_id": 0, "username": 1, "last_relapse_datetime": 1}).to_list(None)
    users_with_streaks = [(u["username"], calculate_streak(u["last_relapse_datetime"])) for u in all_users]
    users_with_streaks.sort(key=lambda x: x[1], reverse=True)
    rank = next((i + 1 for i, (uname, _) in enumerate(users_with_streaks) if uname == username), None)
    
    return UserResponse(
        username=user["username"],
        email="",
        email_verified=user["email_verified"],
        sharing_code=user.get("sharing_code"),
        avatar_url=user.get("avatar_url"),
        last_relapse_datetime=user["last_relapse_datetime"],
        created_at=user["created_at"],
        streak_seconds=streak_seconds,
        badge=badge,
        rank=rank
    )

@api_router.get("/leaderboard")
async def get_leaderboard():
    """Get leaderboard - ONLY verified users"""
    users = await db.users.find(
        {"email_verified": True},
        {"_id": 0, "username": 1, "avatar_url": 1, "sharing_code": 1, "last_relapse_datetime": 1, "created_at": 1}
    ).to_list(None)
    
    leaderboard = []
    for user in users:
        streak_seconds = calculate_streak(user["last_relapse_datetime"])
        badge = get_badge(streak_seconds)
        leaderboard.append({
            "username": user["username"],
            "avatar_url": user.get("avatar_url"),
            "sharing_code": user.get("sharing_code"),
            "streak_seconds": streak_seconds,
            "badge": badge,
            "created_at": user["created_at"],
            "last_relapse_datetime": user["last_relapse_datetime"]
        })
    
    leaderboard.sort(key=lambda x: x["streak_seconds"], reverse=True)
    
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1
    
    return leaderboard

@api_router.put("/users/profile")
async def update_profile(request: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    update_data = {}
    if request.sharing_code is not None:
        update_data["sharing_code"] = request.sharing_code
    
    # Handle avatar removal
    if request.remove_avatar:
        update_data["avatar_url"] = None
    
    if update_data:
        await db.users.update_one(
            {"username": current_user["username"]},
            {"$set": update_data}
        )
    
    return {"message": "Profile updated successfully"}

@api_router.put("/users/relapse")
async def update_relapse(request: UpdateRelapseRequest, current_user: dict = Depends(get_current_user)):
    """Update relapse time - ensures UTC storage"""
    # Validate and convert to UTC
    try:
        relapse_dt = datetime.fromisoformat(request.last_relapse_datetime.replace('Z', '+00:00'))
        # Ensure UTC
        if relapse_dt.tzinfo is None:
            relapse_dt = relapse_dt.replace(tzinfo=timezone.utc)
        else:
            relapse_dt = relapse_dt.astimezone(timezone.utc)
        
        utc_iso_string = relapse_dt.isoformat()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid datetime format")
    
    await db.users.update_one(
        {"username": current_user["username"]},
        {"$set": {"last_relapse_datetime": utc_iso_string}}
    )
    
    return {"message": "Relapse time updated successfully"}

@api_router.post("/users/upload-avatar")
async def upload_avatar(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Secure avatar upload - JPG and PNG only, max 10MB"""
    
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only JPG and PNG files are allowed")
    
    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG and PNG files are allowed")
    
    # Read and validate file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    # Generate secure random filename
    secure_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / secure_filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(contents)
    
    avatar_url = f"/api/uploads/{secure_filename}"
    
    await db.users.update_one(
        {"username": current_user["username"]},
        {"$set": {"avatar_url": avatar_url}}
    )
    
    return {"avatar_url": avatar_url}

@api_router.get("/uploads/{filename}")
async def get_upload(filename: str):
    from fastapi.responses import FileResponse
    
    # Security: Only allow alphanumeric, dash, underscore, and extension
    import re
    if not re.match(r'^[a-zA-Z0-9_-]+\.(jpg|jpeg|png)$', filename):
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
