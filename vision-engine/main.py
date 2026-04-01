from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Vision Engine", version="1.0.0")


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class TreatmentOption(BaseModel):
    name: str
    dosage: str
    method: str


class Treatments(BaseModel):
    chemical: list[TreatmentOption]
    organic: list[TreatmentOption]


class DiagnosisResponse(BaseModel):
    pest_or_disease: str
    confidence: float
    treatments: Treatments
    low_confidence: bool
    extension_officer_referral: bool


# ---------------------------------------------------------------------------
# Pest/disease database (at least 5 entries)
# ---------------------------------------------------------------------------

PEST_DISEASE_DB = [
    {
        "name": "Late Blight",
        "treatments": {
            "chemical": [
                {"name": "Mancozeb", "dosage": "2g/L", "method": "foliar spray"},
                {"name": "Metalaxyl", "dosage": "1.5g/L", "method": "foliar spray"},
            ],
            "organic": [
                {"name": "Neem oil", "dosage": "5ml/L", "method": "foliar spray"},
                {"name": "Copper sulphate", "dosage": "3g/L", "method": "foliar spray"},
            ],
        },
    },
    {
        "name": "Aphid Infestation",
        "treatments": {
            "chemical": [
                {"name": "Imidacloprid", "dosage": "0.5ml/L", "method": "foliar spray"},
                {"name": "Thiamethoxam", "dosage": "0.3g/L", "method": "foliar spray"},
            ],
            "organic": [
                {"name": "Neem oil", "dosage": "5ml/L", "method": "foliar spray"},
                {"name": "Insecticidal soap", "dosage": "10ml/L", "method": "foliar spray"},
            ],
        },
    },
    {
        "name": "Powdery Mildew",
        "treatments": {
            "chemical": [
                {"name": "Propiconazole", "dosage": "1ml/L", "method": "foliar spray"},
                {"name": "Hexaconazole", "dosage": "1ml/L", "method": "foliar spray"},
            ],
            "organic": [
                {"name": "Potassium bicarbonate", "dosage": "5g/L", "method": "foliar spray"},
                {"name": "Neem oil", "dosage": "5ml/L", "method": "foliar spray"},
            ],
        },
    },
    {
        "name": "Stem Borer",
        "treatments": {
            "chemical": [
                {"name": "Chlorpyrifos", "dosage": "2ml/L", "method": "foliar spray"},
                {"name": "Carbofuran", "dosage": "1kg/acre", "method": "soil application"},
            ],
            "organic": [
                {"name": "Trichogramma parasitoid", "dosage": "50,000 eggs/acre", "method": "field release"},
                {"name": "Neem cake", "dosage": "40kg/acre", "method": "soil incorporation"},
            ],
        },
    },
    {
        "name": "Bacterial Leaf Blight",
        "treatments": {
            "chemical": [
                {"name": "Streptomycin sulphate", "dosage": "0.5g/L", "method": "foliar spray"},
                {"name": "Copper oxychloride", "dosage": "3g/L", "method": "foliar spray"},
            ],
            "organic": [
                {"name": "Pseudomonas fluorescens", "dosage": "10g/L", "method": "foliar spray"},
                {"name": "Garlic extract", "dosage": "20ml/L", "method": "foliar spray"},
            ],
        },
    },
    {
        "name": "Whitefly",
        "treatments": {
            "chemical": [
                {"name": "Acetamiprid", "dosage": "0.4g/L", "method": "foliar spray"},
                {"name": "Spiromesifen", "dosage": "1ml/L", "method": "foliar spray"},
            ],
            "organic": [
                {"name": "Yellow sticky traps", "dosage": "10 traps/acre", "method": "field placement"},
                {"name": "Neem oil", "dosage": "5ml/L", "method": "foliar spray"},
            ],
        },
    },
    {
        "name": "Rust Disease",
        "treatments": {
            "chemical": [
                {"name": "Tebuconazole", "dosage": "1ml/L", "method": "foliar spray"},
                {"name": "Propiconazole", "dosage": "1ml/L", "method": "foliar spray"},
            ],
            "organic": [
                {"name": "Sulfur dust", "dosage": "20kg/acre", "method": "dusting"},
                {"name": "Neem oil", "dosage": "5ml/L", "method": "foliar spray"},
            ],
        },
    },
]

LOW_CONFIDENCE_THRESHOLD = 0.60


def _simulate_analysis(image_bytes: bytes) -> tuple[str, float]:
    """
    Deterministically pick a pest/disease and generate a confidence score
    based on the image bytes length.
    """
    size = len(image_bytes)

    # Pick pest/disease deterministically by index
    index = size % len(PEST_DISEASE_DB)
    pest_or_disease = PEST_DISEASE_DB[index]["name"]

    # Generate confidence in [0.5, 0.95] based on size
    # Use a simple formula: map size mod 1000 to [0.5, 0.95]
    confidence = 0.5 + (size % 1000) / 2222.0  # range: [0.5, ~0.95]
    confidence = round(min(confidence, 0.95), 4)

    return pest_or_disease, confidence


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/internal/vision/analyze", response_model=DiagnosisResponse)
async def analyze_image(image: UploadFile = File(...)):
    """Analyze an uploaded crop image and return pest/disease diagnosis."""
    image_bytes = await image.read()

    pest_or_disease_name, confidence = _simulate_analysis(image_bytes)

    # Look up treatments for the detected pest/disease
    db_entry = next(
        (entry for entry in PEST_DISEASE_DB if entry["name"] == pest_or_disease_name),
        PEST_DISEASE_DB[0],
    )

    treatments = Treatments(
        chemical=[TreatmentOption(**t) for t in db_entry["treatments"]["chemical"]],
        organic=[TreatmentOption(**t) for t in db_entry["treatments"]["organic"]],
    )

    low_confidence = confidence < LOW_CONFIDENCE_THRESHOLD

    return DiagnosisResponse(
        pest_or_disease=pest_or_disease_name,
        confidence=confidence,
        treatments=treatments,
        low_confidence=low_confidence,
        extension_officer_referral=low_confidence,
    )
