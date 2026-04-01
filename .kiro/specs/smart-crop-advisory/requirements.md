# Requirements Document

## Introduction

The Smart Crop Advisory System is a multilingual, AI-powered mobile and web application designed for small and marginal farmers in India. It provides real-time, location-specific guidance on crop selection, soil health, fertilizer use, pest/disease detection, weather alerts, and market prices. The system addresses the gap between expert agricultural knowledge and farmers who currently rely on guesswork or local shopkeepers. It supports voice interaction for low-literate users and collects feedback data for continuous improvement. The system is developed under the Government of Punjab, Department of Higher Education, in the Agriculture, FoodTech & Rural Development theme.

## Glossary

- **System**: The Smart Crop Advisory System as a whole
- **Advisory_Engine**: The AI/ML backend component that generates crop, soil, and pest recommendations
- **Farmer**: A small or marginal farmer who is the primary end user of the system
- **Extension_Officer**: An agricultural extension officer who may review or supplement AI-generated advice
- **Frontend**: The mobile/web client application used by farmers
- **Backend**: The server-side API and processing layer
- **Soil_Profile**: A structured record of a farmer's soil type, pH, nutrient levels, and location
- **Crop_History**: A record of crops previously grown by a farmer on a given plot
- **Weather_Service**: The external weather data integration component
- **Market_Price_Service**: The external or aggregated market price data integration component
- **Image_Analyzer**: The AI component that processes uploaded images to detect pests or diseases
- **Voice_Interface**: The speech-to-text and text-to-speech component enabling voice interaction
- **Notification_Service**: The component responsible for sending alerts and push notifications to farmers
- **API_Gateway**: The backend entry point that routes requests and enforces authentication
- **Config**: Environment-based configuration holding API keys and secrets

---

## Requirements

### Requirement 1: Farmer Registration and Profile Management

**User Story:** As a farmer, I want to register and maintain my profile with my location, land details, and preferred language, so that the system can provide personalized advice relevant to my farm.

#### Acceptance Criteria

1. THE System SHALL allow a Farmer to register using a mobile number and OTP-based verification.
2. WHEN a Farmer completes registration, THE System SHALL create a Farmer profile storing name, mobile number, preferred language, village, district, state, and land size.
3. WHEN a Farmer updates profile information, THE System SHALL persist the updated data and reflect it in all subsequent advisory requests.
4. IF a Farmer submits a registration request with an already-registered mobile number, THEN THE System SHALL return an error message indicating the number is already in use.
5. THE System SHALL support profile creation in at least the following languages: English, Hindi, and Punjabi.

---

### Requirement 2: Soil Profile Input and Management

**User Story:** As a farmer, I want to input and update my soil details, so that the Advisory Engine can give me accurate fertilizer and crop recommendations.

#### Acceptance Criteria

1. THE System SHALL allow a Farmer to create a Soil_Profile by entering soil type, pH level, and available nutrient data (Nitrogen, Phosphorus, Potassium).
2. WHEN a Farmer submits a Soil_Profile, THE Advisory_Engine SHALL validate that pH is within the range 0–14 and that nutrient values are non-negative numbers.
3. IF a Farmer submits a Soil_Profile with invalid values, THEN THE System SHALL return a descriptive validation error identifying the invalid field.
4. WHEN a Farmer updates an existing Soil_Profile, THE System SHALL store the new values and use them for all subsequent advisory requests.
5. THE System SHALL associate each Soil_Profile with a specific plot identified by GPS coordinates or a named location.

---

### Requirement 3: Crop Selection Advisory

**User Story:** As a farmer, I want to receive crop recommendations based on my soil, location, and season, so that I can choose crops with the best yield potential.

#### Acceptance Criteria

1. WHEN a Farmer requests crop recommendations, THE Advisory_Engine SHALL return a ranked list of at least 3 suitable crops based on the Farmer's Soil_Profile, geographic location, and current season.
2. THE Advisory_Engine SHALL include for each recommended crop: expected yield range, water requirement, and estimated input cost.
3. WHEN a Farmer has an existing Crop_History, THE Advisory_Engine SHALL factor crop rotation principles into the recommendations to avoid consecutive same-crop planting on the same plot.
4. IF the Advisory_Engine cannot generate recommendations due to incomplete Soil_Profile data, THEN THE System SHALL prompt the Farmer to complete the missing fields before proceeding.
5. THE Advisory_Engine SHALL update crop recommendations when the Farmer's Soil_Profile or Crop_History is modified.

---

### Requirement 4: Fertilizer and Soil Health Guidance

**User Story:** As a farmer, I want fertilizer recommendations tailored to my soil and chosen crop, so that I can optimize input costs and avoid over-application.

#### Acceptance Criteria

1. WHEN a Farmer selects a crop and provides a Soil_Profile, THE Advisory_Engine SHALL generate a fertilizer schedule specifying type, quantity (in kg/acre), and application timing.
2. THE Advisory_Engine SHALL recommend organic alternatives alongside chemical fertilizers where soil data indicates suitability.
3. WHEN a Farmer's soil pH is outside the optimal range for the selected crop, THE Advisory_Engine SHALL include soil amendment recommendations (e.g., lime or sulfur application) in the guidance.
4. IF a Farmer requests fertilizer guidance without a linked Soil_Profile, THEN THE System SHALL return an error prompting the Farmer to create a Soil_Profile first.
5. THE Advisory_Engine SHALL express all quantity recommendations in units familiar to Indian farmers (kg/acre or bags/acre).

---

### Requirement 5: Weather-Based Alerts and Predictive Insights

**User Story:** As a farmer, I want to receive weather alerts and crop-stage-specific advisories, so that I can take timely action to protect my crops.

#### Acceptance Criteria

1. WHEN the Weather_Service reports a forecast of rainfall exceeding 50mm within 24 hours for a Farmer's location, THE Notification_Service SHALL send the Farmer an alert with recommended protective actions.
2. WHEN the Weather_Service reports a frost risk for a Farmer's location, THE Notification_Service SHALL send the Farmer an alert at least 12 hours before the predicted frost event.
3. THE Advisory_Engine SHALL generate crop-stage-specific advisories (sowing, irrigation, harvesting) based on current weather data and the Farmer's active crop selection.
4. IF the Weather_Service is unavailable, THEN THE System SHALL notify the Farmer that weather data is temporarily unavailable and display the last successfully retrieved forecast with its timestamp.
5. THE System SHALL retrieve weather data at intervals no greater than 6 hours for each active Farmer location.

---

### Requirement 6: Pest and Disease Detection via Image Upload

**User Story:** As a farmer, I want to upload a photo of my crop and receive a pest or disease diagnosis, so that I can take corrective action quickly.

#### Acceptance Criteria

1. WHEN a Farmer uploads an image of a crop, THE Image_Analyzer SHALL return a diagnosis within 10 seconds identifying the detected pest or disease, confidence level, and recommended treatment.
2. THE Image_Analyzer SHALL accept images in JPEG and PNG formats with a maximum file size of 10 MB.
3. IF the Image_Analyzer cannot identify a pest or disease with a confidence level above 60%, THEN THE System SHALL indicate low confidence and recommend the Farmer consult an Extension_Officer.
4. WHEN a diagnosis is returned, THE System SHALL include both chemical and organic treatment options with dosage and application method.
5. IF a Farmer uploads a file that is not a valid image format, THEN THE System SHALL return an error message specifying the accepted formats.

---

### Requirement 7: Market Price Tracking

**User Story:** As a farmer, I want to view current market prices for my crops, so that I can decide the best time and location to sell my produce.

#### Acceptance Criteria

1. WHEN a Farmer requests market prices for a crop, THE Market_Price_Service SHALL return the current minimum, maximum, and modal price from at least 3 nearby mandis (agricultural markets) within 100 km of the Farmer's location.
2. THE System SHALL display market prices with the mandi name, distance from the Farmer's location, and the date and time of the last price update.
3. WHEN market price data for a crop is older than 24 hours, THE System SHALL display a staleness warning alongside the price data.
4. IF the Market_Price_Service is unavailable, THEN THE System SHALL display the most recently cached prices with a timestamp and an unavailability notice.
5. THE System SHALL refresh market price data at intervals no greater than 12 hours for crops in a Farmer's active crop list.

---

### Requirement 8: Multilingual and Voice Support

**User Story:** As a low-literate farmer, I want to interact with the system using voice in my local language, so that I can access advisory services without needing to read or type.

#### Acceptance Criteria

1. THE Voice_Interface SHALL support speech-to-text input in English, Hindi, and Punjabi.
2. THE Voice_Interface SHALL convert all system-generated text responses to speech in the Farmer's preferred language.
3. WHEN a Farmer submits a voice query, THE System SHALL process the query and return an audio response within 5 seconds under normal network conditions.
4. IF the Voice_Interface fails to recognize a spoken input, THEN THE System SHALL prompt the Farmer to repeat the input and offer a text input fallback.
5. THE Frontend SHALL allow a Farmer to switch between voice and text interaction modes at any time during a session.

---

### Requirement 9: Feedback and Usage Data Collection

**User Story:** As a system administrator, I want to collect farmer feedback and usage data, so that the Advisory Engine can be continuously improved.

#### Acceptance Criteria

1. WHEN a Farmer receives an advisory recommendation, THE System SHALL present a feedback prompt allowing the Farmer to rate the advice on a scale of 1 to 5.
2. THE System SHALL record each advisory request with a timestamp, Farmer identifier (anonymized), input parameters, and the recommendation returned.
3. WHEN a Farmer submits feedback, THE System SHALL store the feedback linked to the specific advisory session without storing personally identifiable information beyond the anonymized Farmer identifier.
4. THE System SHALL make aggregated usage and feedback reports available to Extension_Officers and administrators through a dashboard.
5. IF a Farmer declines to provide feedback, THEN THE System SHALL accept the dismissal and not prompt again for the same advisory session.

---

### Requirement 10: Security and API Key Management

**User Story:** As a developer, I want all API keys and secrets to be managed via environment variables and excluded from version control, so that sensitive credentials are never exposed in the GitHub repository.

#### Acceptance Criteria

1. THE Backend SHALL load all third-party API keys (weather, market price, AI/ML services) exclusively from environment variables defined in a `.env` file.
2. THE System SHALL include a `.gitignore` file that excludes `.env` files and any file containing secrets from version control.
3. THE Backend SHALL provide a `.env.example` file listing all required environment variable names with placeholder values and no actual secrets.
4. IF a required environment variable is missing at application startup, THEN THE Backend SHALL log a descriptive error identifying the missing variable and terminate startup.
5. THE Frontend SHALL communicate with the Backend exclusively through the API_Gateway and SHALL NOT embed any API keys in client-side code.

---

### Requirement 11: Separate Frontend and Backend Architecture

**User Story:** As a developer, I want the frontend and backend to be independently deployable services, so that each can be scaled, updated, and maintained separately.

#### Acceptance Criteria

1. THE Backend SHALL expose a RESTful API that the Frontend consumes, with all endpoints documented in an OpenAPI specification.
2. THE Frontend SHALL be a separate application that communicates with the Backend only via authenticated HTTP requests through the API_Gateway.
3. THE API_Gateway SHALL enforce authentication on all endpoints except the registration and OTP verification endpoints.
4. WHEN the Backend is updated, THE System SHALL maintain backward compatibility for existing API versions or provide a versioned migration path.
5. THE Backend SHALL return all API responses in JSON format with a consistent envelope structure containing status, data, and error fields.
