-- =====================================================
-- AGUADULCE TRACK - Database Initialization Script
-- PostgreSQL 14+
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE user_role AS ENUM ('owner', 'admin', 'technician');
CREATE TYPE service_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE alert_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved');
CREATE TYPE pool_type AS ENUM ('residential', 'commercial', 'community');
CREATE TYPE movement_type AS ENUM ('purchase', 'usage', 'adjustment', 'return');
CREATE TYPE report_frequency AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE reminder_status AS ENUM ('pending', 'sent', 'completed', 'cancelled');

-- =====================================================
-- TABLES
-- =====================================================

-- Companies (Multi-tenant root)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    logo_url VARCHAR(500),
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    settings JSONB DEFAULT '{}',
    subscription_plan VARCHAR(50) DEFAULT 'free',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    role user_role NOT NULL DEFAULT 'technician',
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    push_subscription JSONB,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, email)
);

-- Refresh Tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    device_info JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Password Reset Tokens
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    notes TEXT,
    billing_email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pools
CREATE TABLE pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    pool_type pool_type DEFAULT 'residential',
    volume_gallons INTEGER,
    surface_area_sqft DECIMAL(10,2),
    has_spa BOOLEAN DEFAULT false,
    has_heater BOOLEAN DEFAULT false,
    has_salt_system BOOLEAN DEFAULT false,
    equipment_notes TEXT,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    service_day VARCHAR(20),
    service_frequency VARCHAR(50) DEFAULT 'weekly',
    monthly_rate DECIMAL(10,2),
    notes TEXT,
    photos JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chemicals Catalog
CREATE TABLE chemicals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    cost_per_unit DECIMAL(10,2),
    default_dosage DECIMAL(10,2),
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inventory
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    chemical_id UUID NOT NULL REFERENCES chemicals(id) ON DELETE CASCADE,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    min_stock_level DECIMAL(10,2) DEFAULT 0,
    location VARCHAR(255),
    last_purchase_date DATE,
    last_purchase_price DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, chemical_id)
);

-- Inventory Movements
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    movement_type movement_type NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2),
    reference_id UUID,
    reference_type VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Service Records
CREATE TABLE service_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    pool_id UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES users(id),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    status service_status DEFAULT 'pending',
    arrival_time TIMESTAMP WITH TIME ZONE,
    departure_time TIMESTAMP WITH TIME ZONE,
    arrival_latitude DECIMAL(10, 8),
    arrival_longitude DECIMAL(11, 8),
    departure_latitude DECIMAL(10, 8),
    departure_longitude DECIMAL(11, 8),
    -- Water Readings
    ph_level DECIMAL(4,2),
    chlorine_level DECIMAL(4,2),
    alkalinity DECIMAL(6,2),
    calcium_hardness DECIMAL(6,2),
    cyanuric_acid DECIMAL(6,2),
    salt_level DECIMAL(8,2),
    water_temperature DECIMAL(5,2),
    -- Tasks
    skimmed_surface BOOLEAN DEFAULT false,
    brushed_walls BOOLEAN DEFAULT false,
    vacuumed_pool BOOLEAN DEFAULT false,
    cleaned_skimmer BOOLEAN DEFAULT false,
    checked_equipment BOOLEAN DEFAULT false,
    backwashed_filter BOOLEAN DEFAULT false,
    emptied_pump_basket BOOLEAN DEFAULT false,
    -- Notes & Signature
    notes TEXT,
    client_signature TEXT,
    signature_name VARCHAR(255),
    signature_timestamp TIMESTAMP WITH TIME ZONE,
    -- Metadata
    duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chemical Usage in Service
CREATE TABLE chemical_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_record_id UUID NOT NULL REFERENCES service_records(id) ON DELETE CASCADE,
    chemical_id UUID NOT NULL REFERENCES chemicals(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Service Photos
CREATE TABLE service_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_record_id UUID NOT NULL REFERENCES service_records(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    caption TEXT,
    photo_type VARCHAR(50) DEFAULT 'general',
    taken_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reminders
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    pool_id UUID REFERENCES pools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    due_time TIME,
    status reminder_status DEFAULT 'pending',
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    pool_id UUID REFERENCES pools(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    priority alert_priority DEFAULT 'medium',
    status alert_status DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Daily Metrics (Pre-aggregated for analytics)
CREATE TABLE daily_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    services_completed INTEGER DEFAULT 0,
    services_pending INTEGER DEFAULT 0,
    services_cancelled INTEGER DEFAULT 0,
    total_chemical_cost DECIMAL(12,2) DEFAULT 0,
    total_service_duration_minutes INTEGER DEFAULT 0,
    active_technicians INTEGER DEFAULT 0,
    alerts_generated INTEGER DEFAULT 0,
    alerts_resolved INTEGER DEFAULT 0,
    pools_with_issues INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, date)
);

-- Scheduled Reports
CREATE TABLE scheduled_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    frequency report_frequency NOT NULL,
    recipients TEXT[] NOT NULL,
    filters JSONB DEFAULT '{}',
    last_sent_at TIMESTAMP WITH TIME ZONE,
    next_send_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Report History
CREATE TABLE report_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheduled_report_id UUID REFERENCES scheduled_reports(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    report_type VARCHAR(100) NOT NULL,
    file_url VARCHAR(500),
    file_format VARCHAR(10),
    parameters JSONB,
    sent_to TEXT[],
    status VARCHAR(50) DEFAULT 'generated',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Push Subscriptions
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint VARCHAR(500) NOT NULL UNIQUE,
    keys JSONB NOT NULL,
    device_info JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Companies
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_active ON companies(is_active);

-- Users
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(company_id, role);

-- Refresh Tokens
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Password Resets
CREATE INDEX idx_password_resets_user ON password_resets(user_id);
CREATE INDEX idx_password_resets_token ON password_resets(token);
CREATE INDEX idx_password_resets_expires ON password_resets(expires_at);

-- Clients
CREATE INDEX idx_clients_company ON clients(company_id);
CREATE INDEX idx_clients_active ON clients(company_id, is_active);

-- Pools
CREATE INDEX idx_pools_client ON pools(client_id);
CREATE INDEX idx_pools_company ON pools(company_id);
CREATE INDEX idx_pools_service_day ON pools(company_id, service_day);

-- Chemicals
CREATE INDEX idx_chemicals_company ON chemicals(company_id);

-- Inventory
CREATE INDEX idx_inventory_company ON inventory(company_id);
CREATE INDEX idx_inventory_chemical ON inventory(chemical_id);
CREATE INDEX idx_inventory_low_stock ON inventory(company_id) WHERE quantity <= min_stock_level;

-- Inventory Movements
CREATE INDEX idx_inventory_movements_inventory ON inventory_movements(inventory_id);
CREATE INDEX idx_inventory_movements_company ON inventory_movements(company_id);
CREATE INDEX idx_inventory_movements_date ON inventory_movements(created_at);

-- Service Records
CREATE INDEX idx_service_records_company ON service_records(company_id);
CREATE INDEX idx_service_records_pool ON service_records(pool_id);
CREATE INDEX idx_service_records_technician ON service_records(technician_id);
CREATE INDEX idx_service_records_date ON service_records(scheduled_date);
CREATE INDEX idx_service_records_status ON service_records(company_id, status);
CREATE INDEX idx_service_records_company_date ON service_records(company_id, scheduled_date);

-- Chemical Usage
CREATE INDEX idx_chemical_usage_service ON chemical_usage(service_record_id);
CREATE INDEX idx_chemical_usage_chemical ON chemical_usage(chemical_id);

-- Service Photos
CREATE INDEX idx_service_photos_service ON service_photos(service_record_id);

-- Reminders
CREATE INDEX idx_reminders_company ON reminders(company_id);
CREATE INDEX idx_reminders_pool ON reminders(pool_id);
CREATE INDEX idx_reminders_due_date ON reminders(due_date);
CREATE INDEX idx_reminders_status ON reminders(status);

-- Alerts
CREATE INDEX idx_alerts_company ON alerts(company_id);
CREATE INDEX idx_alerts_pool ON alerts(pool_id);
CREATE INDEX idx_alerts_status ON alerts(company_id, status);
CREATE INDEX idx_alerts_priority ON alerts(company_id, priority);

-- Daily Metrics
CREATE INDEX idx_daily_metrics_company_date ON daily_metrics(company_id, date);

-- Scheduled Reports
CREATE INDEX idx_scheduled_reports_company ON scheduled_reports(company_id);
CREATE INDEX idx_scheduled_reports_next_send ON scheduled_reports(next_send_at) WHERE is_active = true;

-- Push Subscriptions
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

-- Audit Log
CREATE INDEX idx_audit_log_company ON audit_log(company_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_date ON audit_log(created_at);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Updated At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply Updated At Trigger to all tables
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pools_updated_at BEFORE UPDATE ON pools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chemicals_updated_at BEFORE UPDATE ON chemicals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_records_updated_at BEFORE UPDATE ON service_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_metrics_updated_at BEFORE UPDATE ON daily_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_reports_updated_at BEFORE UPDATE ON scheduled_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create inventory movement on chemical usage
CREATE OR REPLACE FUNCTION create_chemical_usage_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_inventory_id UUID;
    v_company_id UUID;
BEGIN
    -- Get company_id from service record
    SELECT sr.company_id INTO v_company_id
    FROM service_records sr
    WHERE sr.id = NEW.service_record_id;

    -- Get inventory record
    SELECT id INTO v_inventory_id
    FROM inventory
    WHERE company_id = v_company_id AND chemical_id = NEW.chemical_id;

    IF v_inventory_id IS NOT NULL THEN
        -- Update inventory quantity
        UPDATE inventory
        SET quantity = quantity - NEW.quantity
        WHERE id = v_inventory_id;

        -- Create movement record
        INSERT INTO inventory_movements (
            inventory_id, company_id, movement_type, quantity,
            reference_id, reference_type, notes
        ) VALUES (
            v_inventory_id, v_company_id, 'usage', NEW.quantity,
            NEW.service_record_id, 'service_record', 'Automatic deduction from service'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_chemical_usage_inventory
AFTER INSERT ON chemical_usage
FOR EACH ROW EXECUTE FUNCTION create_chemical_usage_movement();

-- Low stock alert trigger
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity <= NEW.min_stock_level AND
       (OLD.quantity IS NULL OR OLD.quantity > OLD.min_stock_level) THEN
        INSERT INTO alerts (
            company_id, type, title, message, priority
        ) VALUES (
            NEW.company_id,
            'low_stock',
            'Inventario Bajo',
            'El producto ha alcanzado el nivel mínimo de stock.',
            'medium'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_low_stock_alert
AFTER UPDATE ON inventory
FOR EACH ROW EXECUTE FUNCTION check_low_stock();

-- =====================================================
-- ROW LEVEL SECURITY (Multi-tenant isolation)
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies (assuming app sets current_setting('app.company_id'))
CREATE POLICY users_company_policy ON users
    USING (company_id::text = current_setting('app.company_id', true));

CREATE POLICY clients_company_policy ON clients
    USING (company_id::text = current_setting('app.company_id', true));

CREATE POLICY pools_company_policy ON pools
    USING (company_id::text = current_setting('app.company_id', true));

CREATE POLICY chemicals_company_policy ON chemicals
    USING (company_id::text = current_setting('app.company_id', true));

CREATE POLICY inventory_company_policy ON inventory
    USING (company_id::text = current_setting('app.company_id', true));

CREATE POLICY service_records_company_policy ON service_records
    USING (company_id::text = current_setting('app.company_id', true));

CREATE POLICY alerts_company_policy ON alerts
    USING (company_id::text = current_setting('app.company_id', true));

CREATE POLICY reminders_company_policy ON reminders
    USING (company_id::text = current_setting('app.company_id', true));

CREATE POLICY daily_metrics_company_policy ON daily_metrics
    USING (company_id::text = current_setting('app.company_id', true));

-- =====================================================
-- SEED DATA
-- =====================================================

-- Demo Company
INSERT INTO companies (id, name, slug, email, phone, subscription_plan)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Demo Pool Services',
    'demo-pool-services',
    'demo@aguadulcetrack.com',
    '555-0100',
    'premium'
);

-- Demo Admin User (password: Admin123!)
INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'admin@demo.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.XjCVSiW3QVCHiq',
    'Admin',
    'Usuario',
    'owner'
);

-- Demo Technician User (password: Tech123!)
INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role)
VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'tecnico@demo.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.XjCVSiW3QVCHiq',
    'Carlos',
    'Técnico',
    'technician'
);

-- Demo Chemicals
INSERT INTO chemicals (company_id, name, unit, cost_per_unit, category) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Cloro Granulado', 'lb', 8.50, 'sanitizer'),
    ('a0000000-0000-0000-0000-000000000001', 'Cloro Líquido', 'gal', 5.00, 'sanitizer'),
    ('a0000000-0000-0000-0000-000000000001', 'Ácido Muriático', 'gal', 7.00, 'balancer'),
    ('a0000000-0000-0000-0000-000000000001', 'Bicarbonato de Sodio', 'lb', 3.50, 'balancer'),
    ('a0000000-0000-0000-0000-000000000001', 'Estabilizador (CYA)', 'lb', 12.00, 'stabilizer'),
    ('a0000000-0000-0000-0000-000000000001', 'Algaecida', 'qt', 15.00, 'algaecide'),
    ('a0000000-0000-0000-0000-000000000001', 'Shock (Cal-Hypo)', 'lb', 6.00, 'shock'),
    ('a0000000-0000-0000-0000-000000000001', 'Clarificador', 'qt', 10.00, 'clarifier');

-- Demo Client
INSERT INTO clients (id, company_id, name, email, phone, address, city, state, zip_code)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Familia García',
    'garcia@email.com',
    '555-0101',
    '123 Palm Street',
    'Miami',
    'FL',
    '33101'
);

-- Demo Pool
INSERT INTO pools (id, client_id, company_id, name, pool_type, volume_gallons, service_day, monthly_rate)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Piscina Principal',
    'residential',
    15000,
    'Monday',
    150.00
);

COMMIT;
