const { query } = require('./database');
const logger = require('./logger');

async function runMigrations() {
  try {
    logger.info('Running database migrations...');

    // ============================================
    // EXTENSIONS
    // ============================================
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // ============================================
    // ENUM TYPES (ignore if exists)
    // ============================================
    try {
      await query(`CREATE TYPE user_role AS ENUM ('owner', 'admin', 'technician')`);
    } catch (e) { /* type exists */ }

    try {
      await query(`CREATE TYPE service_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled')`);
    } catch (e) { /* type exists */ }

    try {
      await query(`CREATE TYPE alert_priority AS ENUM ('low', 'medium', 'high', 'critical')`);
    } catch (e) { /* type exists */ }

    try {
      await query(`CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved')`);
    } catch (e) { /* type exists */ }

    try {
      await query(`CREATE TYPE pool_type AS ENUM ('residential', 'commercial', 'community')`);
    } catch (e) { /* type exists */ }

    try {
      await query(`CREATE TYPE movement_type AS ENUM ('purchase', 'usage', 'adjustment', 'return')`);
    } catch (e) { /* type exists */ }

    // ============================================
    // BASE TABLES
    // ============================================

    // Companies (Multi-tenant root)
    await query(`
      CREATE TABLE IF NOT EXISTS companies (
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
        website VARCHAR(500),
        instagram VARCHAR(255),
        facebook VARCHAR(255),
        twitter VARCHAR(255),
        fei_ein VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Users
    await query(`
      CREATE TABLE IF NOT EXISTS users (
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
      )
    `);

    // Refresh Tokens
    await query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) NOT NULL UNIQUE,
        device_info JSONB,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Password Reset Tokens
    await query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Clients
    await query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255),
        company_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        zip_code VARCHAR(20),
        notes TEXT,
        billing_email VARCHAR(255),
        service_day VARCHAR(20),
        service_frequency INTEGER DEFAULT 1,
        client_type VARCHAR(20) DEFAULT 'residential',
        assigned_technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
        route_order INTEGER DEFAULT 0,
        portal_email VARCHAR(255),
        portal_password_hash VARCHAR(255),
        portal_enabled BOOLEAN DEFAULT false,
        portal_last_login TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Pools
    await query(`
      CREATE TABLE IF NOT EXISTS pools (
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
      )
    `);

    // Chemicals Catalog
    await query(`
      CREATE TABLE IF NOT EXISTS chemicals (
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
      )
    `);

    // Inventory
    await query(`
      CREATE TABLE IF NOT EXISTS inventory (
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
      )
    `);

    // Inventory Movements
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
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
      )
    `);

    // Service Records
    await query(`
      CREATE TABLE IF NOT EXISTS service_records (
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
        ph_level DECIMAL(4,2),
        chlorine_level DECIMAL(4,2),
        alkalinity DECIMAL(6,2),
        calcium_hardness DECIMAL(6,2),
        cyanuric_acid DECIMAL(6,2),
        salt_level DECIMAL(8,2),
        water_temperature DECIMAL(5,2),
        skimmed_surface BOOLEAN DEFAULT false,
        brushed_walls BOOLEAN DEFAULT false,
        vacuumed_pool BOOLEAN DEFAULT false,
        cleaned_skimmer BOOLEAN DEFAULT false,
        checked_equipment BOOLEAN DEFAULT false,
        backwashed_filter BOOLEAN DEFAULT false,
        emptied_pump_basket BOOLEAN DEFAULT false,
        notes TEXT,
        internal_notes TEXT,
        photos JSONB DEFAULT '[]',
        signature_url VARCHAR(500),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Alerts
    await query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        pool_id UUID REFERENCES pools(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        priority alert_priority DEFAULT 'medium',
        status alert_status DEFAULT 'active',
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolved_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Service Chemicals (chemicals used in each service)
    await query(`
      CREATE TABLE IF NOT EXISTS service_chemicals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        service_record_id UUID NOT NULL REFERENCES service_records(id) ON DELETE CASCADE,
        chemical_id UUID NOT NULL REFERENCES chemicals(id),
        quantity_used DECIMAL(10,2) NOT NULL,
        unit_cost DECIMAL(10,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // ROUTE SCHEDULES & HISTORY TABLES
    // ============================================

    // Route schedules - the weekly template for each technician
    await query(`
      CREATE TABLE IF NOT EXISTS route_schedules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        day_of_week VARCHAR(20) NOT NULL,
        route_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, technician_id, client_id, day_of_week)
      )
    `);

    // Route instances - actual generated routes per week
    await query(`
      CREATE TABLE IF NOT EXISTS route_instances (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        route_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'scheduled',
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, technician_id, route_date)
      )
    `);

    // Route stops - each client visit in a route instance
    await query(`
      CREATE TABLE IF NOT EXISTS route_stops (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        route_instance_id UUID NOT NULL REFERENCES route_instances(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        stop_order INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        arrival_time TIMESTAMP WITH TIME ZONE,
        departure_time TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Client rates table (legacy - keeping for backwards compatibility)
    await query(`
      CREATE TABLE IF NOT EXISTS client_rates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        frequency VARCHAR(50) NOT NULL DEFAULT 'monthly',
        is_active BOOLEAN DEFAULT true,
        next_billing_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // SERVICE ITEMS CATALOG SYSTEM
    // ============================================

    // Item type enum
    try {
      await query(`CREATE TYPE item_type AS ENUM ('service', 'product', 'part', 'other')`);
    } catch (e) { /* type exists */ }

    // Item frequency enum
    try {
      await query(`CREATE TYPE billing_frequency AS ENUM ('once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual')`);
    } catch (e) { /* type exists */ }

    // Service Items Catalog - Company's master list of all billable items
    await query(`
      CREATE TABLE IF NOT EXISTS service_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        item_type VARCHAR(20) DEFAULT 'service',
        category VARCHAR(100),
        base_price DECIMAL(10,2) NOT NULL,
        unit VARCHAR(50) DEFAULT 'unit',
        tax_rate DECIMAL(5,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Client Service Items - Items assigned to specific clients
    await query(`
      CREATE TABLE IF NOT EXISTS client_service_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        service_item_id UUID NOT NULL REFERENCES service_items(id) ON DELETE CASCADE,
        custom_price DECIMAL(10,2),
        quantity DECIMAL(10,2) DEFAULT 1,
        frequency VARCHAR(20) DEFAULT 'monthly',
        is_recurring BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        start_date DATE DEFAULT CURRENT_DATE,
        end_date DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id, service_item_id, frequency)
      )
    `);

    // Client equipment table
    await query(`
      CREATE TABLE IF NOT EXISTS client_equipment (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        equipment_type VARCHAR(100) NOT NULL,
        brand VARCHAR(255),
        model VARCHAR(255),
        serial_number VARCHAR(255),
        install_date DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // INVOICE SYSTEM TABLES
    // ============================================

    // Invoice status enum
    try {
      await query(`CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled')`);
    } catch (e) { /* type exists */ }

    // Invoices table
    await query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        invoice_number VARCHAR(50) NOT NULL,
        status invoice_status DEFAULT 'draft',
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        tax_rate DECIMAL(5,2) DEFAULT 0,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL DEFAULT 0,
        amount_paid DECIMAL(10,2) DEFAULT 0,
        balance_due DECIMAL(10,2) NOT NULL DEFAULT 0,
        issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
        due_date DATE NOT NULL,
        paid_date DATE,
        notes TEXT,
        terms TEXT,
        billing_period_start DATE,
        billing_period_end DATE,
        sent_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, invoice_number)
      )
    `);

    // Invoice items table
    await query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        description VARCHAR(500) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        rate_id UUID REFERENCES client_rates(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Payments table
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50),
        payment_reference VARCHAR(255),
        notes TEXT,
        payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Invoice settings per company
    await query(`
      CREATE TABLE IF NOT EXISTS invoice_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
        next_invoice_number INTEGER DEFAULT 1,
        invoice_prefix VARCHAR(20) DEFAULT 'INV-',
        default_due_days INTEGER DEFAULT 30,
        default_tax_rate DECIMAL(5,2) DEFAULT 0,
        default_terms TEXT,
        default_notes TEXT,
        auto_generate_monthly BOOLEAN DEFAULT false,
        auto_generate_day INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // PLATFORM ADMIN & LICENSING SYSTEM
    // ============================================

    // Platform subscription plans enum
    try {
      await query(`CREATE TYPE subscription_plan AS ENUM ('trial', 'basic', 'professional', 'enterprise')`);
    } catch (e) { /* type exists */ }

    // Platform subscription status enum
    try {
      await query(`CREATE TYPE subscription_status AS ENUM ('active', 'trial', 'expired', 'cancelled', 'suspended')`);
    } catch (e) { /* type exists */ }

    // Platform Admins (Super admins who manage ALL companies)
    await query(`
      CREATE TABLE IF NOT EXISTS platform_admins (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add subscription fields to companies table if not exists
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'companies' AND column_name = 'subscription_status') THEN
          ALTER TABLE companies ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'trial';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'companies' AND column_name = 'trial_ends_at') THEN
          ALTER TABLE companies ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '14 days');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'companies' AND column_name = 'max_users') THEN
          ALTER TABLE companies ADD COLUMN max_users INTEGER DEFAULT 3;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'companies' AND column_name = 'max_clients') THEN
          ALTER TABLE companies ADD COLUMN max_clients INTEGER DEFAULT 50;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'companies' AND column_name = 'stripe_customer_id') THEN
          ALTER TABLE companies ADD COLUMN stripe_customer_id VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'companies' AND column_name = 'stripe_subscription_id') THEN
          ALTER TABLE companies ADD COLUMN stripe_subscription_id VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'companies' AND column_name = 'monthly_price') THEN
          ALTER TABLE companies ADD COLUMN monthly_price DECIMAL(10,2) DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'companies' AND column_name = 'last_payment_at') THEN
          ALTER TABLE companies ADD COLUMN last_payment_at TIMESTAMP WITH TIME ZONE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'companies' AND column_name = 'notes') THEN
          ALTER TABLE companies ADD COLUMN notes TEXT;
        END IF;
      END $$;
    `);

    // Platform activity log
    await query(`
      CREATE TABLE IF NOT EXISTS platform_activity_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        admin_id UUID REFERENCES platform_admins(id),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,
        details JSONB,
        ip_address VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Subscription plans configuration
    await query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        monthly_price DECIMAL(10,2) NOT NULL,
        annual_price DECIMAL(10,2),
        max_users INTEGER NOT NULL,
        max_clients INTEGER NOT NULL,
        features JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default plans if not exist
    await query(`
      INSERT INTO subscription_plans (name, display_name, monthly_price, annual_price, max_users, max_clients, features)
      VALUES
        ('trial', 'Trial', 0, 0, 2, 25, '["basic_features"]'),
        ('basic', 'Basic', 29.99, 299.99, 3, 50, '["basic_features", "email_support"]'),
        ('professional', 'Professional', 79.99, 799.99, 10, 200, '["all_features", "priority_support", "api_access"]'),
        ('enterprise', 'Enterprise', 199.99, 1999.99, -1, -1, '["all_features", "dedicated_support", "api_access", "white_label"]')
      ON CONFLICT (name) DO NOTHING
    `);

    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Migration error:', error.message);
    throw error; // Re-throw to indicate failure
  }
}

module.exports = { runMigrations };
