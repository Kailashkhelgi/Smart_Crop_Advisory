# Implementation Plan: Smart Crop Advisory System

## Overview

Incremental implementation of the Smart Crop Advisory System: project scaffolding → database + auth → advisory services → integrations → frontend → wiring. Each task builds on the previous and ends with integrated, testable code.

## Tasks

- [x] 1. Project scaffolding and environment setup
  - Create monorepo directory structure: `backend/`, `frontend-web/`, `frontend-mobile/`, `advisory-engine/`, `vision-engine/`
  - Create `backend/.env.example` with all required variable names and placeholder values (PORT, DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN, OTP_PROVIDER_API_KEY, OTP_PROVIDER_SENDER_ID, OPENWEATHERMAP_API_KEY, MARKET_PRICE_API_KEY, MARKET_PRICE_API_URL, GOOGLE_CLOUD_API_KEY, FCM_SERVER_KEY, ADVISORY_ENGINE_URL, VISION_ENGINE_URL)
  - Create root `.gitignore` excluding `.env`, `*.env`, `.env.*` but not `.env.example`
  - Create `docker-compose.yml` with services: `backend`, `advisory-engine`, `vision-engine`, `postgres`, `redis`
  - Initialise `backend/` as a Node.js 20 + Express project with TypeScript, Jest, fast-check, and nock
  - Initialise `advisory-engine/` and `vision-engine/` as Python FastAPI projects with Hypothesis and pytest
  - Initialise `frontend-web/` as a React 18 + Vite project
  - Initialise `frontend-mobile/` as a React Native Expo project
  - _Requirements: 10.1, 10.2, 10.3, 11.1_

- [x] 2. Backend startup validation and configuration
  - [x] 2.1 Implement env-var startup check in `backend/src/config.ts`
    - Iterate over a list of all required env var names; log `[FATAL] Missing required environment variable: <NAME>` and call `process.exit(1)` for any missing variable
    - Export typed config object for use throughout the backend
    - _Requirements: 10.1, 10.4_

  - [ ]* 2.2 Write property test for startup validation (Property 26)
    - **Property 26: Missing environment variable terminates startup with descriptive error**
    - **Validates: Requirements 10.4**
    - Tag: `// Feature: smart-crop-advisory, Property 26: Missing environment variable terminates startup with descriptive error`

- [x] 3. Database schema and migrations
  - [x] 3.1 Create PostgreSQL migration files for all tables
    - `farmers`, `soil_profiles`, `crop_history`, `advisory_sessions`, `feedback`, `notifications` with all constraints, CHECK clauses, and foreign keys as specified in the design
    - _Requirements: 1.2, 2.1, 2.5, 9.2, 9.3_

  - [x] 3.2 Set up database connection pool in `backend/src/db.ts` using `pg` or `drizzle-orm`
    - _Requirements: 10.1_

- [x] 4. API response envelope middleware
  - [x] 4.1 Implement Express response helper in `backend/src/middleware/envelope.ts`
    - All responses must include exactly `status`, `data`, and `error` fields
    - Implement `sendSuccess(res, data)` and `sendError(res, statusCode, code, message, field?)` helpers
    - _Requirements: 11.5_

  - [ ]* 4.2 Write property test for envelope structure (Property 28)
    - **Property 28: All API responses conform to the envelope structure**
    - **Validates: Requirements 11.5**
    - Use `arbApiRequest` generator to hit all registered routes with random valid and invalid payloads; assert every response body has `status`, `data`, and `error`
    - Tag: `// Feature: smart-crop-advisory, Property 28: All API responses conform to the envelope structure`

- [x] 5. Authentication — OTP registration and JWT issuance
  - [x] 5.1 Implement `UserService` in `backend/src/services/userService.ts`
    - `sendOtp(mobileNumber)`: generate 6-digit OTP, store in Redis at `otp:{mobile}` with 10-min TTL, send via OTP provider (mocked in tests)
    - `verifyOtp(mobileNumber, otp)`: validate against Redis, issue signed JWT (1 h) and refresh token (30 days stored at `refresh:{farmerId}`)
    - `createFarmerProfile(farmerId, profileData)` and `updateFarmerProfile(farmerId, updates)`
    - Reject duplicate mobile numbers with `DUPLICATE_MOBILE` error
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 5.2 Implement auth routes in `backend/src/routes/auth.ts`
    - `POST /api/v1/auth/register`, `POST /api/v1/auth/verify-otp`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`
    - _Requirements: 1.1, 11.1_

  - [ ]* 5.3 Write property test for registration profile completeness (Property 1)
    - **Property 1: Registration creates a complete farmer profile**
    - **Validates: Requirements 1.2**
    - Use `arbFarmerProfile` generator; assert all required fields present in DB after registration
    - Tag: `// Feature: smart-crop-advisory, Property 1: Registration creates a complete farmer profile`

  - [ ]* 5.4 Write property test for profile update round-trip (Property 2)
    - **Property 2: Profile update round-trip**
    - **Validates: Requirements 1.3**
    - Tag: `// Feature: smart-crop-advisory, Property 2: Profile update round-trip`

  - [ ]* 5.5 Write property test for duplicate mobile rejection (Property 3)
    - **Property 3: Duplicate mobile number is rejected**
    - **Validates: Requirements 1.4**
    - Tag: `// Feature: smart-crop-advisory, Property 3: Duplicate mobile number is rejected`

- [x] 6. API Gateway — JWT middleware and route protection
  - [x] 6.1 Implement JWT validation middleware in `backend/src/middleware/auth.ts`
    - Validate `Authorization: Bearer <token>` header; return 401 `UNAUTHORIZED` for missing or invalid tokens
    - Apply middleware to all routes except `POST /api/v1/auth/register` and `POST /api/v1/auth/verify-otp`
    - _Requirements: 11.3_

  - [ ]* 6.2 Write property test for API Gateway authentication enforcement (Property 27)
    - **Property 27: API Gateway enforces authentication on protected endpoints**
    - **Validates: Requirements 11.3**
    - Use `arbJwt` generator (valid and invalid tokens); assert protected endpoints return 401 without valid JWT
    - Tag: `// Feature: smart-crop-advisory, Property 27: API Gateway enforces authentication on protected endpoints`

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Soil profile service
  - [x] 8.1 Implement `SoilProfileService` in `backend/src/services/soilProfileService.ts`
    - `createSoilProfile(farmerId, data)`: validate pH in [0,14] and NPK ≥ 0; return 400 with field-level error on failure; persist and return profile
    - `updateSoilProfile(profileId, farmerId, data)`: same validation; persist updated values
    - `getSoilProfile(profileId, farmerId)`: return 404 if not found or not owned by farmer
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 8.2 Implement soil profile routes in `backend/src/routes/soilProfiles.ts`
    - `POST /api/v1/soil-profiles`, `GET /api/v1/soil-profiles/:id`, `PUT /api/v1/soil-profiles/:id`
    - _Requirements: 2.1, 11.1_

  - [ ]* 8.3 Write property test for soil profile data integrity round-trip (Property 4)
    - **Property 4: Soil profile data integrity round-trip**
    - **Validates: Requirements 2.1, 2.4, 2.5**
    - Use `arbSoilProfile` generator; create then retrieve; assert equality
    - Tag: `// Feature: smart-crop-advisory, Property 4: Soil profile data integrity round-trip`

  - [ ]* 8.4 Write property test for invalid soil data rejection (Property 5)
    - **Property 5: Invalid soil data is rejected with a descriptive error**
    - **Validates: Requirements 2.2, 2.3**
    - Use `arbInvalidSoilProfile` generator; assert 400 response with `error.field` defined
    - Tag: `// Feature: smart-crop-advisory, Property 5: Invalid soil data is rejected with a descriptive error`

- [x] 9. Advisory Engine microservice (Python FastAPI)
  - [x] 9.1 Implement `POST /internal/advisory/crops` endpoint in `advisory-engine/`
    - Accept `soil_profile`, `location`, `season`, `crop_history`; return ranked list of ≥ 3 crops each with yield range, water requirement, and estimated input cost
    - Apply crop rotation logic: do not rank the most recently grown crop first
    - Return 422 if soil profile has missing required fields
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 9.2 Implement `POST /internal/advisory/fertilizer` endpoint in `advisory-engine/`
    - Accept crop selection and soil profile; return fertilizer schedule with type, quantity (kg/acre or bags/acre), and timing
    - Include organic alternatives where applicable
    - Include soil amendment recommendations when pH is outside optimal range for the crop
    - Return 422 if no soil profile is linked
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 9.3 Write property test for crop recommendation count and structure (Property 6)
    - **Property 6: Crop recommendations meet minimum count and structure**
    - **Validates: Requirements 3.1, 3.2**
    - Use Hypothesis `arbSoilProfile` and `arbLocation` strategies; assert ≥ 3 crops with required fields
    - Tag: `# Feature: smart-crop-advisory, Property 6: Crop recommendations meet minimum count and structure`

  - [ ]* 9.4 Write property test for crop rotation (Property 7)
    - **Property 7: Crop rotation is respected in recommendations**
    - **Validates: Requirements 3.3**
    - Tag: `# Feature: smart-crop-advisory, Property 7: Crop rotation is respected in recommendations`

  - [ ]* 9.5 Write property test for incomplete soil profile blocking advisory (Property 8)
    - **Property 8: Incomplete soil profile blocks advisory**
    - **Validates: Requirements 3.4**
    - Tag: `# Feature: smart-crop-advisory, Property 8: Incomplete soil profile blocks advisory`

  - [ ]* 9.6 Write property test for fertilizer schedule required fields (Property 9)
    - **Property 9: Fertilizer schedule contains required fields**
    - **Validates: Requirements 4.1, 4.5**
    - Tag: `# Feature: smart-crop-advisory, Property 9: Fertilizer schedule contains required fields`

  - [ ]* 9.7 Write property test for soil amendment on out-of-range pH (Property 10)
    - **Property 10: Soil amendment included when pH is out of optimal range**
    - **Validates: Requirements 4.3**
    - Tag: `# Feature: smart-crop-advisory, Property 10: Soil amendment included when pH is out of optimal range`

  - [ ]* 9.8 Write property test for fertilizer request without soil profile (Property 11)
    - **Property 11: Fertilizer request without soil profile returns error**
    - **Validates: Requirements 4.4**
    - Tag: `# Feature: smart-crop-advisory, Property 11: Fertilizer request without soil profile returns error`

- [x] 10. Advisory Service — Node.js orchestration layer
  - [x] 10.1 Implement `AdvisoryService` in `backend/src/services/advisoryService.ts`
    - `getCropRecommendations(farmerId, plotId)`: fetch soil profile and crop history from DB, call Advisory Engine, return results; return prompt-to-complete error if soil profile is incomplete
    - `getFertilizerGuidance(farmerId, plotId, cropId)`: fetch soil profile, call Advisory Engine; return error if no soil profile
    - Handle Advisory Engine 503 by returning `ADVISORY_ENGINE_UNAVAILABLE`
    - _Requirements: 3.1, 3.4, 4.1, 4.4_

  - [x] 10.2 Implement advisory routes in `backend/src/routes/advisory.ts`
    - `GET /api/v1/advisory/crops`, `GET /api/v1/advisory/fertilizer`
    - _Requirements: 11.1_

- [x] 11. Vision Engine microservice (Python FastAPI)
  - [x] 11.1 Implement `POST /internal/vision/analyze` endpoint in `vision-engine/`
    - Accept image bytes; return `pest_or_disease`, `confidence`, `treatments` (chemical + organic each with dosage and method)
    - If confidence < 0.60, include low-confidence flag and Extension Officer referral in response
    - _Requirements: 6.1, 6.3, 6.4_

  - [ ]* 11.2 Write property test for low-confidence referral (Property 16)
    - **Property 16: Low-confidence diagnosis triggers Extension Officer referral**
    - **Validates: Requirements 6.3**
    - Tag: `# Feature: smart-crop-advisory, Property 16: Low-confidence diagnosis triggers Extension Officer referral`

  - [ ]* 11.3 Write property test for diagnosis treatment completeness (Property 17)
    - **Property 17: Diagnosis response contains both treatment types**
    - **Validates: Requirements 6.4**
    - Tag: `# Feature: smart-crop-advisory, Property 17: Diagnosis response contains both treatment types`

- [x] 12. Image Service — file validation and Vision Engine proxy
  - [x] 12.1 Implement `ImageService` in `backend/src/services/imageService.ts`
    - Validate MIME type (JPEG/PNG only → 415) and file size (≤ 10 MB → 413 if exceeded)
    - Forward valid images to Vision Engine; return structured response within 10 s
    - Handle Vision Engine 503 with `VISION_ENGINE_UNAVAILABLE`
    - _Requirements: 6.1, 6.2, 6.5_

  - [x] 12.2 Implement image route in `backend/src/routes/images.ts`
    - `POST /api/v1/images/analyze` (multipart/form-data)
    - _Requirements: 6.1, 11.1_

  - [ ]* 12.3 Write property test for image upload validation (Property 15)
    - **Property 15: Image upload validation**
    - **Validates: Requirements 6.2, 6.5**
    - Use `arbImageFile` generator (valid JPEG/PNG under 10 MB, oversized, wrong format); assert correct accept/reject behaviour
    - Tag: `// Feature: smart-crop-advisory, Property 15: Image upload validation`

- [x] 13. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Weather Service
  - [x] 14.1 Implement `WeatherService` in `backend/src/services/weatherService.ts`
    - `fetchAndCacheWeather(lat, lon)`: call OpenWeatherMap, store in Redis at `weather:{lat}:{lon}` with 6-h TTL
    - `getWeather(lat, lon)`: return from Redis cache; if cache miss, fetch; if API down and cache empty, return 503 with `WEATHER_UNAVAILABLE` and last-known timestamp
    - Schedule polling every 6 hours for all active farmer locations
    - Trigger `NotificationService.sendWeatherAlert` when rainfall > 50 mm/24 h or frost risk detected
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 14.2 Implement weather route in `backend/src/routes/weather.ts`
    - `GET /api/v1/weather`
    - _Requirements: 11.1_

  - [ ]* 14.3 Write property test for heavy rainfall alert trigger (Property 12)
    - **Property 12: Heavy rainfall alert is triggered correctly**
    - **Validates: Requirements 5.1**
    - Use `arbWeatherForecast` generator; assert notification dispatched when rainfall > 50 mm
    - Tag: `// Feature: smart-crop-advisory, Property 12: Heavy rainfall alert is triggered correctly`

  - [ ]* 14.4 Write property test for frost alert timing (Property 13)
    - **Property 13: Frost alert timing invariant**
    - **Validates: Requirements 5.2**
    - Assert dispatch timestamp is ≥ 12 hours before predicted frost time
    - Tag: `// Feature: smart-crop-advisory, Property 13: Frost alert timing invariant`

  - [ ]* 14.5 Write property test for weather cache TTL (Property 14)
    - **Property 14: Weather cache TTL invariant**
    - **Validates: Requirements 5.5**
    - Assert served weather data age never exceeds 6 hours
    - Tag: `// Feature: smart-crop-advisory, Property 14: Weather cache TTL invariant`

- [x] 15. Market Price Service
  - [x] 15.1 Implement `MarketPriceService` in `backend/src/services/marketPriceService.ts`
    - `fetchAndCachePrices(crop, district)`: call Agmarknet API, store in Redis at `market:{crop}:{district}` with 12-h TTL
    - `getPrices(farmerId, cropName)`: return ≥ 3 mandis within 100 km with min/max/modal price, mandi name, distance, and last update timestamp; attach staleness flag if data > 24 h old
    - If API down and cache empty, return 503 with `MARKET_UNAVAILABLE` and cached timestamp
    - Schedule polling every 12 hours for crops in active farmer lists
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 15.2 Implement market price route in `backend/src/routes/marketPrices.ts`
    - `GET /api/v1/market-prices`
    - _Requirements: 11.1_

  - [ ]* 15.3 Write property test for market price mandi count and distance (Property 18)
    - **Property 18: Market price response meets mandi count and distance requirements**
    - **Validates: Requirements 7.1, 7.2**
    - Use `arbMarketPriceData` generator; assert ≥ 3 mandis each within 100 km with required fields
    - Tag: `// Feature: smart-crop-advisory, Property 18: Market price response meets mandi count and distance requirements`

  - [ ]* 15.4 Write property test for market price staleness flag (Property 19)
    - **Property 19: Market price staleness flag**
    - **Validates: Requirements 7.3**
    - Assert staleness warning present when last update > 24 h ago
    - Tag: `// Feature: smart-crop-advisory, Property 19: Market price staleness flag`

  - [ ]* 15.5 Write property test for market price cache TTL (Property 20)
    - **Property 20: Market price cache TTL invariant**
    - **Validates: Requirements 7.5**
    - Tag: `// Feature: smart-crop-advisory, Property 20: Market price cache TTL invariant`

- [x] 16. Voice Service
  - [x] 16.1 Implement `VoiceService` in `backend/src/services/voiceService.ts`
    - `speechToText(audioBlob, language)`: call Google Cloud Speech-to-Text with language code (`en-IN`, `hi-IN`, `pa-IN`); return transcript; if unrecognized, return retry prompt with text fallback flag
    - `textToSpeech(text, language)`: call Google Cloud TTS with farmer's preferred language code; return audio blob
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 16.2 Implement voice routes in `backend/src/routes/voice.ts`
    - `POST /api/v1/voice/stt`, `POST /api/v1/voice/tts`
    - _Requirements: 11.1_

  - [ ]* 16.3 Write property test for TTS language matching (Property 21)
    - **Property 21: TTS output language matches farmer preference**
    - **Validates: Requirements 8.2**
    - Assert TTS called with correct language code for each of {en, hi, pa}
    - Tag: `// Feature: smart-crop-advisory, Property 21: TTS output language matches farmer preference`

  - [ ]* 16.4 Write property test for unrecognized voice input (Property 22)
    - **Property 22: Unrecognized voice input triggers retry prompt with text fallback**
    - **Validates: Requirements 8.4**
    - Tag: `// Feature: smart-crop-advisory, Property 22: Unrecognized voice input triggers retry prompt with text fallback`

- [x] 17. Notification Service
  - [x] 17.1 Implement `NotificationService` in `backend/src/services/notificationService.ts`
    - `sendWeatherAlert(farmerId, alertType, payload)`: send FCM push notification; persist to `notifications` table
    - `getNotifications(farmerId)`: return notification history
    - _Requirements: 5.1, 5.2_

  - [x] 17.2 Implement notifications route in `backend/src/routes/notifications.ts`
    - `GET /api/v1/notifications`
    - _Requirements: 11.1_

- [x] 18. Feedback Service
  - [x] 18.1 Implement `FeedbackService` in `backend/src/services/feedbackService.ts`
    - `recordSession(farmerId, sessionType, inputParams, recommendation)`: store advisory session with SHA-256 hashed farmer ID (not raw ID), timestamp, input params, and recommendation
    - `submitFeedback(sessionId, rating)`: store feedback linked to session; validate rating 1–5; do not store PII
    - `dismissFeedback(sessionId)`: mark session feedback as dismissed; do not re-prompt
    - `getAggregatedReports()`: return aggregated usage and feedback data (admin/officer role only)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 18.2 Implement feedback and dashboard routes in `backend/src/routes/feedback.ts`
    - `POST /api/v1/feedback`, `GET /api/v1/dashboard/reports`
    - Enforce officer/admin role check on dashboard endpoint (403 for farmer role)
    - _Requirements: 9.4, 11.3_

  - [ ]* 18.3 Write property test for advisory session recording (Property 23)
    - **Property 23: Advisory session recorded with all required fields**
    - **Validates: Requirements 9.2**
    - Assert stored session has timestamp, anonymised farmer ID (not raw UUID), input params, and recommendation
    - Tag: `// Feature: smart-crop-advisory, Property 23: Advisory session recorded with all required fields`

  - [ ]* 18.4 Write property test for feedback stored without PII (Property 24)
    - **Property 24: Feedback stored without PII**
    - **Validates: Requirements 9.3**
    - Assert stored feedback record contains no raw farmer ID or mobile number
    - Tag: `// Feature: smart-crop-advisory, Property 24: Feedback stored without PII`

  - [ ]* 18.5 Write property test for dismissed feedback not re-prompted (Property 25)
    - **Property 25: Dismissed feedback not re-prompted**
    - **Validates: Requirements 9.5**
    - Tag: `// Feature: smart-crop-advisory, Property 25: Dismissed feedback not re-prompted`

- [x] 19. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. OpenAPI 3.1 documentation
  - [x] 20.1 Create `backend/openapi.yaml` documenting all endpoints
    - Cover all routes from the API Gateway design: auth, farmers, soil-profiles, advisory, images, weather, market-prices, voice, feedback, dashboard, notifications
    - Include request/response schemas, envelope structure, error codes, and authentication requirements
    - _Requirements: 11.1_

  - [x] 20.2 Mount Swagger UI in Express at `/api/docs`
    - _Requirements: 11.1_

- [x] 21. Frontend web — React 18 + Vite
  - [x] 21.1 Implement API client in `frontend-web/src/api/client.ts`
    - Axios or fetch wrapper that attaches `Authorization: Bearer <token>` header to all requests
    - Handle 401 responses by triggering token refresh; never embed API keys in client code
    - _Requirements: 10.5, 11.2_

  - [x] 21.2 Implement authentication screens (registration, OTP verification, login)
    - _Requirements: 1.1, 1.5_

  - [x] 21.3 Implement farmer profile management screen
    - _Requirements: 1.2, 1.3_

  - [x] 21.4 Implement soil profile input and management screen
    - _Requirements: 2.1, 2.4, 2.5_

  - [x] 21.5 Implement crop advisory screen with ranked recommendations
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 21.6 Implement fertilizer guidance screen
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 21.7 Implement weather alerts screen with last-known forecast fallback display
    - _Requirements: 5.3, 5.4_

  - [x] 21.8 Implement image upload and pest/disease diagnosis screen
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 21.9 Implement market prices screen with staleness warning
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 21.10 Implement voice interaction toggle (STT/TTS) and language switcher
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 21.11 Implement feedback prompt component (1–5 rating, dismiss without re-prompt)
    - _Requirements: 9.1, 9.5_

  - [x] 21.12 Implement admin/officer dashboard screen for aggregated reports
    - _Requirements: 9.4_

- [x] 22. Frontend mobile — React Native Expo
  - [x] 22.1 Share API client and core logic with web via shared package or copy
    - _Requirements: 10.5, 11.2_

  - [x] 22.2 Implement mobile auth, profile, soil, advisory, fertilizer, weather, image, market, voice, feedback, and dashboard screens mirroring web feature set
    - _Requirements: 1.1–1.5, 2.1–2.5, 3.1–3.4, 4.1–4.5, 5.1–5.5, 6.1–6.5, 7.1–7.5, 8.1–8.5, 9.1–9.5_

  - [x] 22.3 Integrate FCM push notification handling for weather and frost alerts
    - _Requirements: 5.1, 5.2_

- [x] 23. Integration wiring and end-to-end validation
  - [x] 23.1 Wire all backend services into Express app entry point (`backend/src/app.ts`)
    - Register all routers, apply envelope middleware, auth middleware, rate limiting, CORS, and error handler
    - _Requirements: 11.1, 11.3, 11.4, 11.5_

  - [x] 23.2 Wire Advisory Engine and Vision Engine into Docker Compose internal network
    - Confirm `ADVISORY_ENGINE_URL` and `VISION_ENGINE_URL` env vars resolve correctly within Docker network
    - _Requirements: 10.1, 11.1_

  - [ ]* 23.3 Write integration test for full registration → OTP → JWT → crop advisory flow
    - _Requirements: 1.1, 3.1_

  - [ ]* 23.4 Write integration test for weather polling cycle with Redis cache verification
    - _Requirements: 5.5_

  - [ ]* 23.5 Write integration test for market price polling cycle with staleness flag
    - _Requirements: 7.3, 7.5_

  - [ ]* 23.6 Write integration test for image upload → Vision Engine → response structure
    - _Requirements: 6.1, 6.4_

- [x] 24. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- All 28 correctness properties are covered by property-based test sub-tasks (Properties 1–28)
- Property tests use fast-check (Node.js/TypeScript) with minimum 100 runs, and Hypothesis (Python) for advisory/vision engines
- All external APIs are mocked with `nock` (Node.js) or `responses` (Python) in unit and property tests; real services used in integration tests
- PostgreSQL and Redis run in Docker during CI
