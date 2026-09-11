"""Saivie Mama — AI-assisted postpartum care backend."""
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Saivie Mama API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s :: %(message)s")
logger = logging.getLogger("saivie")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def strip_id(doc):
    if doc:
        doc.pop("_id", None)
    return doc


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now_utc():
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ----------------------- Auth -----------------------
class SessionExchangeIn(BaseModel):
    session_id: str


@api.post("/auth/session")
async def auth_session(payload: SessionExchangeIn):
    async with httpx.AsyncClient(timeout=15.0) as hc:
        r = await hc.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": payload.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session id")
    data = r.json()
    email = data.get("email")
    name = data.get("name") or email
    picture = data.get("picture")
    session_token = data.get("session_token")
    if not (email and session_token):
        raise HTTPException(status_code=401, detail="Malformed session data")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture, "last_login_at": now_utc()}},
        )
        user = {**existing, "name": name, "picture": picture}
    else:
        user_id = make_id("usr")
        user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": "mother",
            "onboarded": False,
            "created_at": now_utc(),
            "last_login_at": now_utc(),
        }
        await db.users.insert_one(dict(user))
        user.pop("_id", None)

    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "created_at": now_utc(),
        "expires_at": now_utc() + timedelta(days=7),
    })
    return {"session_token": session_token, "user": user}


@api.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return {"user": user}


@api.post("/auth/logout")
async def auth_logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


# ----------------------- Mother profile -----------------------
class OnboardingIn(BaseModel):
    age: Optional[int] = None
    location: Optional[str] = None
    delivery_date: str
    delivery_type: str
    complications: Optional[List[str]] = []
    baby_name: Optional[str] = None
    baby_birth_weight_g: Optional[int] = None
    feeding_method: Optional[str] = "breastfeeding"
    nicu: Optional[bool] = False
    baseline: Optional[Dict[str, Any]] = {}
    support_system: Optional[str] = "moderate"


def postpartum_day(delivery_date_iso: str) -> int:
    try:
        d = datetime.fromisoformat(delivery_date_iso.replace("Z", "+00:00"))
    except Exception:
        return 0
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return max(0, (now_utc() - d).days)


@api.post("/mothers/onboarding")
async def submit_onboarding(payload: OnboardingIn, user: dict = Depends(get_current_user)):
    profile = payload.dict()
    profile["user_id"] = user["user_id"]
    profile["updated_at"] = now_utc()
    await db.mother_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$set": profile, "$setOnInsert": {"created_at": now_utc()}},
        upsert=True,
    )
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"onboarded": True}})
    return {"ok": True, "profile": profile}


@api.get("/mothers/me")
async def get_me(user: dict = Depends(get_current_user)):
    profile = await db.mother_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    pp_day = postpartum_day(profile["delivery_date"]) if profile else 0
    return {"user": user, "profile": profile, "postpartum_day": pp_day}


# ----------------------- Check-in & wellbeing -----------------------
class CheckInIn(BaseModel):
    mood: int
    anxiety: int
    overwhelm: int
    enjoyment: int
    pain: int
    bleeding: int
    energy: int
    sleep_hours: float
    hydration: int
    symptoms: Optional[List[str]] = []
    notes: Optional[str] = ""


def compute_scores(ci: dict) -> dict:
    mood = ci.get("mood", 5)
    anxiety = ci.get("anxiety", 5)
    overwhelm = ci.get("overwhelm", 5)
    enjoyment = ci.get("enjoyment", 5)
    pain = ci.get("pain", 5)
    bleeding = ci.get("bleeding", 5)
    energy = ci.get("energy", 5)
    sleep_hours = ci.get("sleep_hours", 6)
    hydration = ci.get("hydration", 6)

    mental = round((mood + enjoyment + (10 - anxiety) + (10 - overwhelm)) / 4 * 10)
    physical = round(((10 - pain) + (10 - bleeding) + energy) / 3 * 10)
    sleep = round(min(sleep_hours / 8, 1) * 100)
    nutrition = round(min(hydration / 8, 1) * 100)
    recovery = round((physical + sleep) / 2)
    return {
        "mental": max(0, min(100, mental)),
        "physical": max(0, min(100, physical)),
        "sleep": max(0, min(100, sleep)),
        "nutrition": max(0, min(100, nutrition)),
        "recovery": max(0, min(100, recovery)),
        "support": 70,
    }


def compute_risk_level(scores: dict, ci: dict) -> str:
    symptoms = set(ci.get("symptoms", []))
    if "fever" in symptoms or "heavy_bleeding" in symptoms or "wound_infection" in symptoms:
        return "red"
    if ci.get("mood", 5) <= 3 or ci.get("anxiety", 5) >= 8 or "intrusive_thoughts" in symptoms:
        return "orange"
    if scores["mental"] < 45 or scores["physical"] < 45 or scores["sleep"] < 35:
        return "yellow"
    return "green"


def _alert_reason(scores: dict, ci: dict) -> str:
    if "fever" in ci.get("symptoms", []):
        return "Reported fever — possible infection"
    if "heavy_bleeding" in ci.get("symptoms", []):
        return "Heavy bleeding reported"
    if "intrusive_thoughts" in ci.get("symptoms", []):
        return "Intrusive thoughts — mental health review"
    if ci.get("mood", 5) <= 3:
        return "Low mood — mental wellbeing review"
    if scores["mental"] < 45:
        return "Mental wellbeing score dropped"
    if scores["physical"] < 45:
        return "Physical recovery concern"
    return "Multiple risk signals detected"


@api.post("/checkins")
async def submit_checkin(payload: CheckInIn, user: dict = Depends(get_current_user)):
    profile = await db.mother_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    ci = payload.dict()
    scores = compute_scores(ci)
    risk = compute_risk_level(scores, ci)
    record = {
        "checkin_id": make_id("ci"),
        "user_id": user["user_id"],
        "created_at": now_utc(),
        "postpartum_day": postpartum_day(profile["delivery_date"]) if profile else 0,
        "data": ci,
        "scores": scores,
        "risk": risk,
    }
    await db.check_ins.insert_one(dict(record))
    if risk in ("orange", "red"):
        await db.alerts.insert_one({
            "alert_id": make_id("al"),
            "user_id": user["user_id"],
            "mother_name": user.get("name", "Mother"),
            "created_at": now_utc(),
            "level": "urgent" if risk == "red" else "review",
            "reason": _alert_reason(scores, ci),
            "resolved": False,
        })
    record.pop("_id", None)
    return record


@api.get("/checkins")
async def list_checkins(user: dict = Depends(get_current_user), limit: int = 30):
    items = await db.check_ins.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return {"items": items}


@api.get("/wellbeing/today")
async def wellbeing_today(user: dict = Depends(get_current_user)):
    profile = await db.mother_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    last = await db.check_ins.find_one({"user_id": user["user_id"]}, {"_id": 0}, sort=[("created_at", -1)])
    pp_day = postpartum_day(profile["delivery_date"]) if profile else 0
    if not last:
        scores = {"mental": 65, "physical": 60, "sleep": 55, "nutrition": 60, "recovery": 58, "support": 70}
        risk = "green"
        composite = 62
        last_checkin_at = None
    else:
        scores = last["scores"]
        risk = last["risk"]
        composite = round((scores["mental"] + scores["physical"] + scores["sleep"]) / 3)
        last_checkin_at = last["created_at"]
    return {
        "postpartum_day": pp_day,
        "scores": scores,
        "risk": risk,
        "composite": composite,
        "last_checkin_at": last_checkin_at,
        "delivery_type": profile.get("delivery_type") if profile else None,
    }


@api.get("/wellbeing/trends")
async def wellbeing_trends(user: dict = Depends(get_current_user), days: int = 14):
    items = await db.check_ins.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(days)
    items.reverse()
    return {
        "days": [
            {
                "day": it["postpartum_day"],
                "mental": it["scores"]["mental"],
                "physical": it["scores"]["physical"],
                "sleep": it["scores"]["sleep"],
                "mood": it["data"].get("mood", 5),
            }
            for it in items
        ]
    }


# ----------------------- Care plan -----------------------
def build_care_plan(pp_day: int, delivery_type: str, last_ci: Optional[dict]):
    tasks = [
        {"task_id": "checkin", "title": "2-minute wellbeing check-in", "category": "check_in", "minutes": 2},
    ]
    if delivery_type == "c_section":
        tasks.append({"task_id": "breathing", "title": "Deep breathing", "category": "recovery", "minutes": 3})
        if pp_day >= 7:
            tasks.append({"task_id": "mobility", "title": f"Gentle mobility — day {pp_day}", "category": "recovery", "minutes": 3})
        tasks.append({"task_id": "posture", "title": "Posture reset", "category": "recovery", "minutes": 2})
    else:
        tasks.append({"task_id": "pelvic", "title": "Pelvic-floor exercise", "category": "recovery", "minutes": 3})
        tasks.append({"task_id": "mobility", "title": "Gentle mobility", "category": "recovery", "minutes": 3})
    tasks.append({"task_id": "hydration", "title": "Hydration goal (8 cups)", "category": "nutrition", "minutes": 1})
    tasks.append({"task_id": "bf_lesson", "title": "Today's breastfeeding lesson", "category": "breastfeeding", "minutes": 5})
    tasks.append({"task_id": "relax", "title": "3-minute relaxation", "category": "mental", "minutes": 3})
    if last_ci and last_ci.get("scores", {}).get("mental", 100) < 55:
        tasks.append({"task_id": "mood_boost", "title": "Guided mood-boost meditation", "category": "mental", "minutes": 5})
    return tasks


@api.get("/care-plan/today")
async def care_plan_today(user: dict = Depends(get_current_user)):
    profile = await db.mother_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not profile:
        return {"tasks": [], "postpartum_day": 0, "completed": []}
    pp_day = postpartum_day(profile["delivery_date"])
    last = await db.check_ins.find_one({"user_id": user["user_id"]}, {"_id": 0}, sort=[("created_at", -1)])
    tasks = build_care_plan(pp_day, profile["delivery_type"], last)
    today_str = now_utc().strftime("%Y-%m-%d")
    completions = await db.care_task_completions.find(
        {"user_id": user["user_id"], "day": today_str}, {"_id": 0}
    ).to_list(50)
    return {"postpartum_day": pp_day, "tasks": tasks, "completed": [c["task_id"] for c in completions]}


class TaskCompleteIn(BaseModel):
    task_id: str


@api.post("/care-plan/complete")
async def complete_task(payload: TaskCompleteIn, user: dict = Depends(get_current_user)):
    today_str = now_utc().strftime("%Y-%m-%d")
    await db.care_task_completions.update_one(
        {"user_id": user["user_id"], "day": today_str, "task_id": payload.task_id},
        {"$set": {"completed_at": now_utc()}},
        upsert=True,
    )
    return {"ok": True}


# ----------------------- AI (Claude Sonnet 4.6) -----------------------
class ChatIn(BaseModel):
    message: str
    session_id: Optional[str] = None


SYSTEM_PROMPT = """You are Saivie — a warm, empathetic AI companion supporting a postpartum mother.

RULES YOU FOLLOW STRICTLY:
- You are NOT a doctor. Never diagnose medical conditions.
- Be warm, human, and reassuring — but never falsely reassuring.
- Validate her feelings first, then offer information.
- Use short paragraphs. Sound like a caring friend with clinical knowledge.
- If she reports RED FLAG symptoms (heavy bleeding soaking a pad per hour, fever above 38°C/100.4°F, severe headache with vision changes, chest pain, thoughts of harming herself or the baby, severe pain), gently but firmly tell her to contact her care team or seek urgent medical care.
- For general questions, offer 2-3 practical suggestions grounded in postpartum recovery best practices.
- Keep replies under ~120 words unless she asks for more detail.
- Do not use excessive emojis. One at most, only when it truly adds warmth.
- Do NOT prescribe medications.
"""


def build_context_prompt(profile: Optional[dict], today: dict) -> str:
    if not profile:
        return SYSTEM_PROMPT
    return SYSTEM_PROMPT + f"""

Current context about the mother:
- Postpartum day: {today.get('postpartum_day', 0)}
- Delivery type: {profile.get('delivery_type', 'unknown')}
- Feeding method: {profile.get('feeding_method', 'unknown')}
- Latest wellbeing scores: Mental {today['scores']['mental']}, Physical {today['scores']['physical']}, Sleep {today['scores']['sleep']}
- Current risk level: {today.get('risk', 'green')}

Use this context naturally. Do NOT explicitly list these back to her unless relevant."""


@api.post("/ai/chat")
async def ai_chat(payload: ChatIn, user: dict = Depends(get_current_user)):
    profile = await db.mother_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    today = await wellbeing_today(user)
    session_id = payload.session_id or make_id("sess")
    system_prompt = build_context_prompt(profile, today)

    history = await db.conversations.find(
        {"user_id": user["user_id"], "session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(50)

    transcript = ""
    if history:
        parts = [f"{'Mother' if h['role'] == 'user' else 'Saivie'}: {h['text']}" for h in history[-10:]]
        transcript = "\n\nRecent conversation:\n" + "\n".join(parts) + "\n"

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_prompt + transcript,
    ).with_model("anthropic", "claude-sonnet-4-6")

    try:
        reply = await chat.send_message(UserMessage(text=payload.message))
    except Exception as e:
        logger.exception("LLM error")
        raise HTTPException(status_code=502, detail=f"AI service error: {e}")

    await db.conversations.insert_one({
        "user_id": user["user_id"], "session_id": session_id, "role": "user",
        "text": payload.message, "created_at": now_utc(),
    })
    await db.conversations.insert_one({
        "user_id": user["user_id"], "session_id": session_id, "role": "assistant",
        "text": reply, "created_at": now_utc(),
    })
    return {"session_id": session_id, "reply": reply}


@api.get("/ai/history")
async def ai_history(user: dict = Depends(get_current_user), session_id: Optional[str] = None):
    q = {"user_id": user["user_id"]}
    if session_id:
        q["session_id"] = session_id
    items = await db.conversations.find(q, {"_id": 0}).sort("created_at", 1).to_list(200)
    return {"items": items}


# ----------------------- Feeding log & cluster detection -----------------------
async def get_feeding_pattern(user_id: str) -> dict:
    """Compute feeding pattern from recent feeds. Returns pattern + tighten/loosen recommendation."""
    lookback = now_utc() - timedelta(hours=8)
    feeds = await db.feeds.find(
        {"user_id": user_id, "created_at": {"$gte": lookback}}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)

    day_start = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)
    count_today = await db.feeds.count_documents(
        {"user_id": user_id, "created_at": {"$gte": day_start}}
    )

    last_feed_min_ago = None
    if feeds:
        last_at = feeds[0]["created_at"]
        if last_at.tzinfo is None:
            last_at = last_at.replace(tzinfo=timezone.utc)
        last_feed_min_ago = int((now_utc() - last_at).total_seconds() / 60)

    if len(feeds) < 3:
        return {
            "pattern": "insufficient",
            "avg_gap_min": None,
            "count_today": count_today,
            "last_feed_min_ago": last_feed_min_ago,
            "recommendation": "steady",
            "summary": "Log a few more feeds and we'll spot the pattern.",
        }

    # Compute the last 3 gaps (in minutes)
    gaps: List[float] = []
    for i in range(min(4, len(feeds) - 1)):
        a, b = feeds[i]["created_at"], feeds[i + 1]["created_at"]
        if a.tzinfo is None: a = a.replace(tzinfo=timezone.utc)
        if b.tzinfo is None: b = b.replace(tzinfo=timezone.utc)
        gaps.append((a - b).total_seconds() / 60)
    avg = sum(gaps) / len(gaps)

    if avg < 90:
        return {
            "pattern": "cluster",
            "avg_gap_min": round(avg),
            "count_today": count_today,
            "last_feed_min_ago": last_feed_min_ago,
            "recommendation": "tighten",
            "summary": f"Cluster feeding — every ~{round(avg)} min. Tighten tonight: take short rest windows, hand off settles.",
        }
    if avg > 180:
        return {
            "pattern": "spaced",
            "avg_gap_min": round(avg),
            "count_today": count_today,
            "last_feed_min_ago": last_feed_min_ago,
            "recommendation": "loosen",
            "summary": f"Spaced feeds — around every {round(avg / 60)} h. Tonight can breathe: longer wind-down.",
        }
    return {
        "pattern": "normal",
        "avg_gap_min": round(avg),
        "count_today": count_today,
        "last_feed_min_ago": last_feed_min_ago,
        "recommendation": "steady",
        "summary": f"Steady rhythm — around every {round(avg)} min. Stick with tonight's plan.",
    }


class FeedIn(BaseModel):
    side: Optional[str] = None  # left | right | both | bottle
    duration_min: Optional[int] = None


@api.post("/feeds")
async def log_feed(payload: FeedIn = FeedIn(), user: dict = Depends(get_current_user)):
    feed = {
        "feed_id": make_id("fd"),
        "user_id": user["user_id"],
        "side": payload.side,
        "duration_min": payload.duration_min,
        "created_at": now_utc(),
    }
    await db.feeds.insert_one(dict(feed))
    feed.pop("_id", None)
    pattern = await get_feeding_pattern(user["user_id"])
    return {"feed": feed, "pattern": pattern}


@api.get("/feeds/today")
async def feeds_today(user: dict = Depends(get_current_user)):
    day_start = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)
    feeds = await db.feeds.find(
        {"user_id": user["user_id"], "created_at": {"$gte": day_start}}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    pattern = await get_feeding_pattern(user["user_id"])
    return {"feeds": feeds, "count": len(feeds), "pattern": pattern}


@api.delete("/feeds/{feed_id}")
async def delete_feed(feed_id: str, user: dict = Depends(get_current_user)):
    await db.feeds.delete_one({"feed_id": feed_id, "user_id": user["user_id"]})
    return {"ok": True}


# ----------------------- Diaper log -----------------------
class DiaperIn(BaseModel):
    kind: str = "wet"  # wet | dirty | both


@api.post("/diapers")
async def log_diaper(payload: DiaperIn, user: dict = Depends(get_current_user)):
    d = {
        "diaper_id": make_id("dp"),
        "user_id": user["user_id"],
        "kind": payload.kind,
        "created_at": now_utc(),
    }
    await db.diapers.insert_one(dict(d))
    d.pop("_id", None)
    stats = await _diaper_stats(user["user_id"])
    return {"diaper": d, "stats": stats}


async def _diaper_stats(user_id: str) -> dict:
    day_start = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)
    items = await db.diapers.find(
        {"user_id": user_id, "created_at": {"$gte": day_start}}, {"_id": 0}
    ).to_list(50)
    wet = sum(1 for x in items if x["kind"] in ("wet", "both"))
    dirty = sum(1 for x in items if x["kind"] in ("dirty", "both"))
    last_min_ago = None
    if items:
        latest = max(items, key=lambda x: x["created_at"])
        at = latest["created_at"]
        if at.tzinfo is None: at = at.replace(tzinfo=timezone.utc)
        last_min_ago = int((now_utc() - at).total_seconds() / 60)
    # Hydration hint: 6+ wet diapers/day is a healthy signal for a young baby
    hint = None
    if wet + dirty == 0:
        hint = "Log a few to spot the pattern."
    elif wet < 4 and (now_utc().hour >= 18):
        hint = "Fewer wet diapers than expected today — worth a mention at your next check-in."
    else:
        hint = "Steady output today."
    return {
        "count_today": len(items),
        "wet_today": wet,
        "dirty_today": dirty,
        "last_min_ago": last_min_ago,
        "hint": hint,
    }


@api.get("/diapers/today")
async def diapers_today(user: dict = Depends(get_current_user)):
    day_start = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)
    items = await db.diapers.find(
        {"user_id": user["user_id"], "created_at": {"$gte": day_start}}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    stats = await _diaper_stats(user["user_id"])
    return {"items": items, "stats": stats}


@api.delete("/diapers/{diaper_id}")
async def delete_diaper(diaper_id: str, user: dict = Depends(get_current_user)):
    await db.diapers.delete_one({"diaper_id": diaper_id, "user_id": user["user_id"]})
    return {"ok": True}


# ----------------------- Baby sleep log (start/end) -----------------------
@api.post("/baby-sleep/toggle")
async def baby_sleep_toggle(user: dict = Depends(get_current_user)):
    """One-tap: if there's an active nap, close it. Otherwise start a new one."""
    active = await db.baby_sleeps.find_one(
        {"user_id": user["user_id"], "ended_at": None}, {"_id": 0}
    )
    if active:
        await db.baby_sleeps.update_one(
            {"nap_id": active["nap_id"]},
            {"$set": {"ended_at": now_utc()}},
        )
        active["ended_at"] = now_utc().isoformat()
        stats = await _baby_sleep_stats(user["user_id"])
        return {"action": "ended", "nap": active, "stats": stats}
    nap = {
        "nap_id": make_id("nap"),
        "user_id": user["user_id"],
        "started_at": now_utc(),
        "ended_at": None,
    }
    await db.baby_sleeps.insert_one(dict(nap))
    nap.pop("_id", None)
    stats = await _baby_sleep_stats(user["user_id"])
    return {"action": "started", "nap": nap, "stats": stats}


async def _baby_sleep_stats(user_id: str) -> dict:
    day_start = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)
    naps = await db.baby_sleeps.find(
        {"user_id": user_id, "started_at": {"$gte": day_start}}, {"_id": 0}
    ).sort("started_at", -1).to_list(50)
    total_min = 0
    active_started_at = None
    for n in naps:
        started = n["started_at"]
        if started.tzinfo is None: started = started.replace(tzinfo=timezone.utc)
        ended = n.get("ended_at")
        if ended:
            if ended.tzinfo is None: ended = ended.replace(tzinfo=timezone.utc)
            total_min += int((ended - started).total_seconds() / 60)
        else:
            active_started_at = started
            total_min += int((now_utc() - started).total_seconds() / 60)
    return {
        "naps_today": len(naps),
        "total_min_today": total_min,
        "is_sleeping_now": active_started_at is not None,
        "active_started_at": active_started_at.isoformat() if active_started_at else None,
    }


@api.get("/baby-sleep/today")
async def baby_sleep_today(user: dict = Depends(get_current_user)):
    day_start = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)
    naps = await db.baby_sleeps.find(
        {"user_id": user["user_id"], "started_at": {"$gte": day_start}}, {"_id": 0}
    ).sort("started_at", -1).to_list(50)
    stats = await _baby_sleep_stats(user["user_id"])
    return {"items": naps, "stats": stats}


@api.delete("/baby-sleep/{nap_id}")
async def delete_nap(nap_id: str, user: dict = Depends(get_current_user)):
    await db.baby_sleeps.delete_one({"nap_id": nap_id, "user_id": user["user_id"]})
    return {"ok": True}


# ----------------------- Sleep recovery plan -----------------------
def build_sleep_plan(profile: Optional[dict], last_ci: Optional[dict], pp_day: int) -> dict:
    """Generate tonight's tap-and-go bedtime routine, tailored to today's data."""
    d = (last_ci or {}).get("data", {})
    s = (last_ci or {}).get("scores", {})

    mood = d.get("mood", 6)
    overwhelm = d.get("overwhelm", 4)
    pain = d.get("pain", 3)
    sleep_hours = d.get("sleep_hours", 6)
    mental = s.get("mental", 60)
    sleep_score = s.get("sleep", 60)
    delivery_type = (profile or {}).get("delivery_type", "vaginal")

    steps: List[dict] = []
    reasons: List[str] = []

    # 1. Always start with a wind-down anchor
    steps.append({
        "key": "dim",
        "title": "Dim the lights",
        "minutes": 1,
        "detail": "Turn overhead lights off. Warm lamps or a nightlight only. Screens on night-shift or away.",
        "icon": "lightbulb-outline",
    })

    # 2. Breathing — longer if overwhelmed/anxious
    if overwhelm >= 6 or mental < 55:
        steps.append({
            "key": "breathing",
            "title": "4-7-8 calming breath",
            "minutes": 4,
            "detail": "Inhale through your nose for 4, hold for 7, exhale slowly through your mouth for 8. Repeat 5 rounds. Let today land somewhere outside of you.",
            "icon": "wind",
        })
        reasons.append("today felt heavy")
    else:
        steps.append({
            "key": "breathing",
            "title": "Box breathing",
            "minutes": 3,
            "detail": "In for 4, hold for 4, out for 4, hold for 4. Six gentle rounds.",
            "icon": "wind",
        })

    # 3. Body-focused step based on pain / delivery
    if pain >= 5:
        steps.append({
            "key": "posture",
            "title": "Pain-easing posture reset",
            "minutes": 3,
            "detail": ("Lie on your back with a pillow under your knees. If you had a C-section, keep one hand gently on your lower belly. "
                       "Slow breaths — notice where you're bracing, and soften it."),
            "icon": "human-handsup",
        })
        reasons.append("pain was higher today")
    elif delivery_type == "c_section" and pp_day < 21:
        steps.append({
            "key": "cs_care",
            "title": "C-section wind-down",
            "minutes": 2,
            "detail": "Gentle side-lying, pillow supporting your incision. Two minutes of soft belly breaths — no crunching.",
            "icon": "heart-outline",
        })
    else:
        steps.append({
            "key": "body_scan",
            "title": "Head-to-toe body scan",
            "minutes": 4,
            "detail": "Start at the crown of your head. Slowly notice each area — jaw, shoulders, chest, belly, hips, legs, feet. Not to fix anything. Just to say hello.",
            "icon": "human",
        })

    # 4. Emotional processing / journal
    if mood <= 4 or overwhelm >= 6:
        steps.append({
            "key": "journal",
            "title": "Set the day down",
            "minutes": 3,
            "detail": "One sentence: what was the hardest moment today? One sentence: what got you through it? That's it. Close the notebook.",
            "icon": "notebook-outline",
        })
        reasons.append("mood dipped")
    else:
        steps.append({
            "key": "gratitude",
            "title": "One line of gratitude",
            "minutes": 2,
            "detail": "Write or say one thing that felt good today — however small. A warm cup, baby's smell, a kind message.",
            "icon": "heart-outline",
        })

    # 5. Partner / support handoff
    if overwhelm >= 6 or sleep_hours < 5:
        steps.append({
            "key": "partner",
            "title": "Protected rest window",
            "minutes": 2,
            "detail": ("Ask your partner or support person for one uninterrupted 30-minute rest window tonight — you take the first sleep, they take the next feed or settle. "
                       "This one boundary matters more than any exercise."),
            "icon": "account-heart-outline",
        })
        reasons.append("you slept less than 5 hours")

    # 6. Sleep cue
    steps.append({
        "key": "cue",
        "title": "Bedtime cue",
        "minutes": 1,
        "detail": "One long slow breath in, one long slow breath out. Whisper: 'I did enough today.' Lights out.",
        "icon": "moon-waning-crescent",
    })

    total = sum(st["minutes"] for st in steps)

    # Build reason line
    if reasons:
        reason_text = "Because " + ", and ".join(reasons) + "."
    elif sleep_score < 55:
        reason_text = "Because sleep has been light — tonight is about protecting recovery."
    else:
        reason_text = "A soft, steady routine so tomorrow starts a little easier."

    # Protected rest recommendation
    protected_rest_min = 30
    if sleep_hours < 4:
        protected_rest_min = 45

    return {
        "generated_at": now_utc().isoformat(),
        "postpartum_day": pp_day,
        "summary": f"Tonight's plan · {total} min",
        "reason": reason_text,
        "steps": steps,
        "protected_rest_minutes": protected_rest_min,
        "sleep_score": sleep_score,
        "last_sleep_hours": sleep_hours,
    }


@api.get("/sleep/tonight")
async def sleep_tonight(user: dict = Depends(get_current_user)):
    profile = await db.mother_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    pattern = await get_feeding_pattern(user["user_id"])
    if not profile:
        plan = build_sleep_plan(None, None, 0)
        plan["feeding_context"] = pattern
        return plan
    last = await db.check_ins.find_one({"user_id": user["user_id"]}, {"_id": 0}, sort=[("created_at", -1)])
    pp_day = postpartum_day(profile["delivery_date"])
    plan = build_sleep_plan(profile, last, pp_day)

    # TIGHTEN — cluster feeding: shorter routine, add partner-handoff step, boost rest window
    if pattern["recommendation"] == "tighten":
        # Drop optional gratitude/journal step to shorten (keep breathing + body + cue)
        plan["steps"] = [s for s in plan["steps"] if s["key"] not in ("gratitude", "journal", "body_scan")]
        # Insert cluster-feed partner handoff before the bedtime cue
        cluster_step = {
            "key": "cluster_partner",
            "title": "Partner takes the next 2 settles",
            "minutes": 2,
            "detail": f"Baby has been feeding every ~{pattern['avg_gap_min']} min. Hand off the next two settling windows so you get one longer sleep block.",
            "icon": "account-heart-outline",
        }
        # Insert before the last (bedtime cue) step
        plan["steps"].insert(-1, cluster_step)
        plan["protected_rest_minutes"] = max(plan["protected_rest_minutes"], 45)
        plan["reason"] = f"Cluster feeding detected (~{pattern['avg_gap_min']} min gaps). Tightened tonight — shorter routine, longer rest window."
        plan["adjustment"] = "tightened"
    # LOOSEN — spaced feeds: keep gratitude/body scan, gentle
    elif pattern["recommendation"] == "loosen":
        # If gratitude was dropped in favor of journal (due to mood dip), that's fine — just note the loosening
        plan["reason"] = f"{plan['reason']} Feeds are spaced (~{round(pattern['avg_gap_min']/60,1) if pattern['avg_gap_min'] else '3+'} h) — you can settle in properly."
        plan["adjustment"] = "loosened"
    else:
        plan["adjustment"] = "steady"

    # Recompute summary
    total = sum(st["minutes"] for st in plan["steps"])
    plan["summary"] = f"Tonight's plan · {total} min"
    plan["feeding_context"] = pattern
    return plan


class SleepCompleteIn(BaseModel):
    steps_completed: int
    total_steps: int


@api.post("/sleep/complete")
async def sleep_complete(payload: SleepCompleteIn, user: dict = Depends(get_current_user)):
    await db.sleep_sessions.insert_one({
        "session_id": make_id("slp"),
        "user_id": user["user_id"],
        "steps_completed": payload.steps_completed,
        "total_steps": payload.total_steps,
        "completed_at": now_utc(),
    })
    return {"ok": True}


# ----------------------- Partner support -----------------------
def build_partner_plan(profile: Optional[dict], last_ci: Optional[dict], pp_day: int, mother_first_name: str) -> dict:
    """A sanitized 'how to show up for her tonight' plan. NO clinical data.

    Returns human, actionable asks only — no scores, no risk levels, no symptom names.
    """
    d = (last_ci or {}).get("data", {})
    mood = d.get("mood", 6)
    overwhelm = d.get("overwhelm", 4)
    pain = d.get("pain", 3)
    sleep_hours = d.get("sleep_hours", 6)
    delivery_type = (profile or {}).get("delivery_type", "vaginal")

    asks: List[dict] = []
    tone_lines: List[str] = []

    # 1. Rest ask — always high-signal
    if sleep_hours < 5 or overwhelm >= 6:
        asks.append({
            "key": "rest",
            "title": "Take one full 30-minute rest window",
            "detail": "You cover the next feed or settle. Phone on silent. This is the single most important thing tonight.",
            "icon": "bed-outline",
            "priority": "high",
        })
        tone_lines.append("she needs real rest")
    else:
        asks.append({
            "key": "rest",
            "title": "Protect 20 quiet minutes for her",
            "detail": "A shower, a cup of tea, no interruptions. Small windows add up.",
            "icon": "bed-outline",
            "priority": "medium",
        })

    # 2. Emotional presence
    if mood <= 4 or overwhelm >= 6:
        asks.append({
            "key": "check_in",
            "title": "Ask her how she's really doing",
            "detail": "Sit down. Put your phone away. Ask one question and listen without fixing. That's it.",
            "icon": "chat-outline",
            "priority": "high",
        })
        tone_lines.append("today was heavier than it looked")
    else:
        asks.append({
            "key": "check_in",
            "title": "Notice something small she did today",
            "detail": "Say it out loud. Specifically. Not 'you're doing great' — something you actually saw.",
            "icon": "heart-outline",
            "priority": "medium",
        })

    # 3. Physical help based on pain / delivery
    if pain >= 5 or (delivery_type == "c_section" and pp_day < 21):
        asks.append({
            "key": "lifting",
            "title": "Handle the lifting and reaching",
            "detail": "Groceries, laundry baskets, picking things off the floor, baby's carrier. Anything that pulls at her core.",
            "icon": "package-variant",
            "priority": "high",
        })

    # 4. Household — always
    asks.append({
        "key": "household",
        "title": "Own one full household task tonight",
        "detail": "Dinner, dishes, laundry, tidying — pick one and finish it without being asked or reminded.",
        "icon": "home-outline",
        "priority": "medium",
    })

    # 5. Hydration nudge
    asks.append({
        "key": "hydration",
        "title": "Refill her water bottle twice",
        "detail": "Full glass within arm's reach whenever she's feeding or resting. Warm water if she prefers.",
        "icon": "cup-water",
        "priority": "low",
    })

    # 6. Night feed handoff if sleep is very low
    if sleep_hours < 4:
        asks.append({
            "key": "night_feed",
            "title": "Take one night wake-up",
            "detail": "Whichever one lets her get a longer stretch. You've got this — bottle warmed, gentle rocking, back to sleep.",
            "icon": "moon-waning-crescent",
            "priority": "high",
        })

    # Tone summary
    if tone_lines:
        tone = f"Tonight, {' — and '.join(tone_lines)}. Small acts, not grand ones."
    else:
        tone = "Tonight is a steady one. Show up quietly and consistently."

    return {
        "generated_at": now_utc().isoformat(),
        "mother_first_name": mother_first_name,
        "postpartum_day": pp_day,
        "tone": tone,
        "asks": asks,
    }


class PartnerConsentIn(BaseModel):
    share_tonight_plan: bool


@api.get("/partner/tonight")
async def partner_tonight(user: dict = Depends(get_current_user)):
    """Mother-only preview — this is what will be shared."""
    profile = await db.mother_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not profile:
        return {"asks": [], "tone": "Complete your onboarding first.", "mother_first_name": user.get("name", "")}
    last = await db.check_ins.find_one({"user_id": user["user_id"]}, {"_id": 0}, sort=[("created_at", -1)])
    pp_day = postpartum_day(profile["delivery_date"])
    first = (user.get("name") or "").split(" ")[0]
    return build_partner_plan(profile, last, pp_day, first)


@api.post("/partner/share")
async def partner_share(user: dict = Depends(get_current_user)):
    """Create a signed 24h public token that anyone with the link can view."""
    token = uuid.uuid4().hex + uuid.uuid4().hex[:8]  # ~40 chars, unguessable
    await db.partner_shares.insert_one({
        "token": token,
        "user_id": user["user_id"],
        "created_at": now_utc(),
        "expires_at": now_utc() + timedelta(hours=24),
        "revoked": False,
    })
    # Store consent that mother enabled sharing
    await db.mother_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"partner_share_enabled": True, "partner_share_updated_at": now_utc()}},
    )
    return {"token": token, "expires_in_hours": 24}


@api.post("/partner/revoke")
async def partner_revoke(user: dict = Depends(get_current_user)):
    """Revoke all active partner share links immediately."""
    await db.partner_shares.update_many(
        {"user_id": user["user_id"], "revoked": False},
        {"$set": {"revoked": True, "revoked_at": now_utc()}},
    )
    await db.mother_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"partner_share_enabled": False}},
    )
    return {"ok": True}


@api.get("/partner/view/{token}")
async def partner_view(token: str):
    """PUBLIC — no auth. Returns SANITIZED partner plan only. No scores, no risk, no symptoms."""
    share = await db.partner_shares.find_one({"token": token, "revoked": False}, {"_id": 0})
    if not share:
        raise HTTPException(status_code=404, detail="This link is no longer active.")
    expires_at = share["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now_utc():
        raise HTTPException(status_code=410, detail="This link has expired.")

    user = await db.users.find_one({"user_id": share["user_id"]}, {"_id": 0})
    profile = await db.mother_profiles.find_one({"user_id": share["user_id"]}, {"_id": 0})
    last = await db.check_ins.find_one({"user_id": share["user_id"]}, {"_id": 0}, sort=[("created_at", -1)])
    pp_day = postpartum_day(profile["delivery_date"]) if profile else 0
    first = (user.get("name") if user else "").split(" ")[0] if user else "she"

    plan = build_partner_plan(profile, last, pp_day, first)
    # Strip anything a paranoid future reader might consider clinical
    return {
        "mother_first_name": plan["mother_first_name"],
        "tone": plan["tone"],
        "asks": plan["asks"],
        # NOTE: no postpartum_day, no scores, no risk, no symptoms — clinical data is not exposed.
    }


# ----------------------- Symptom triage -----------------------
class TriageIn(BaseModel):
    symptom: str
    answers: Dict[str, Any]


@api.post("/symptoms/triage")
async def triage(payload: TriageIn, user: dict = Depends(get_current_user)):
    a = payload.answers
    result = {"level": "monitor", "title": "Continue to monitor", "message": "Track how it changes and reach out if it worsens."}

    if payload.symptom == "bleeding":
        heaviness = a.get("heaviness")
        clots = a.get("large_clots", False)
        fever = a.get("fever", False)
        dizzy = a.get("dizzy", False)
        if heaviness == "soaking" or clots or fever or dizzy:
            result = {"level": "urgent", "title": "Seek urgent medical care",
                      "message": "You're describing symptoms that need immediate attention. Please contact your care team or go to the nearest emergency room now."}
        elif heaviness == "moderate":
            result = {"level": "contact", "title": "Contact your care team today",
                      "message": "This may be within normal range but should be reviewed today. Message your doctor or nurse."}
        else:
            result = {"level": "monitor", "title": "This appears within normal range",
                      "message": "Light bleeding this postpartum day is common. Track it and reach out if it increases."}
    elif payload.symptom == "mood":
        overwhelmed = int(a.get("overwhelmed_days", 0))
        thoughts = a.get("intrusive_thoughts", False)
        if thoughts:
            result = {"level": "urgent", "title": "Please talk to someone now",
                      "message": "You are not alone. Please contact your care team, a trusted person, or a mental-health helpline right away."}
        elif overwhelmed >= 5:
            result = {"level": "contact", "title": "Let's involve your care team",
                      "message": "Feeling overwhelmed for several days deserves support. We've flagged this to your care team."}
    elif payload.symptom == "pain":
        severity = int(a.get("severity", 0))
        if severity >= 8:
            result = {"level": "urgent", "title": "Seek urgent care", "message": "Severe pain needs immediate medical review."}
        elif severity >= 5:
            result = {"level": "contact", "title": "Contact your care team", "message": "Pain at this level should be reviewed today."}

    if result["level"] in ("urgent", "contact"):
        await db.alerts.insert_one({
            "alert_id": make_id("al"),
            "user_id": user["user_id"],
            "mother_name": user.get("name", "Mother"),
            "created_at": now_utc(),
            "level": "urgent" if result["level"] == "urgent" else "review",
            "reason": f"Triage: {payload.symptom} — {result['title']}",
            "resolved": False,
        })
    return result


# ----------------------- Alerts -----------------------
@api.get("/alerts")
async def list_alerts(user: dict = Depends(get_current_user)):
    items = await db.alerts.find({"user_id": user["user_id"], "resolved": False}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"items": items}


# ----------------------- Clinician -----------------------
@api.get("/clinician/dashboard")
async def clinician_dashboard(user: dict = Depends(get_current_user)):
    profiles = await db.mother_profiles.find({}, {"_id": 0}).to_list(1000)
    counts = {"stable": 0, "watch": 0, "review": 0, "urgent": 0}
    for p in profiles:
        last = await db.check_ins.find_one({"user_id": p["user_id"]}, {"_id": 0}, sort=[("created_at", -1)])
        risk = last["risk"] if last else "green"
        key = {"green": "stable", "yellow": "watch", "orange": "review", "red": "urgent"}.get(risk, "stable")
        counts[key] += 1
    active_alerts = await db.alerts.count_documents({"resolved": False})
    return {"total_mothers": sum(counts.values()), "counts": counts, "active_alerts": active_alerts}


@api.get("/clinician/mothers")
async def clinician_mothers(user: dict = Depends(get_current_user)):
    profiles = await db.mother_profiles.find({}, {"_id": 0}).to_list(500)
    result = []
    for p in profiles:
        u = await db.users.find_one({"user_id": p["user_id"]}, {"_id": 0}) or {}
        last = await db.check_ins.find_one({"user_id": p["user_id"]}, {"_id": 0}, sort=[("created_at", -1)])
        risk = last["risk"] if last else "green"
        mental = last["scores"]["mental"] if last else 65
        result.append({
            "user_id": p["user_id"],
            "name": u.get("name", "Mother"),
            "picture": u.get("picture"),
            "postpartum_day": postpartum_day(p["delivery_date"]),
            "delivery_type": p["delivery_type"],
            "risk": risk,
            "mental": mental,
            "last_reason": _alert_reason(last["scores"], last["data"]) if last and last["risk"] in ("orange", "red") else None,
        })
    order = {"red": 0, "orange": 1, "yellow": 2, "green": 3}
    result.sort(key=lambda x: order.get(x["risk"], 4))
    return {"items": result}


@api.get("/clinician/mothers/{mother_id}")
async def clinician_mother_detail(mother_id: str, user: dict = Depends(get_current_user)):
    profile = await db.mother_profiles.find_one({"user_id": mother_id}, {"_id": 0})
    if not profile:
        raise HTTPException(404, "Mother not found")
    u = await db.users.find_one({"user_id": mother_id}, {"_id": 0}) or {}
    checkins = await db.check_ins.find({"user_id": mother_id}, {"_id": 0}).sort("created_at", 1).to_list(60)
    alerts = await db.alerts.find({"user_id": mother_id}, {"_id": 0}).sort("created_at", -1).to_list(20)
    notes = await db.clinical_notes.find({"user_id": mother_id}, {"_id": 0}).sort("created_at", -1).to_list(20)

    timeline = [{"day": 0, "type": "delivery", "text": f"Delivery ({profile['delivery_type'].replace('_', ' ')})"}]
    for c in checkins:
        if c["risk"] in ("orange", "red"):
            timeline.append({"day": c["postpartum_day"], "type": "flag", "text": _alert_reason(c["scores"], c["data"])})

    trend = [{"day": c["postpartum_day"], "mental": c["scores"]["mental"], "physical": c["scores"]["physical"], "sleep": c["scores"]["sleep"]} for c in checkins]

    return {
        "user_id": mother_id,
        "name": u.get("name", "Mother"),
        "picture": u.get("picture"),
        "profile": profile,
        "postpartum_day": postpartum_day(profile["delivery_date"]),
        "last_checkin": checkins[-1] if checkins else None,
        "trend": trend,
        "alerts": alerts,
        "notes": notes,
        "timeline": timeline,
    }


class NoteIn(BaseModel):
    text: str


@api.post("/clinician/mothers/{mother_id}/notes")
async def add_note(mother_id: str, payload: NoteIn, user: dict = Depends(get_current_user)):
    note = {
        "note_id": make_id("note"),
        "user_id": mother_id,
        "clinician_id": user["user_id"],
        "clinician_name": user.get("name"),
        "text": payload.text,
        "created_at": now_utc(),
    }
    await db.clinical_notes.insert_one(dict(note))
    note.pop("_id", None)
    return note


@api.post("/clinician/alerts/{alert_id}/acknowledge")
async def ack_alert(alert_id: str, user: dict = Depends(get_current_user)):
    await db.alerts.update_one({"alert_id": alert_id}, {"$set": {"resolved": True, "resolved_at": now_utc(), "resolved_by": user["user_id"]}})
    return {"ok": True}


# ----------------------- Demo seed -----------------------
async def _seed_demo():
    demo_mothers = [
        {"user_id": "usr_demo_ananya", "email": "ananya.demo@saivie.app", "name": "Ananya Kapoor", "delivery_type": "c_section", "days_ago": 18, "mood": 3, "pain": 6, "sleep": 4, "fever": False},
        {"user_id": "usr_demo_priya", "email": "priya.demo@saivie.app", "name": "Priya Iyer", "delivery_type": "vaginal", "days_ago": 9, "mood": 5, "pain": 4, "sleep": 5.5, "fever": False},
        {"user_id": "usr_demo_meera", "email": "meera.demo@saivie.app", "name": "Meera Nair", "delivery_type": "vaginal", "days_ago": 32, "mood": 8, "pain": 2, "sleep": 7, "fever": False},
        {"user_id": "usr_demo_kavya", "email": "kavya.demo@saivie.app", "name": "Kavya Reddy", "delivery_type": "c_section", "days_ago": 5, "mood": 2, "pain": 8, "sleep": 3, "fever": True},
        {"user_id": "usr_demo_sneha", "email": "sneha.demo@saivie.app", "name": "Sneha Bose", "delivery_type": "vaginal", "days_ago": 24, "mood": 7, "pain": 3, "sleep": 6.5, "fever": False},
    ]
    for m in demo_mothers:
        await db.users.update_one({"user_id": m["user_id"]}, {"$set": {
            "user_id": m["user_id"], "email": m["email"], "name": m["name"], "picture": None,
            "role": "mother", "onboarded": True, "created_at": now_utc(),
        }}, upsert=True)
        delivery_date = (now_utc() - timedelta(days=m["days_ago"])).isoformat()
        await db.mother_profiles.update_one({"user_id": m["user_id"]}, {"$set": {
            "user_id": m["user_id"], "delivery_date": delivery_date, "delivery_type": m["delivery_type"],
            "feeding_method": "breastfeeding", "baby_name": "Baby", "support_system": "moderate",
            "complications": [], "created_at": now_utc(),
        }}, upsert=True)

        await db.check_ins.delete_many({"user_id": m["user_id"]})
        loop_len = min(7, m["days_ago"])
        for i in range(loop_len):
            d = now_utc() - timedelta(days=(loop_len - 1 - i))
            mood = max(1, min(10, m["mood"] + (i - 3) // 2))
            pain = max(1, min(10, m["pain"] + (3 - i) // 2))
            # Fever fires for the last 2 days of the seeded window so short-window
            # mothers (like Kavya at day 5) still get red-flagged.
            symptoms = ["fever"] if m["fever"] and i >= max(0, loop_len - 2) else []
            ci_data = {
                "mood": mood, "anxiety": 10 - mood, "overwhelm": 10 - mood,
                "enjoyment": mood, "pain": pain, "bleeding": max(1, pain - 2),
                "energy": max(1, mood - 1), "sleep_hours": m["sleep"],
                "hydration": 6, "symptoms": symptoms, "notes": ""
            }
            scores = compute_scores(ci_data)
            risk = compute_risk_level(scores, ci_data)
            await db.check_ins.insert_one({
                "checkin_id": make_id("ci"), "user_id": m["user_id"], "created_at": d,
                "postpartum_day": m["days_ago"] - (6 - i), "data": ci_data,
                "scores": scores, "risk": risk,
            })

        last = await db.check_ins.find_one({"user_id": m["user_id"]}, {"_id": 0}, sort=[("created_at", -1)])
        if last and last["risk"] in ("orange", "red"):
            existing = await db.alerts.find_one({"user_id": m["user_id"], "resolved": False})
            if not existing:
                await db.alerts.insert_one({
                    "alert_id": make_id("al"), "user_id": m["user_id"], "mother_name": m["name"],
                    "created_at": now_utc(),
                    "level": "urgent" if last["risk"] == "red" else "review",
                    "reason": _alert_reason(last["scores"], last["data"]),
                    "resolved": False,
                })


@api.post("/demo/seed")
async def demo_seed():
    await _seed_demo()
    return {"ok": True}


# ----------------------- Boot -----------------------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.mother_profiles.create_index("user_id", unique=True)
    await db.check_ins.create_index([("user_id", 1), ("created_at", -1)])
    await db.alerts.create_index([("user_id", 1), ("resolved", 1)])
    try:
        count = await db.mother_profiles.count_documents({"user_id": {"$regex": "^usr_demo_"}})
        if count == 0:
            await _seed_demo()
            logger.info("Seeded demo data")
    except Exception:
        logger.exception("Failed to seed demo data")


@app.on_event("shutdown")
async def shutdown():
    client.close()


@app.get("/api/")
async def root():
    return {"service": "Saivie Mama", "status": "ok"}
