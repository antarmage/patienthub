"""Saivie Mama backend regression tests.

Covers: health, auth contract, demo seed, clinician endpoints, mother onboarding,
check-ins, wellbeing, care plan, symptom triage, AI (Claude Sonnet 4.6 via Emergent
LLM key), history, and alerts.
"""
import os
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

# Load backend .env to get MONGO_URL/DB_NAME
load_dotenv(Path("/app/backend/.env"))

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") if os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL"
) else None
if not BASE_URL:
    # Fall back to frontend .env
    load_dotenv(Path("/app/frontend/.env"))
    BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

TEST_USER_ID = "usr_test_backend"
TEST_TOKEN = "tok_test_backend_xyz"
TEST_EMAIL = "TEST_backend@saivie.app"


# ------------- Fixtures -------------
@pytest.fixture(scope="session")
def mongo():
    mc = MongoClient(MONGO_URL)
    yield mc[DB_NAME]
    mc.close()


@pytest.fixture(scope="session", autouse=True)
def synth_session(mongo):
    """Insert a synthetic authenticated session (Google OAuth cannot be automated)."""
    mongo.users.delete_many({"user_id": TEST_USER_ID})
    mongo.user_sessions.delete_many({"session_token": TEST_TOKEN})
    mongo.mother_profiles.delete_many({"user_id": TEST_USER_ID})
    mongo.check_ins.delete_many({"user_id": TEST_USER_ID})
    mongo.alerts.delete_many({"user_id": TEST_USER_ID})
    mongo.conversations.delete_many({"user_id": TEST_USER_ID})
    mongo.care_task_completions.delete_many({"user_id": TEST_USER_ID})
    mongo.clinical_notes.delete_many({"clinician_id": TEST_USER_ID})

    now = datetime.now(timezone.utc)
    mongo.users.insert_one({
        "user_id": TEST_USER_ID, "email": TEST_EMAIL, "name": "Test User",
        "picture": None, "role": "mother", "onboarded": False,
        "created_at": now, "last_login_at": now,
    })
    mongo.user_sessions.insert_one({
        "session_token": TEST_TOKEN, "user_id": TEST_USER_ID,
        "created_at": now, "expires_at": now + timedelta(days=7),
    })
    yield
    # Cleanup
    mongo.users.delete_many({"user_id": TEST_USER_ID})
    mongo.user_sessions.delete_many({"session_token": TEST_TOKEN})
    mongo.mother_profiles.delete_many({"user_id": TEST_USER_ID})
    mongo.check_ins.delete_many({"user_id": TEST_USER_ID})
    mongo.alerts.delete_many({"user_id": TEST_USER_ID})
    mongo.conversations.delete_many({"user_id": TEST_USER_ID})
    mongo.care_task_completions.delete_many({"user_id": TEST_USER_ID})
    mongo.clinical_notes.delete_many({"clinician_id": TEST_USER_ID})


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def auth_client(client):
    client.headers.update({"Authorization": f"Bearer {TEST_TOKEN}"})
    return client


# ------------- Health -------------
class TestHealth:
    def test_root_health(self, client):
        r = client.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        d = r.json()
        assert d["service"] == "Saivie Mama"
        assert d["status"] == "ok"


# ------------- Auth contract -------------
class TestAuthContract:
    def test_session_invalid_id_returns_401(self, client):
        r = client.post(
            f"{BASE_URL}/api/auth/session", json={"session_id": "invalid_bogus_session_id_xyz"}
        )
        assert r.status_code == 401

    def test_protected_without_auth_returns_401(self, client):
        r = client.get(f"{BASE_URL}/api/clinician/dashboard")
        assert r.status_code == 401


# ------------- Demo seed -------------
class TestDemoSeed:
    def test_seed_idempotent(self, client, mongo):
        r1 = client.post(f"{BASE_URL}/api/demo/seed")
        assert r1.status_code == 200
        assert r1.json()["ok"] is True
        # Idempotent: run again
        r2 = client.post(f"{BASE_URL}/api/demo/seed")
        assert r2.status_code == 200
        count = mongo.mother_profiles.count_documents({"user_id": {"$regex": "^usr_demo_"}})
        assert count == 5


# ------------- Clinician -------------
class TestClinician:
    def test_dashboard_with_auth(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/clinician/dashboard")
        assert r.status_code == 200
        d = r.json()
        assert d["total_mothers"] >= 5
        assert "counts" in d
        for k in ("stable", "watch", "review", "urgent"):
            assert k in d["counts"]

    def test_mothers_sorted_by_risk(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/clinician/mothers")
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 5
        order = {"red": 0, "orange": 1, "yellow": 2, "green": 3}
        risks = [order.get(m["risk"], 4) for m in items]
        assert risks == sorted(risks), f"Not sorted by risk: {risks}"
        # Kavya should be red (urgent)
        kavya = next((m for m in items if m["user_id"] == "usr_demo_kavya"), None)
        assert kavya is not None
        assert kavya["risk"] == "red"

    def test_mother_detail_ananya(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/clinician/mothers/usr_demo_ananya")
        assert r.status_code == 200
        d = r.json()
        assert d["profile"] is not None
        assert isinstance(d["trend"], list)
        assert isinstance(d["alerts"], list)
        assert isinstance(d["timeline"], list)
        assert isinstance(d["notes"], list)
        assert len(d["trend"]) > 0
        assert len(d["timeline"]) >= 1  # at least the delivery entry

    def test_add_note_and_verify(self, auth_client, mongo):
        payload = {"text": "TEST_ clinical note from pytest"}
        r = auth_client.post(
            f"{BASE_URL}/api/clinician/mothers/usr_demo_ananya/notes", json=payload
        )
        assert r.status_code == 200
        note = r.json()
        assert note["text"] == payload["text"]
        note_id = note["note_id"]
        # Verify via GET detail
        r2 = auth_client.get(f"{BASE_URL}/api/clinician/mothers/usr_demo_ananya")
        assert r2.status_code == 200
        notes = r2.json()["notes"]
        assert any(n["note_id"] == note_id for n in notes)
        # Cleanup
        mongo.clinical_notes.delete_one({"note_id": note_id})

    def test_acknowledge_alert(self, auth_client, mongo):
        # Ensure Kavya has an active alert (from seed)
        alert = mongo.alerts.find_one({"user_id": "usr_demo_kavya", "resolved": False})
        if not alert:
            pytest.skip("No active alert for kavya to acknowledge")
        aid = alert["alert_id"]
        r = auth_client.post(f"{BASE_URL}/api/clinician/alerts/{aid}/acknowledge")
        assert r.status_code == 200
        assert r.json()["ok"] is True
        # verify persisted
        updated = mongo.alerts.find_one({"alert_id": aid})
        assert updated["resolved"] is True
        # restore to keep other tests happy
        mongo.alerts.update_one({"alert_id": aid}, {"$set": {"resolved": False}})


# ------------- Mother onboarding & profile -------------
class TestMotherFlow:
    def test_onboarding_and_me(self, auth_client, mongo):
        payload = {
            "age": 30, "location": "Bangalore",
            "delivery_date": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(),
            "delivery_type": "vaginal", "complications": [],
            "baby_name": "Baby T", "baby_birth_weight_g": 3200,
            "feeding_method": "breastfeeding", "nicu": False,
            "baseline": {}, "support_system": "moderate",
        }
        r = auth_client.post(f"{BASE_URL}/api/mothers/onboarding", json=payload)
        assert r.status_code == 200
        assert r.json()["ok"] is True
        # Verify user.onboarded=true
        user = mongo.users.find_one({"user_id": TEST_USER_ID})
        assert user["onboarded"] is True

        r2 = auth_client.get(f"{BASE_URL}/api/mothers/me")
        assert r2.status_code == 200
        d = r2.json()
        assert d["profile"] is not None
        assert d["profile"]["delivery_type"] == "vaginal"
        assert d["postpartum_day"] >= 9


# ------------- Check-ins & wellbeing -------------
class TestCheckinsWellbeing:
    def test_benign_checkin_no_alert(self, auth_client, mongo):
        # depends on onboarding having run
        payload = {
            "mood": 7, "anxiety": 3, "overwhelm": 3, "enjoyment": 7,
            "pain": 2, "bleeding": 2, "energy": 7, "sleep_hours": 7.0,
            "hydration": 7, "symptoms": [], "notes": "feeling ok",
        }
        r = auth_client.post(f"{BASE_URL}/api/checkins", json=payload)
        assert r.status_code == 200
        d = r.json()
        assert d["risk"] == "green"
        assert "scores" in d and "mental" in d["scores"]

    def test_red_checkin_creates_alert(self, auth_client, mongo):
        payload = {
            "mood": 2, "anxiety": 9, "overwhelm": 9, "enjoyment": 2,
            "pain": 8, "bleeding": 7, "energy": 2, "sleep_hours": 3.0,
            "hydration": 3, "symptoms": ["fever"], "notes": "not good",
        }
        r = auth_client.post(f"{BASE_URL}/api/checkins", json=payload)
        assert r.status_code == 200
        assert r.json()["risk"] == "red"
        alerts = list(mongo.alerts.find({"user_id": TEST_USER_ID, "resolved": False}))
        assert len(alerts) >= 1

    def test_wellbeing_today(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/wellbeing/today")
        assert r.status_code == 200
        d = r.json()
        for k in ("mental", "physical", "sleep", "nutrition", "recovery", "support"):
            assert k in d["scores"]
        assert d["risk"] in ("green", "yellow", "orange", "red")
        assert isinstance(d["composite"], int)

    def test_wellbeing_trends(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/wellbeing/trends")
        assert r.status_code == 200
        days = r.json()["days"]
        assert isinstance(days, list)
        assert len(days) >= 2
        for day in days:
            assert "mental" in day and "physical" in day and "sleep" in day


# ------------- Care plan -------------
class TestCarePlan:
    def test_care_plan_today(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/care-plan/today")
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["tasks"], list) and len(d["tasks"]) >= 3
        task_ids = [t["task_id"] for t in d["tasks"]]
        assert "checkin" in task_ids

    def test_complete_task(self, auth_client):
        r = auth_client.post(
            f"{BASE_URL}/api/care-plan/complete", json={"task_id": "hydration"}
        )
        assert r.status_code == 200
        assert r.json()["ok"] is True
        # Verify it appears in completed[]
        r2 = auth_client.get(f"{BASE_URL}/api/care-plan/today")
        assert "hydration" in r2.json()["completed"]


# ------------- Triage -------------
class TestTriage:
    def test_bleeding_urgent(self, auth_client):
        r = auth_client.post(
            f"{BASE_URL}/api/symptoms/triage",
            json={"symptom": "bleeding", "answers": {"heaviness": "soaking"}},
        )
        assert r.status_code == 200
        assert r.json()["level"] == "urgent"

    def test_mood_intrusive_thoughts_urgent_creates_alert(self, auth_client, mongo):
        before = mongo.alerts.count_documents({"user_id": TEST_USER_ID})
        r = auth_client.post(
            f"{BASE_URL}/api/symptoms/triage",
            json={"symptom": "mood", "answers": {"intrusive_thoughts": True}},
        )
        assert r.status_code == 200
        assert r.json()["level"] == "urgent"
        after = mongo.alerts.count_documents({"user_id": TEST_USER_ID})
        assert after > before


# ------------- AI chat (Claude Sonnet 4.6 via Emergent LLM key) -------------
class TestAI:
    def test_chat_benign(self, auth_client):
        r = auth_client.post(
            f"{BASE_URL}/api/ai/chat", json={"message": "I feel tired today"},
            timeout=90,
        )
        assert r.status_code == 200, f"AI chat failed: {r.status_code} {r.text[:400]}"
        d = r.json()
        assert "session_id" in d and d["session_id"]
        assert "reply" in d and isinstance(d["reply"], str) and len(d["reply"]) > 5

    def test_chat_history(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/ai/history")
        assert r.status_code == 200
        items = r.json()["items"]
        assert isinstance(items, list) and len(items) >= 2
        roles = {i["role"] for i in items}
        assert "user" in roles and "assistant" in roles


# ------------- Alerts -------------
class TestAlerts:
    def test_list_alerts(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/alerts")
        assert r.status_code == 200
        assert isinstance(r.json()["items"], list)
