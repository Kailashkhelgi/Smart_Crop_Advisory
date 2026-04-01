"""Smoke tests for POST /internal/advisory/crops"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

BASE = {
    "soil_profile": {"type": "loamy", "ph": 6.5, "n": 120, "p": 40, "k": 80},
    "location": {"lat": 30.7, "lon": 76.7},
    "season": "kharif",
    "crop_history": [],
}


def test_health():
    r = client.get("/health")
    assert r.status_code == 200


def test_returns_at_least_3_crops():
    r = client.post("/internal/advisory/crops", json=BASE)
    assert r.status_code == 200
    assert len(r.json()["crops"]) >= 3


def test_crop_structure():
    r = client.post("/internal/advisory/crops", json=BASE)
    crop = r.json()["crops"][0]
    assert "name" in crop
    assert "yield_range" in crop
    assert "min" in crop["yield_range"] and "max" in crop["yield_range"]
    assert "water_requirement" in crop
    assert "estimated_input_cost" in crop


def test_crop_rotation_demotes_last_crop():
    payload = {**BASE, "crop_history": ["rice"]}
    r = client.post("/internal/advisory/crops", json=payload)
    assert r.status_code == 200
    assert r.json()["crops"][0]["name"].lower() != "rice"


def test_missing_soil_field_returns_422():
    bad = {
        "soil_profile": {"type": "loamy", "ph": 6.5, "n": 120, "p": 40},  # missing k
        "location": {"lat": 30.7, "lon": 76.7},
        "season": "kharif",
        "crop_history": [],
    }
    r = client.post("/internal/advisory/crops", json=bad)
    assert r.status_code == 422


def test_rabi_season_returns_rabi_crops_first():
    payload = {**BASE, "season": "rabi"}
    r = client.post("/internal/advisory/crops", json=payload)
    assert r.status_code == 200
    crops = r.json()["crops"]
    rabi_crops = {"wheat", "mustard", "chickpea"}
    assert crops[0]["name"].lower() in rabi_crops


# ---------------------------------------------------------------------------
# Tests for POST /internal/advisory/fertilizer
# ---------------------------------------------------------------------------

FERTILIZER_BASE = {
    "crop": "wheat",
    "soil_profile": {"type": "loamy", "ph": 6.5, "n": 120, "p": 40, "k": 80},
}


def test_fertilizer_returns_200():
    r = client.post("/internal/advisory/fertilizer", json=FERTILIZER_BASE)
    assert r.status_code == 200


def test_fertilizer_response_structure():
    r = client.post("/internal/advisory/fertilizer", json=FERTILIZER_BASE)
    body = r.json()
    assert "schedule" in body
    assert "organic_alternatives" in body
    assert "soil_amendments" in body


def test_fertilizer_schedule_fields():
    r = client.post("/internal/advisory/fertilizer", json=FERTILIZER_BASE)
    for item in r.json()["schedule"]:
        assert "type" in item
        assert "quantity" in item
        assert "unit" in item
        assert "timing" in item


def test_fertilizer_organic_alternatives_present():
    r = client.post("/internal/advisory/fertilizer", json=FERTILIZER_BASE)
    assert len(r.json()["organic_alternatives"]) > 0


def test_fertilizer_units_are_familiar():
    """All schedule quantities must use kg/acre or bags/acre (Req 4.5)."""
    r = client.post("/internal/advisory/fertilizer", json=FERTILIZER_BASE)
    body = r.json()
    for item in body["schedule"] + body["organic_alternatives"]:
        assert item["unit"] in ("kg/acre", "bags/acre")


def test_fertilizer_missing_soil_profile_returns_422():
    """Req 4.4: missing soil_profile must return 422."""
    r = client.post("/internal/advisory/fertilizer", json={"crop": "wheat"})
    assert r.status_code == 422


def test_fertilizer_acidic_soil_recommends_lime():
    """Req 4.3: pH < 6.0 should trigger lime amendment."""
    payload = {
        "crop": "wheat",
        "soil_profile": {"type": "loamy", "ph": 5.2, "n": 100, "p": 30, "k": 60},
    }
    r = client.post("/internal/advisory/fertilizer", json=payload)
    assert r.status_code == 200
    amendments = r.json()["soil_amendments"]
    assert len(amendments) > 0
    assert any("Lime" in a["type"] or "lime" in a["type"].lower() for a in amendments)


def test_fertilizer_alkaline_soil_recommends_sulfur():
    """Req 4.3: pH > 7.5 should trigger sulfur amendment."""
    payload = {
        "crop": "wheat",
        "soil_profile": {"type": "loamy", "ph": 8.2, "n": 100, "p": 30, "k": 60},
    }
    r = client.post("/internal/advisory/fertilizer", json=payload)
    assert r.status_code == 200
    amendments = r.json()["soil_amendments"]
    assert len(amendments) > 0
    assert any("Sulfur" in a["type"] or "sulfur" in a["type"].lower() for a in amendments)


def test_fertilizer_optimal_ph_no_amendments():
    """No soil amendments when pH is within optimal range."""
    payload = {
        "crop": "wheat",
        "soil_profile": {"type": "loamy", "ph": 6.8, "n": 100, "p": 30, "k": 60},
    }
    r = client.post("/internal/advisory/fertilizer", json=payload)
    assert r.status_code == 200
    assert r.json()["soil_amendments"] == []


def test_fertilizer_all_5_crops():
    """All 5 required crops return a non-empty schedule."""
    for crop in ["rice", "wheat", "maize", "cotton", "mustard"]:
        payload = {
            "crop": crop,
            "soil_profile": {"type": "loamy", "ph": 6.5, "n": 100, "p": 30, "k": 60},
        }
        r = client.post("/internal/advisory/fertilizer", json=payload)
        assert r.status_code == 200, f"Failed for crop: {crop}"
        assert len(r.json()["schedule"]) > 0, f"Empty schedule for crop: {crop}"
