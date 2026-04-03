-- V2: Replace OTP auth with password-based auth
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
