from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator
from typing import Optional
import copy

app = FastAPI(title="Advisory Engine", version="1.0.0")


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class SoilProfile(BaseModel):
    type: str
    ph: float
    n: float
    p: float
    k: float


class Location(BaseModel):
    lat: float
    lon: float


class CropAdvisoryRequest(BaseModel):
    soil_profile: SoilProfile
    location: Location
    season: str  # 'kharif', 'rabi', 'zaid'
    crop_history: list[str] = []


class YieldRange(BaseModel):
    min: float
    max: float


class CropRecommendation(BaseModel):
    name: str
    yield_range: YieldRange
    water_requirement: str
    estimated_input_cost: float


class CropAdvisoryResponse(BaseModel):
    crops: list[CropRecommendation]


# ---------------------------------------------------------------------------
# Hardcoded crop database
# Each entry: name, seasons, soil_types, optimal_ph_min, optimal_ph_max,
#             yield_min, yield_max (quintals/acre), water_requirement,
#             estimated_input_cost (INR/acre), base_score
# ---------------------------------------------------------------------------

CROP_DB = [
    {
        "name": "rice",
        "seasons": ["kharif"],
        "soil_types": ["clay", "loamy", "alluvial"],
        "optimal_ph_min": 5.5,
        "optimal_ph_max": 7.0,
        "yield_min": 18.0,
        "yield_max": 28.0,
        "water_requirement": "high",
        "estimated_input_cost": 18000,
    },
    {
        "name": "wheat",
        "seasons": ["rabi"],
        "soil_types": ["loamy", "clay", "alluvial", "sandy loam"],
        "optimal_ph_min": 6.0,
        "optimal_ph_max": 7.5,
        "yield_min": 16.0,
        "yield_max": 24.0,
        "water_requirement": "medium",
        "estimated_input_cost": 14000,
    },
    {
        "name": "maize",
        "seasons": ["kharif", "rabi", "zaid"],
        "soil_types": ["loamy", "sandy loam", "alluvial"],
        "optimal_ph_min": 5.8,
        "optimal_ph_max": 7.0,
        "yield_min": 14.0,
        "yield_max": 22.0,
        "water_requirement": "medium",
        "estimated_input_cost": 12000,
    },
    {
        "name": "cotton",
        "seasons": ["kharif"],
        "soil_types": ["black", "loamy", "alluvial"],
        "optimal_ph_min": 6.0,
        "optimal_ph_max": 8.0,
        "yield_min": 8.0,
        "yield_max": 14.0,
        "water_requirement": "medium",
        "estimated_input_cost": 22000,
    },
    {
        "name": "mustard",
        "seasons": ["rabi"],
        "soil_types": ["loamy", "sandy loam", "alluvial"],
        "optimal_ph_min": 6.0,
        "optimal_ph_max": 7.5,
        "yield_min": 6.0,
        "yield_max": 10.0,
        "water_requirement": "low",
        "estimated_input_cost": 8000,
    },
    {
        "name": "chickpea",
        "seasons": ["rabi"],
        "soil_types": ["loamy", "sandy loam", "black"],
        "optimal_ph_min": 6.0,
        "optimal_ph_max": 8.0,
        "yield_min": 5.0,
        "yield_max": 9.0,
        "water_requirement": "low",
        "estimated_input_cost": 7000,
    },
    {
        "name": "moong",
        "seasons": ["zaid", "kharif"],
        "soil_types": ["loamy", "sandy loam", "alluvial"],
        "optimal_ph_min": 6.0,
        "optimal_ph_max": 7.5,
        "yield_min": 4.0,
        "yield_max": 7.0,
        "water_requirement": "low",
        "estimated_input_cost": 6000,
    },
    {
        "name": "sugarcane",
        "seasons": ["kharif", "zaid"],
        "soil_types": ["loamy", "alluvial", "clay"],
        "optimal_ph_min": 6.0,
        "optimal_ph_max": 7.5,
        "yield_min": 250.0,
        "yield_max": 400.0,
        "water_requirement": "high",
        "estimated_input_cost": 35000,
    },
]


# ---------------------------------------------------------------------------
# Scoring helpers
# ---------------------------------------------------------------------------

def _score_crop(crop: dict, soil_profile: SoilProfile, season: str) -> float:
    """Return a numeric score for a crop given soil and season. Higher is better."""
    score = 0.0

    # Season match
    if season in crop["seasons"]:
        score += 40.0
    else:
        # Crop not suitable for this season — heavily penalise
        score -= 100.0

    # Soil type match (case-insensitive)
    soil_type_lower = soil_profile.type.lower()
    if any(st in soil_type_lower or soil_type_lower in st for st in crop["soil_types"]):
        score += 20.0

    # pH proximity to optimal range
    ph = soil_profile.ph
    ph_min = crop["optimal_ph_min"]
    ph_max = crop["optimal_ph_max"]
    if ph_min <= ph <= ph_max:
        score += 20.0
    else:
        deviation = min(abs(ph - ph_min), abs(ph - ph_max))
        score -= deviation * 5.0

    # Nutrient bonus (simple heuristic: higher NPK → slight bonus)
    score += min((soil_profile.n + soil_profile.p + soil_profile.k) / 300.0, 10.0)

    return score


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/internal/advisory/crops", response_model=CropAdvisoryResponse)
def crop_advisory(payload: CropAdvisoryRequest):
    """Return ranked crop recommendations based on soil profile, location, season, and crop history."""

    soil = payload.soil_profile
    season = payload.season.lower()
    crop_history = [c.lower() for c in payload.crop_history]

    # Score every crop in the database
    scored = []
    for crop in CROP_DB:
        s = _score_crop(crop, soil, season)
        scored.append((s, crop))

    # Sort descending by score
    scored.sort(key=lambda x: x[0], reverse=True)

    # Build recommendation list (take top candidates with positive season score)
    recommendations: list[CropRecommendation] = []
    for _, crop in scored:
        rec = CropRecommendation(
            name=crop["name"],
            yield_range=YieldRange(min=crop["yield_min"], max=crop["yield_max"]),
            water_requirement=crop["water_requirement"],
            estimated_input_cost=crop["estimated_input_cost"],
        )
        recommendations.append(rec)

    # Ensure at least 3 recommendations
    if len(recommendations) < 3:
        raise HTTPException(
            status_code=422,
            detail="Not enough crops available for the given soil profile and season.",
        )

    # Crop rotation: if the most recently grown crop is ranked first, demote it
    if crop_history:
        last_crop = crop_history[-1]
        if recommendations[0].name.lower() == last_crop:
            # Find the next best crop that is NOT the last grown crop
            demoted = recommendations.pop(0)
            # Insert after the first non-matching crop (position 1 at minimum)
            insert_pos = 1
            for i, rec in enumerate(recommendations):
                if rec.name.lower() != last_crop:
                    insert_pos = i + 1
                    break
            recommendations.insert(insert_pos, demoted)

    return CropAdvisoryResponse(crops=recommendations)


# ---------------------------------------------------------------------------
# Fertilizer models
# ---------------------------------------------------------------------------

class FertilizerApplication(BaseModel):
    type: str
    quantity: float
    unit: str
    timing: str


class SoilAmendment(BaseModel):
    type: str
    quantity: float
    unit: str
    reason: str


class FertilizerRequest(BaseModel):
    crop: str
    soil_profile: SoilProfile


class FertilizerResponse(BaseModel):
    schedule: list[FertilizerApplication]
    organic_alternatives: list[FertilizerApplication]
    soil_amendments: list[SoilAmendment]


# ---------------------------------------------------------------------------
# Fertilizer database (kg/acre)
# ---------------------------------------------------------------------------

FERTILIZER_DB: dict[str, dict] = {
    "rice": {
        "optimal_ph_min": 5.5,
        "optimal_ph_max": 7.0,
        "schedule": [
            {"type": "Urea", "quantity": 55.0, "unit": "kg/acre", "timing": "At transplanting (basal)"},
            {"type": "DAP", "quantity": 25.0, "unit": "kg/acre", "timing": "At transplanting (basal)"},
            {"type": "MOP", "quantity": 20.0, "unit": "kg/acre", "timing": "At transplanting (basal)"},
            {"type": "Urea", "quantity": 27.0, "unit": "kg/acre", "timing": "30 days after transplanting"},
            {"type": "Urea", "quantity": 27.0, "unit": "kg/acre", "timing": "55 days after transplanting"},
        ],
        "organic_alternatives": [
            {"type": "FYM (Farmyard Manure)", "quantity": 4.0, "unit": "bags/acre", "timing": "2 weeks before transplanting"},
            {"type": "Vermicompost", "quantity": 2.0, "unit": "bags/acre", "timing": "At transplanting"},
            {"type": "Green Manure (Dhaincha)", "quantity": 8.0, "unit": "kg/acre", "timing": "45 days before transplanting"},
        ],
    },
    "wheat": {
        "optimal_ph_min": 6.0,
        "optimal_ph_max": 7.5,
        "schedule": [
            {"type": "DAP", "quantity": 50.0, "unit": "kg/acre", "timing": "At sowing (basal)"},
            {"type": "MOP", "quantity": 20.0, "unit": "kg/acre", "timing": "At sowing (basal)"},
            {"type": "Urea", "quantity": 55.0, "unit": "kg/acre", "timing": "At first irrigation (21 days after sowing)"},
            {"type": "Urea", "quantity": 27.0, "unit": "kg/acre", "timing": "At second irrigation (42 days after sowing)"},
        ],
        "organic_alternatives": [
            {"type": "FYM (Farmyard Manure)", "quantity": 4.0, "unit": "bags/acre", "timing": "2 weeks before sowing"},
            {"type": "Vermicompost", "quantity": 2.0, "unit": "bags/acre", "timing": "At sowing"},
        ],
    },
    "maize": {
        "optimal_ph_min": 5.8,
        "optimal_ph_max": 7.0,
        "schedule": [
            {"type": "DAP", "quantity": 50.0, "unit": "kg/acre", "timing": "At sowing (basal)"},
            {"type": "MOP", "quantity": 20.0, "unit": "kg/acre", "timing": "At sowing (basal)"},
            {"type": "Urea", "quantity": 45.0, "unit": "kg/acre", "timing": "30 days after sowing"},
            {"type": "Urea", "quantity": 45.0, "unit": "kg/acre", "timing": "50 days after sowing"},
        ],
        "organic_alternatives": [
            {"type": "FYM (Farmyard Manure)", "quantity": 4.0, "unit": "bags/acre", "timing": "2 weeks before sowing"},
            {"type": "Vermicompost", "quantity": 2.0, "unit": "bags/acre", "timing": "At sowing"},
            {"type": "Neem Cake", "quantity": 40.0, "unit": "kg/acre", "timing": "At sowing"},
        ],
    },
    "cotton": {
        "optimal_ph_min": 6.0,
        "optimal_ph_max": 8.0,
        "schedule": [
            {"type": "DAP", "quantity": 50.0, "unit": "kg/acre", "timing": "At sowing (basal)"},
            {"type": "MOP", "quantity": 30.0, "unit": "kg/acre", "timing": "At sowing (basal)"},
            {"type": "Urea", "quantity": 35.0, "unit": "kg/acre", "timing": "30 days after sowing"},
            {"type": "Urea", "quantity": 35.0, "unit": "kg/acre", "timing": "60 days after sowing"},
            {"type": "Urea", "quantity": 18.0, "unit": "kg/acre", "timing": "90 days after sowing"},
        ],
        "organic_alternatives": [
            {"type": "FYM (Farmyard Manure)", "quantity": 5.0, "unit": "bags/acre", "timing": "2 weeks before sowing"},
            {"type": "Vermicompost", "quantity": 2.0, "unit": "bags/acre", "timing": "At sowing"},
            {"type": "Neem Cake", "quantity": 50.0, "unit": "kg/acre", "timing": "At sowing"},
        ],
    },
    "mustard": {
        "optimal_ph_min": 6.0,
        "optimal_ph_max": 7.5,
        "schedule": [
            {"type": "DAP", "quantity": 25.0, "unit": "kg/acre", "timing": "At sowing (basal)"},
            {"type": "MOP", "quantity": 15.0, "unit": "kg/acre", "timing": "At sowing (basal)"},
            {"type": "Urea", "quantity": 27.0, "unit": "kg/acre", "timing": "At sowing (basal)"},
            {"type": "Urea", "quantity": 27.0, "unit": "kg/acre", "timing": "30 days after sowing"},
        ],
        "organic_alternatives": [
            {"type": "FYM (Farmyard Manure)", "quantity": 3.0, "unit": "bags/acre", "timing": "2 weeks before sowing"},
            {"type": "Vermicompost", "quantity": 1.5, "unit": "bags/acre", "timing": "At sowing"},
        ],
    },
}

# Default fertilizer schedule for unknown crops
_DEFAULT_FERTILIZER = {
    "optimal_ph_min": 6.0,
    "optimal_ph_max": 7.5,
    "schedule": [
        {"type": "DAP", "quantity": 25.0, "unit": "kg/acre", "timing": "At sowing (basal)"},
        {"type": "MOP", "quantity": 15.0, "unit": "kg/acre", "timing": "At sowing (basal)"},
        {"type": "Urea", "quantity": 35.0, "unit": "kg/acre", "timing": "30 days after sowing"},
    ],
    "organic_alternatives": [
        {"type": "FYM (Farmyard Manure)", "quantity": 4.0, "unit": "bags/acre", "timing": "2 weeks before sowing"},
        {"type": "Vermicompost", "quantity": 2.0, "unit": "bags/acre", "timing": "At sowing"},
    ],
}


@app.post("/internal/advisory/fertilizer", response_model=FertilizerResponse)
def fertilizer_advisory(payload: FertilizerRequest):
    """Return fertilizer schedule for a given crop and soil profile."""
    soil = payload.soil_profile
    crop_key = payload.crop.lower()

    crop_data = FERTILIZER_DB.get(crop_key, _DEFAULT_FERTILIZER)

    schedule = [FertilizerApplication(**item) for item in crop_data["schedule"]]
    organic_alternatives = [FertilizerApplication(**item) for item in crop_data["organic_alternatives"]]

    # Soil amendment logic based on pH
    soil_amendments: list[SoilAmendment] = []
    ph = soil.ph
    ph_min = crop_data["optimal_ph_min"]
    ph_max = crop_data["optimal_ph_max"]

    if ph < 6.0:
        # Acidic soil — recommend lime
        lime_qty = round((6.0 - ph) * 100.0, 1)  # ~100 kg/acre per pH unit
        soil_amendments.append(SoilAmendment(
            type="Agricultural Lime (CaCO3)",
            quantity=lime_qty,
            unit="kg/acre",
            reason=f"Soil pH is {ph:.1f}, which is below the optimal range ({ph_min}–{ph_max}) for {payload.crop}. "
                   f"Lime application will raise pH towards the optimal range.",
        ))
    elif ph > 7.5:
        # Alkaline soil — recommend sulfur
        sulfur_qty = round((ph - 7.5) * 20.0, 1)  # ~20 kg/acre per pH unit above 7.5
        soil_amendments.append(SoilAmendment(
            type="Elemental Sulfur",
            quantity=sulfur_qty,
            unit="kg/acre",
            reason=f"Soil pH is {ph:.1f}, which is above the optimal range ({ph_min}–{ph_max}) for {payload.crop}. "
                   f"Sulfur application will lower pH towards the optimal range.",
        ))

    return FertilizerResponse(
        schedule=schedule,
        organic_alternatives=organic_alternatives,
        soil_amendments=soil_amendments,
    )
