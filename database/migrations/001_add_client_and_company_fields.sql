-- Migration: Add client and company fields, password resets table
-- Run this on your Railway PostgreSQL database

-- Add new columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);

-- Add new columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website VARCHAR(500);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS instagram VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS facebook VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS twitter VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fei_ein VARCHAR(50);

-- Create password resets table
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for password resets
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);
