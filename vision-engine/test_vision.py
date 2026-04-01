"""Smoke tests for the Vision Engine POST /internal/vision/analyze endpoint."""
import io
import pytest
from fastapi.testclient import TestClient

from main import app, PEST_DISEASE_DB, LOW_CONFIDENCE_THRESHOLD, _simulate_analysis

client = TestClient(app)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# Endpoint smoke tests
# ---------------------------------------------------------------------------

def _post_image(data: bytes, filename: str = "crop.jpg") -> dict:
    response = client.post(
        "/internal/vision/analyze",
        files={"image": (filename, io.BytesIO(data), "image/jpeg")},
    )
    assert response.status_code == 200
    return response.json()


def test_analyze_returns_required_fields():
    """Response must contain all required top-level fields."""
    body = _post_image(b"fake-image-data-1234")
    assert "pest_or_disease" in body
    assert "confidence" in body
    assert "treatments" in body
    assert "low_confidence" in body
    assert "extension_officer_referral" in body


def test_analyze_treatments_structure():
    """Treatments must contain chemical and organic lists, each with name/dosage/method."""
    body = _post_image(b"fake-image-data-5678")
    treatments = body["treatments"]
    assert "chemical" in treatments
    assert "organic" in treatments
    for item in treatments["chemical"] + treatments["organic"]:
        assert "name" in item
        assert "dosage" in item
        assert "method" in item


def test_analyze_confidence_range():
    """Confidence must be between 0.0 and 1.0."""
    body = _post_image(b"some image bytes here")
    assert 0.0 <= body["confidence"] <= 1.0


def test_low_confidence_flag_consistency():
    """low_confidence and extension_officer_referral must both be True when confidence < 0.60."""
    body = _post_image(b"x" * 100)  # small payload — deterministic result
    if body["confidence"] < LOW_CONFIDENCE_THRESHOLD:
        assert body["low_confidence"] is True
        assert body["extension_officer_referral"] is True
    else:
        assert body["low_confidence"] is False
        assert body["extension_officer_referral"] is False


def test_low_confidence_flags_true_when_confidence_below_threshold():
    """Force a low-confidence result by finding an image size that produces confidence < 0.60."""
    # confidence = 0.5 + (size % 1000) / 2222.0
    # For confidence < 0.60 we need (size % 1000) / 2222.0 < 0.10 → size % 1000 < 222
    # Use size = 100 → confidence = 0.5 + 100/2222 ≈ 0.545
    data = b"a" * 100
    body = _post_image(data)
    assert body["confidence"] < LOW_CONFIDENCE_THRESHOLD
    assert body["low_confidence"] is True
    assert body["extension_officer_referral"] is True


def test_high_confidence_flags_false():
    """Force a high-confidence result: size % 1000 = 999 → confidence ≈ 0.95."""
    # size % 1000 == 999 → use size = 999
    data = b"b" * 999
    body = _post_image(data)
    assert body["confidence"] >= LOW_CONFIDENCE_THRESHOLD
    assert body["low_confidence"] is False
    assert body["extension_officer_referral"] is False


def test_pest_or_disease_is_known():
    """Detected pest/disease must be from the hardcoded database."""
    known_names = {entry["name"] for entry in PEST_DISEASE_DB}
    body = _post_image(b"test image content")
    assert body["pest_or_disease"] in known_names


def test_deterministic_result_for_same_input():
    """Same image bytes must always produce the same diagnosis."""
    data = b"deterministic-test-image"
    body1 = _post_image(data)
    body2 = _post_image(data)
    assert body1["pest_or_disease"] == body2["pest_or_disease"]
    assert body1["confidence"] == body2["confidence"]


def test_missing_image_field_returns_422():
    """Request without the image field must return 422 Unprocessable Entity."""
    response = client.post("/internal/vision/analyze")
    assert response.status_code == 422


def test_treatments_non_empty():
    """Both chemical and organic treatment lists must be non-empty."""
    body = _post_image(b"crop disease image bytes")
    assert len(body["treatments"]["chemical"]) > 0
    assert len(body["treatments"]["organic"]) > 0


# ---------------------------------------------------------------------------
# Unit tests for simulation helper
# ---------------------------------------------------------------------------

def test_simulate_analysis_index_wraps():
    """Index into PEST_DISEASE_DB wraps correctly for any image size."""
    n = len(PEST_DISEASE_DB)
    for size in range(0, n * 3):
        data = b"x" * size
        name, _ = _simulate_analysis(data)
        assert name == PEST_DISEASE_DB[size % n]["name"]


def test_simulate_analysis_confidence_bounds():
    """Confidence is always within [0.5, 0.95]."""
    for size in [0, 1, 100, 500, 999, 1000, 5000, 10000]:
        _, confidence = _simulate_analysis(b"x" * size)
        assert 0.5 <= confidence <= 0.95
