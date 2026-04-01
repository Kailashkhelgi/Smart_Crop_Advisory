# Design Document: Smart Crop Advisory System

## Overview

The Smart Crop Advisory System is a multilingual, AI-powered platform for small and marginal farmers in India. It delivers location-specific guidance on crop selection, soil health, fertilizer use, pest/disease detection, weather alerts, and market prices. The system supports voice interaction for low-literate users and collects feedback for continuous improvement.

The system is built as two independently deployable services:
- **Backend**: A Node.js/Express RESTful API with OpenAPI documentation, backed by PostgreSQL and Redis
- **Frontend**: A React (web) + React Native (mobile) application consuming the backend API

All sensitive credentials are managed via environment variables and never committed to version control.

### Technology Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js 20 + Express |
| Database | PostgreSQL 15 |
| Cache / session | Redis 7 |
| AI/ML advisory | Python FastAPI microservice (advisory engine) |
| Image analysis | Python FastAPI microservice (vision engine) |
| Speech-to-text | Google Cloud Speech-to-Text API |
| Text-to-speech | Google Cloud Text-to-Speech API |
| Weather | OpenWeatherMap API |
| Market prices | Agmarknet / custom aggregator API |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Frontend web | React 18 + Vite |
| Frontend mobile | React Native (Expo) |
| API documentation | OpenAPI 3.1 (Swagger UI) |
| Containerisation | Docker + Docker Compose |

---

## Architecture

The system follows a layered, service-oriented architecture with clear separation between the client tier, API gateway tier, application services, and external integrations.

```mermaid
graph TD
    subgraph Client Tier
        FW[Frontend Web\nReact + Vite]
        FM[Frontend Mobile\nReact Native]
    end

    subgraph API Gateway Tier
        GW[API Gateway\nExpress + JWT Auth]
    end

    subgraph Application Services
        US[User Service\nRegistration / Profile]
        AS[Advisory Service\nCrop / Fertilizer]
        IS[Image Service\nPest Detection]
        WS[Weather Service\nAlerts]
        MS[Market Price Service]
        VS[Voice Service\nSTT / TTS]
        NS[Notification Service\nFCM]
        FS[Feedback Service\nDashboard]
    end

    subgraph AI/ML Tier
        AE[Advisory Engine\nPython FastAPI]
        VE[Vision Engine\nPython FastAPI]
    end

    subgraph Data Tier
        PG[(PostgreSQL)]
        RD[(Redis Cache)]
    end

    subgraph External APIs
        OWM[OpenWeatherMap]
        AGM[Agmarknet / Market API]
        GCS[Google Cloud Speech]
        GCT[Google Cloud TTS]
        FCM[Firebase FCM]
        OTP[OTP Provider\nTwilio / MSG91]
    end

    FW & FM --> GW
    GW --> US & AS & IS & WS & MS & VS & NS & FS
    AS --> AE
    IS --> VE
    WS --> OWM
    MS --> AGM
    VS --> GCS & GCT
    NS --> FCM
    US --> OTP
    US & AS & IS & WS & MS & VS & FS --> PG
    WS & MS --> RD
```

### Deployment Model

- Backend services run in Docker containers orchestrated via Docker Compose (development) or Kubernetes (production).
- Frontend web is a static build served via CDN or Nginx.
- Frontend mobile is distributed via app stores.
- The Advisory Engine and Vision Engine are separate Python microservices called internally by the Node.js backend — they are never exposed to the public internet.
- All inter-service communication within the backend uses internal Docker network hostnames.

### API Versioning

All public API routes are prefixed with `/api/v1/`. Breaking changes introduce a new version prefix (`/api/v2/`) while the previous version remains available for a documented deprecation window.

### Authentication Flow

1. Farmer submits mobile number → backend sends OTP via SMS provider.
2. Farmer submits OTP → backend verifies, issues a signed JWT (access token, 1 h) and a refresh token (30 days, stored in Redis).
3. All subsequent requests carry the JWT in the `Authorization: Bearer <token>` header.
4. The API Gateway validates the JWT before routing to any protected service.

---

## Components and Interfaces

### API Gateway

Responsibilities: JWT validation, rate limiting, request logging, CORS, routing.

```
POST /api/v1/auth/register          — public
POST /api/v1/auth/verify-otp        — public
POST /api/v1/auth/refresh           — public
POST /api/v1/auth/logout            — protected

GET  /api/v1/farmers/me             — protected
PUT  /api/v1/farmers/me             — protected

POST /api/v1/soil-profiles          — protected
GET  /api/v1/soil-profiles/:id      — protected
PUT  /api/v1/soil-profiles/:id      — protected

GET  /api/v1/advisory/crops         — protected
GET  /api/v1/advisory/fertilizer    — protected

POST /api/v1/images/analyze         — protected (multipart/form-data)

GET  /api/v1/weather                — protected
GET  /api/v1/market-prices          — protected

POST /api/v1/voice/stt              — protected (audio upload)
POST /api/v1/voice/tts              — protected

POST /api/v1/feedback               — protected
GET  /api/v1/dashboard/reports      — protected (admin/officer role)

GET  /api/v1/notifications          — protected
```

All responses follow the envelope:
```json
{
  "status": "success" | "error",
  "data": { ... } | null,
  "error": { "code": "...", "message": "..." } | null
}
```

### User Service

Handles OTP generation/verification, farmer profile CRUD, and JWT issuance.

Key functions:
- `sendOtp(mobileNumber)` — generates a 6-digit OTP, stores in Redis with 10-minute TTL, sends via SMS provider.
- `verifyOtp(mobileNumber, otp)` → `{ accessToken, refreshToken }`
- `createFarmerProfile(farmerId, profileData)` → `FarmerProfile`
- `updateFarmerProfile(farmerId, updates)` → `FarmerProfile`

### Advisory Service

Orchestrates crop and fertilizer recommendations by calling the Advisory Engine microservice.

Key functions:
- `getCropRecommendations(farmerId, plotId)` → `CropRecommendation[]`
- `getFertilizerGuidance(farmerId, plotId, cropId)` → `FertilizerSchedule`

### Advisory Engine (Python FastAPI)

Internal microservice. Accepts structured JSON, returns ranked recommendations.

```
POST /internal/advisory/crops
POST /internal/advisory/fertilizer
```

Input for crop advisory:
```json
{
  "soil_profile": { "type": "...", "ph": 6.5, "n": 120, "p": 40, "k": 80 },
  "location": { "lat": 30.7, "lon": 76.7 },
  "season": "kharif",
  "crop_history": ["wheat", "rice"]
}
```

### Image Service / Vision Engine

The Image Service receives the uploaded file, validates format and size, then forwards to the Vision Engine.

```
POST /internal/vision/analyze
```

Returns:
```json
{
  "pest_or_disease": "Late Blight",
  "confidence": 0.87,
  "treatments": {
    "chemical": [{ "name": "Mancozeb", "dosage": "2g/L", "method": "foliar spray" }],
    "organic": [{ "name": "Neem oil", "dosage": "5ml/L", "method": "foliar spray" }]
  }
}
```

### Weather Service

Polls OpenWeatherMap every 6 hours per active farmer location. Stores results in Redis with a 6-hour TTL. Triggers the Notification Service when thresholds are breached (rainfall > 50 mm / 24 h, frost risk).

### Market Price Service

Polls Agmarknet (or equivalent) every 12 hours per crop in active farmer lists. Stores in Redis. Attaches a staleness flag when data age exceeds 24 hours.

### Voice Service

- STT: Accepts audio blob, calls Google Cloud Speech-to-Text with language code derived from farmer's preferred language (`en-IN`, `hi-IN`, `pa-IN`), returns transcript.
- TTS: Accepts text + language code, calls Google Cloud Text-to-Speech, returns audio blob.

### Notification Service

Wraps Firebase Cloud Messaging. Sends push notifications for weather alerts and other system events. Stores notification history in PostgreSQL.

### Feedback Service

Records advisory sessions and farmer ratings. Anonymises farmer identity (stores a hashed identifier). Aggregates data for the dashboard.

---

## Data Models

### farmers

```sql
CREATE TABLE farmers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_number VARCHAR(15) UNIQUE NOT NULL,
  name          VARCHAR(100),
  preferred_lang VARCHAR(10) NOT NULL DEFAULT 'en',  -- 'en', 'hi', 'pa'
  village       VARCHAR(100),
  district      VARCHAR(100),
  state         VARCHAR(100),
  land_size_acres NUMERIC(8,2),
  fcm_token     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### soil_profiles

```sql
CREATE TABLE soil_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id   UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  plot_name   VARCHAR(100),
  latitude    NUMERIC(9,6),
  longitude   NUMERIC(9,6),
  soil_type   VARCHAR(50),
  ph          NUMERIC(4,2) CHECK (ph >= 0 AND ph <= 14),
  nitrogen    NUMERIC(8,2) CHECK (nitrogen >= 0),
  phosphorus  NUMERIC(8,2) CHECK (phosphorus >= 0),
  potassium   NUMERIC(8,2) CHECK (potassium >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### crop_history

```sql
CREATE TABLE crop_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id       UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  soil_profile_id UUID REFERENCES soil_profiles(id),
  crop_name       VARCHAR(100) NOT NULL,
  season          VARCHAR(20),   -- 'kharif', 'rabi', 'zaid'
  year            SMALLINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### advisory_sessions

```sql
CREATE TABLE advisory_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_hash     VARCHAR(64) NOT NULL,   -- SHA-256 of farmer_id (anonymised)
  session_type    VARCHAR(30) NOT NULL,   -- 'crop', 'fertilizer', 'pest', 'weather', 'market'
  input_params    JSONB NOT NULL,
  recommendation  JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### feedback

```sql
CREATE TABLE feedback (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisory_session_id UUID NOT NULL REFERENCES advisory_sessions(id),
  rating              SMALLINT CHECK (rating BETWEEN 1 AND 5),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### notifications

```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id   UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  type        VARCHAR(30) NOT NULL,   -- 'weather_alert', 'frost_alert', etc.
  payload     JSONB NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Redis Key Patterns

| Key | TTL | Purpose |
|---|---|---|
| `otp:{mobile}` | 10 min | OTP verification |
| `refresh:{farmerId}` | 30 days | Refresh token |
| `weather:{lat}:{lon}` | 6 h | Cached weather data |
| `market:{crop}:{district}` | 12 h | Cached market prices |

### Environment Configuration

`.env.example` (committed to repo):
```
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/smart_crop_advisory

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=30d

# OTP Provider (Twilio / MSG91)
OTP_PROVIDER_API_KEY=your_otp_provider_key_here
OTP_PROVIDER_SENDER_ID=SMCROP

# Weather
OPENWEATHERMAP_API_KEY=your_openweathermap_key_here

# Market Prices
MARKET_PRICE_API_KEY=your_market_price_key_here
MARKET_PRICE_API_URL=https://api.agmarknet.gov.in

# Google Cloud (Speech & TTS)
GOOGLE_CLOUD_API_KEY=your_google_cloud_key_here

# Firebase FCM
FCM_SERVER_KEY=your_fcm_server_key_here

# Advisory Engine (internal)
ADVISORY_ENGINE_URL=http://advisory-engine:8001

# Vision Engine (internal)
VISION_ENGINE_URL=http://vision-engine:8002
```

`.gitignore` must include:
```
.env
*.env
.env.*
!.env.example
```


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Registration creates a complete farmer profile

*For any* valid mobile number and profile data submitted during registration, the farmer profile stored in the database should contain all required fields (name, mobile number, preferred language, village, district, state, land size) exactly as submitted.

**Validates: Requirements 1.2**

---

### Property 2: Profile update round-trip

*For any* existing farmer profile and any valid set of update values, after the update operation the retrieved profile should equal the new values for every updated field.

**Validates: Requirements 1.3**

---

### Property 3: Duplicate mobile number is rejected

*For any* mobile number that is already registered in the system, a second registration attempt with that number should return an error response and leave the existing profile unchanged.

**Validates: Requirements 1.4**

---

### Property 4: Soil profile data integrity round-trip

*For any* valid soil profile data (soil type, pH in [0,14], non-negative NPK values, location), creating a soil profile and then retrieving it should return data equal to what was submitted.

**Validates: Requirements 2.1, 2.4, 2.5**

---

### Property 5: Invalid soil data is rejected with a descriptive error

*For any* soil profile submission where pH is outside [0,14] or any nutrient value is negative, the system should reject the request and return an error response that identifies the specific invalid field.

**Validates: Requirements 2.2, 2.3**

---

### Property 6: Crop recommendations meet minimum count and structure

*For any* complete soil profile and valid farmer location, the advisory engine should return at least 3 crop recommendations, and each recommendation should include expected yield range, water requirement, and estimated input cost.

**Validates: Requirements 3.1, 3.2**

---

### Property 7: Crop rotation is respected in recommendations

*For any* farmer with a non-empty crop history on a plot, the crop recommendations for that plot should not include the most recently grown crop as the top recommendation, reflecting crop rotation principles.

**Validates: Requirements 3.3**

---

### Property 8: Incomplete soil profile blocks advisory

*For any* crop advisory request where the farmer's soil profile has missing required fields, the system should return a prompt to complete the missing fields rather than a recommendation.

**Validates: Requirements 3.4**

---

### Property 9: Fertilizer schedule contains required fields

*For any* valid crop selection and linked soil profile, the fertilizer schedule returned should specify fertilizer type, quantity (in kg/acre or bags/acre), and application timing for each recommended application.

**Validates: Requirements 4.1, 4.5**

---

### Property 10: Soil amendment included when pH is out of optimal range

*For any* soil profile where the pH is outside the optimal range for the selected crop, the fertilizer guidance response should include soil amendment recommendations (e.g., lime or sulfur).

**Validates: Requirements 4.3**

---

### Property 11: Fertilizer request without soil profile returns error

*For any* fertilizer guidance request where the farmer has no linked soil profile, the system should return an error response prompting the farmer to create a soil profile first.

**Validates: Requirements 4.4**

---

### Property 12: Heavy rainfall alert is triggered correctly

*For any* farmer location where the weather forecast contains rainfall exceeding 50 mm within the next 24 hours, the notification service should dispatch an alert to that farmer containing recommended protective actions.

**Validates: Requirements 5.1**

---

### Property 13: Frost alert timing invariant

*For any* frost prediction event, the alert sent to the farmer should have a dispatch timestamp that is at least 12 hours before the predicted frost event time.

**Validates: Requirements 5.2**

---

### Property 14: Weather cache TTL invariant

*For any* active farmer location, the age of the weather data served to that farmer should never exceed 6 hours.

**Validates: Requirements 5.5**

---

### Property 15: Image upload validation

*For any* file upload to the image analysis endpoint, files that are JPEG or PNG and under 10 MB should be accepted, while files exceeding 10 MB or in any other format should be rejected with an error message specifying the accepted formats and size limit.

**Validates: Requirements 6.2, 6.5**

---

### Property 16: Low-confidence diagnosis triggers Extension Officer referral

*For any* image analysis result where the confidence score is below 60%, the response should indicate low confidence and include a recommendation to consult an Extension Officer.

**Validates: Requirements 6.3**

---

### Property 17: Diagnosis response contains both treatment types

*For any* successful pest or disease diagnosis (confidence ≥ 60%), the response should include at least one chemical treatment option and at least one organic treatment option, each with dosage and application method.

**Validates: Requirements 6.4**

---

### Property 18: Market price response meets mandi count and distance requirements

*For any* crop price request from a farmer location, the response should include price data from at least 3 mandis, each within 100 km of the farmer's location, and each entry should include mandi name, distance, and last update timestamp.

**Validates: Requirements 7.1, 7.2**

---

### Property 19: Market price staleness flag

*For any* market price data where the last update timestamp is more than 24 hours ago, the response should include a staleness warning alongside the price data.

**Validates: Requirements 7.3**

---

### Property 20: Market price cache TTL invariant

*For any* crop in a farmer's active crop list, the age of the market price data served should never exceed 12 hours.

**Validates: Requirements 7.5**

---

### Property 21: TTS output language matches farmer preference

*For any* text response and any farmer with a supported preferred language (en, hi, pa), the text-to-speech output should be generated using the language code corresponding to the farmer's preference.

**Validates: Requirements 8.2**

---

### Property 22: Unrecognized voice input triggers retry prompt with text fallback

*For any* audio input that the STT service cannot recognize, the system response should include a prompt asking the farmer to repeat the input and should offer a text input fallback option.

**Validates: Requirements 8.4**

---

### Property 23: Advisory session recorded with all required fields

*For any* advisory request that completes successfully, the stored advisory session record should contain a timestamp, an anonymised farmer identifier (not the raw farmer ID), the input parameters, and the recommendation returned.

**Validates: Requirements 9.2**

---

### Property 24: Feedback stored without PII

*For any* submitted feedback, the stored feedback record should be linked to the advisory session and should not contain any personally identifiable information beyond the anonymised farmer identifier.

**Validates: Requirements 9.3**

---

### Property 25: Dismissed feedback not re-prompted

*For any* advisory session where the farmer has dismissed the feedback prompt, subsequent retrievals of that session should not include an active feedback prompt.

**Validates: Requirements 9.5**

---

### Property 26: Missing environment variable terminates startup with descriptive error

*For any* required environment variable that is absent from the runtime environment, the backend application should log an error message identifying the missing variable by name and should not complete startup.

**Validates: Requirements 10.4**

---

### Property 27: API Gateway enforces authentication on protected endpoints

*For any* API endpoint that is not the registration or OTP verification endpoint, a request without a valid JWT should receive a 401 Unauthorized response and should not reach the underlying service handler.

**Validates: Requirements 11.3**

---

### Property 28: All API responses conform to the envelope structure

*For any* API endpoint and any input (valid or invalid), the HTTP response body should be valid JSON containing exactly the fields `status`, `data`, and `error`, where `status` is either `"success"` or `"error"`.

**Validates: Requirements 11.5**

---

## Error Handling

### Validation Errors (400)

All input validation failures return HTTP 400 with the envelope:
```json
{
  "status": "error",
  "data": null,
  "error": { "code": "VALIDATION_ERROR", "message": "pH must be between 0 and 14", "field": "ph" }
}
```

### Authentication Errors (401 / 403)

- Missing or expired JWT → 401 `UNAUTHORIZED`
- Valid JWT but insufficient role → 403 `FORBIDDEN`

### Not Found (404)

Resource not found (e.g., soil profile ID does not belong to the requesting farmer) → 404 `NOT_FOUND`

### External Service Unavailability

| Service | Behaviour |
|---|---|
| Weather API down | Serve Redis cache; if cache empty, return 503 with `WEATHER_UNAVAILABLE` and last-known timestamp |
| Market Price API down | Serve Redis cache; if cache empty, return 503 with `MARKET_UNAVAILABLE` and last-known timestamp |
| Advisory Engine down | Return 503 `ADVISORY_ENGINE_UNAVAILABLE`; do not serve stale recommendations |
| Vision Engine down | Return 503 `VISION_ENGINE_UNAVAILABLE` |
| OTP provider down | Return 503 `OTP_SERVICE_UNAVAILABLE` |

### File Upload Errors

- Wrong MIME type → 415 `UNSUPPORTED_MEDIA_TYPE` with accepted formats listed
- File too large → 413 `PAYLOAD_TOO_LARGE` with max size stated

### Startup Validation

At application startup, the backend iterates over a list of required environment variable names. If any are missing, it logs:
```
[FATAL] Missing required environment variable: OPENWEATHERMAP_API_KEY
```
and calls `process.exit(1)`.

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:
- Unit tests verify specific examples, integration points, and error conditions.
- Property-based tests verify universal correctness across randomised inputs.

### Unit Tests

Focus areas:
- OTP generation and expiry logic (specific timing examples)
- JWT issuance and validation (specific token examples)
- Weather alert threshold logic (boundary values: exactly 50 mm, 50.1 mm, 49.9 mm)
- Frost alert timing (boundary: exactly 12 h, 11 h 59 min)
- Image MIME type and size validation (boundary: exactly 10 MB, 10 MB + 1 byte)
- Market price staleness flag (boundary: exactly 24 h, 24 h + 1 min)
- API envelope structure for each service endpoint
- Dashboard access control (officer role vs. farmer role)
- `.env.example` file existence and completeness
- OpenAPI spec file validity

### Property-Based Tests

**Library**: [fast-check](https://github.com/dubzzz/fast-check) (TypeScript/Node.js backend), [Hypothesis](https://hypothesis.readthedocs.io/) (Python advisory/vision engines).

**Minimum iterations**: 100 per property test.

**Tag format**: `// Feature: smart-crop-advisory, Property {N}: {property_text}`

Each of the 28 correctness properties above must be implemented as a single property-based test. Key generators needed:

| Generator | Description |
|---|---|
| `arbFarmerProfile` | Random name, valid mobile, language in {en, hi, pa}, location fields |
| `arbSoilProfile` | pH in [0,14], non-negative NPK, soil type from enum |
| `arbInvalidSoilProfile` | pH outside [0,14] OR negative NPK |
| `arbCropHistory` | List of crop names with season and year |
| `arbImageFile` | Random JPEG/PNG bytes under 10 MB, or oversized/wrong-format variants |
| `arbWeatherForecast` | Rainfall amount, frost flag, timestamp |
| `arbMarketPriceData` | Mandi list with prices, distances, timestamps |
| `arbJwt` | Valid and invalid JWT strings |
| `arbApiRequest` | Random endpoint + payload combinations |

**Property test configuration example (fast-check)**:
```typescript
// Feature: smart-crop-advisory, Property 5: Invalid soil data is rejected with a descriptive error
it('rejects invalid soil profiles with descriptive errors', () => {
  fc.assert(
    fc.property(arbInvalidSoilProfile(), async (profile) => {
      const res = await request(app).post('/api/v1/soil-profiles').send(profile);
      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.error.field).toBeDefined();
    }),
    { numRuns: 100 }
  );
});
```

### Integration Tests

- Full registration → OTP → JWT → advisory flow
- Weather polling cycle with Redis cache verification
- Market price polling cycle with staleness flag verification
- Image upload → Vision Engine → response structure

### Test Environment

- PostgreSQL and Redis run in Docker containers during CI.
- Advisory Engine and Vision Engine are mocked in unit/property tests; real services used in integration tests.
- All external APIs (OpenWeatherMap, Agmarknet, Google Cloud, FCM) are mocked using `nock` (Node.js) or `responses` (Python).
