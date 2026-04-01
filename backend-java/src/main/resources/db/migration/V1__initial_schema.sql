-- V1: Initial schema for Smart Crop Advisory System

CREATE TABLE IF NOT EXISTS farmers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_number   VARCHAR(15) UNIQUE NOT NULL,
  name            VARCHAR(100),
  preferred_lang  VARCHAR(10) NOT NULL DEFAULT 'en',
  village         VARCHAR(100),
  district        VARCHAR(100),
  state           VARCHAR(100),
  land_size_acres NUMERIC(8,2),
  fcm_token       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS soil_profiles (
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

CREATE TABLE IF NOT EXISTS crop_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id       UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  soil_profile_id UUID REFERENCES soil_profiles(id),
  crop_name       VARCHAR(100) NOT NULL,
  season          VARCHAR(20),
  year            SMALLINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS advisory_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_hash    VARCHAR(64) NOT NULL,
  session_type   VARCHAR(30) NOT NULL,
  input_params   JSONB NOT NULL,
  recommendation JSONB NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisory_session_id UUID NOT NULL REFERENCES advisory_sessions(id),
  rating              SMALLINT CHECK (rating BETWEEN 1 AND 5),
  dismissed           BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id   UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  type        VARCHAR(30) NOT NULL,
  payload     JSONB NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
