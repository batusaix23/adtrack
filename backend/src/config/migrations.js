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
    // ENUM TYPES
    // ============================================
    const enums = [
      `CREATE TYPE user_role AS ENUM ('owner', 'admin', 'manager', 'technician')`,
      `CREATE TYPE service_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'skipped')`,
      `CREATE TYPE alert_priority AS ENUM ('low', 'medium', 'high', 'critical')`,
      `CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved')`,
      `CREATE TYPE client_type AS ENUM ('residential', 'commercial')`,
      `CREATE TYPE service_frequency AS ENUM ('1x_week', '2x_week', '3x_week', 'biweekly', 'monthly', 'on_call')`,
      `CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'cancelled')`,
      `CREATE TYPE estimate_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted')`,
      `CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded')`,
      `CREATE TYPE payment_method AS ENUM ('cash', 'check', 'card', 'ach', 'square', 'paypal', 'zelle', 'other')`,
      `CREATE TYPE request_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled')`,
      `CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'whatsapp', 'push')`
    ];

    for (const enumSql of enums) {
      try { await query(enumSql); } catch (e) { /* type exists */ }
    }

    // ============================================
    // LEVEL 1: PLATFORM (Super Admin)
    // ============================================

    // Subscription Plans
    await query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        monthly_price DECIMAL(10,2) NOT NULL,
        annual_price DECIMAL(10,2),
        max_users INTEGER NOT NULL DEFAULT 3,
        max_clients INTEGER NOT NULL DEFAULT 50,
        max_technicians INTEGER DEFAULT 2,
        features JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Platform Admins
    await query(`
      CREATE TABLE IF NOT EXISTS platform_admins (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // LEVEL 2: COMPANIES (B2B Clients)
    // ============================================

    // Companies - Pool Service Companies
    await query(`
      CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Basic Info
        company_name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE,
        owner_first_name VARCHAR(100),
        owner_last_name VARCHAR(100),

        -- Tax & Legal
        fei_ein VARCHAR(20),
        business_license VARCHAR(100),

        -- Contact
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20),
        phone_secondary VARCHAR(20),

        -- Address
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(50),
        zip_code VARCHAR(20),
        country VARCHAR(50) DEFAULT 'USA',

        -- Online Presence
        website VARCHAR(255),
        facebook VARCHAR(255),
        instagram VARCHAR(255),
        twitter VARCHAR(255),
        linkedin VARCHAR(255),
        yelp VARCHAR(255),
        google_business VARCHAR(255),

        -- Branding
        logo_url VARCHAR(500),
        primary_color VARCHAR(7) DEFAULT '#0066CC',
        secondary_color VARCHAR(7) DEFAULT '#4F46E5',

        -- Subscription
        subscription_plan_id UUID REFERENCES subscription_plans(id),
        subscription_status VARCHAR(20) DEFAULT 'trial',
        subscription_start_date DATE,
        subscription_end_date DATE,
        trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '14 days'),
        max_users INTEGER DEFAULT 3,
        max_clients INTEGER DEFAULT 50,
        max_technicians INTEGER DEFAULT 2,

        -- Billing
        stripe_customer_id VARCHAR(100),
        stripe_subscription_id VARCHAR(100),
        monthly_price DECIMAL(10,2) DEFAULT 0,
        last_payment_at TIMESTAMP WITH TIME ZONE,
        payment_failed_count INTEGER DEFAULT 0,

        -- Settings
        timezone VARCHAR(50) DEFAULT 'America/New_York',
        currency VARCHAR(3) DEFAULT 'USD',
        language VARCHAR(5) DEFAULT 'en',
        date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
        settings JSONB DEFAULT '{}',

        -- Meta
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns to companies if they exist
    const companyColumns = [
      { name: 'company_name', type: 'VARCHAR(255)', default: null },
      { name: 'owner_first_name', type: 'VARCHAR(100)', default: null },
      { name: 'owner_last_name', type: 'VARCHAR(100)', default: null },
      { name: 'fei_ein', type: 'VARCHAR(20)', default: null },
      { name: 'facebook', type: 'VARCHAR(255)', default: null },
      { name: 'instagram', type: 'VARCHAR(255)', default: null },
      { name: 'linkedin', type: 'VARCHAR(255)', default: null },
      { name: 'max_technicians', type: 'INTEGER', default: '2' },
      { name: 'subscription_plan_id', type: 'UUID', default: null }
    ];

    for (const col of companyColumns) {
      try {
        if (col.default) {
          await query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} DEFAULT ${col.default}`);
        } else {
          await query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        }
      } catch (e) { /* column exists */ }
    }

    // Company Users (Admin staff)
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,

        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),

        role VARCHAR(20) DEFAULT 'admin',
        permissions JSONB DEFAULT '[]',

        avatar_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP WITH TIME ZONE,

        settings JSONB DEFAULT '{}',
        push_subscription JSONB,

        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMP WITH TIME ZONE,

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

    // ============================================
    // TECHNICIANS (Separate from admin users)
    // ============================================

    await query(`
      CREATE TABLE IF NOT EXISTS technicians (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

        -- Personal Info
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),

        -- Portal Access
        portal_password_hash VARCHAR(255),
        portal_pin VARCHAR(10),

        -- Employment
        hire_date DATE,
        hourly_rate DECIMAL(10,2),
        employee_id VARCHAR(50),

        -- Display
        color VARCHAR(7) DEFAULT '#3B82F6',
        avatar_url VARCHAR(500),

        -- Status
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP WITH TIME ZONE,

        -- Settings
        notification_preferences JSONB DEFAULT '{"sms": true, "email": true, "push": true}',

        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(company_id, email)
      )
    `);

    // ============================================
    // LEVEL 3: CLIENTS (End Customers)
    // ============================================

    await query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

        -- Names
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        company_name VARCHAR(255),

        -- Contact
        phone VARCHAR(20),
        phone_secondary VARCHAR(20),
        email VARCHAR(255),

        -- Service Address
        address TEXT NOT NULL,
        address_line2 VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(50),
        zip_code VARCHAR(20),
        country VARCHAR(50) DEFAULT 'USA',

        -- GPS (for route optimization)
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),

        -- Billing Address (if different)
        billing_address TEXT,
        billing_city VARCHAR(100),
        billing_state VARCHAR(50),
        billing_zip VARCHAR(20),
        billing_email VARCHAR(255),

        -- Service Configuration
        client_type VARCHAR(20) DEFAULT 'residential',
        service_frequency VARCHAR(20) DEFAULT '1x_week',
        service_days JSONB DEFAULT '[]',
        preferred_time VARCHAR(20),
        assigned_technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
        route_order INTEGER DEFAULT 0,

        -- Pricing
        monthly_service_cost DECIMAL(10,2),
        stabilizer_cost DECIMAL(10,2),
        stabilizer_frequency_months INTEGER DEFAULT 3,

        -- Access
        gate_code VARCHAR(50),
        gate_code_encrypted VARCHAR(255),
        access_notes TEXT,

        -- Client Portal
        portal_email VARCHAR(255),
        portal_password_hash VARCHAR(255),
        portal_enabled BOOLEAN DEFAULT false,
        portal_last_login TIMESTAMP WITH TIME ZONE,

        -- Billing Settings
        autopay_enabled BOOLEAN DEFAULT false,
        stripe_customer_id VARCHAR(100),
        payment_method_id VARCHAR(100),
        default_payment_method VARCHAR(50),
        balance DECIMAL(10,2) DEFAULT 0,

        -- Status
        status VARCHAR(20) DEFAULT 'active',
        start_date DATE,
        end_date DATE,

        -- Meta
        notes TEXT,
        internal_notes TEXT,
        tags JSONB DEFAULT '[]',
        custom_fields JSONB DEFAULT '{}',

        -- Legacy
        name VARCHAR(255),

        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns to clients
    const clientColumns = [
      'phone_secondary VARCHAR(20)',
      'address_line2 VARCHAR(255)',
      'billing_address TEXT',
      'billing_city VARCHAR(100)',
      'billing_state VARCHAR(50)',
      'billing_zip VARCHAR(20)',
      'billing_email VARCHAR(255)',
      'service_frequency VARCHAR(20) DEFAULT \'1x_week\'',
      'service_days JSONB DEFAULT \'[]\'',
      'service_day VARCHAR(20)',
      'preferred_time VARCHAR(20)',
      'monthly_service_cost DECIMAL(10,2)',
      'stabilizer_cost DECIMAL(10,2)',
      'stabilizer_frequency_months INTEGER DEFAULT 3',
      'gate_code_encrypted VARCHAR(255)',
      'internal_notes TEXT',
      'default_payment_method VARCHAR(50)',
      'latitude DECIMAL(10, 8)',
      'longitude DECIMAL(11, 8)',
      // First/Last name columns (may be missing from old tables)
      'first_name VARCHAR(100)',
      'last_name VARCHAR(100)',
      // Zoho-style contact fields
      'salutation VARCHAR(10)',
      'display_name VARCHAR(255)',
      'mobile VARCHAR(20)',
      'website VARCHAR(255)',
      'tax_id VARCHAR(50)',
      // Payment terms
      'payment_terms VARCHAR(50) DEFAULT \'net_30\'',
      'credit_limit DECIMAL(10,2)',
      'currency VARCHAR(3) DEFAULT \'USD\'',
      // Shipping address
      'shipping_address TEXT',
      'shipping_city VARCHAR(100)',
      'shipping_state VARCHAR(50)',
      'shipping_zip VARCHAR(20)',
      'shipping_country VARCHAR(100) DEFAULT \'Puerto Rico\'',
      // Portal language
      'portal_language VARCHAR(5) DEFAULT \'es\'',
      'billing_country VARCHAR(100) DEFAULT \'Puerto Rico\'',
      // Status
      'is_active BOOLEAN DEFAULT true'
    ];

    for (const col of clientColumns) {
      try {
        await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS ${col}`);
      } catch (e) { /* column exists */ }
    }

    // ============================================
    // CLIENT EQUIPMENT
    // ============================================

    await query(`
      CREATE TABLE IF NOT EXISTS client_equipment (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

        equipment_type VARCHAR(100) NOT NULL,
        brand VARCHAR(255),
        model VARCHAR(255),
        serial_number VARCHAR(255),

        installation_date DATE,
        warranty_expires DATE,
        last_service_date DATE,

        specifications JSONB DEFAULT '{}',
        notes TEXT,
        photos JSONB DEFAULT '[]',

        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // CLIENT POOLS (Pool specifications)
    // ============================================

    await query(`
      CREATE TABLE IF NOT EXISTS pools (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

        name VARCHAR(255) DEFAULT 'Main Pool',
        pool_type VARCHAR(50) DEFAULT 'residential',
        surface_type VARCHAR(50),

        volume_gallons INTEGER,
        surface_area_sqft DECIMAL(10,2),
        length_feet DECIMAL(6,2),
        width_feet DECIMAL(6,2),
        depth_shallow DECIMAL(4,2),
        depth_deep DECIMAL(4,2),

        has_spa BOOLEAN DEFAULT false,
        has_heater BOOLEAN DEFAULT false,
        has_salt_system BOOLEAN DEFAULT false,
        has_automation BOOLEAN DEFAULT false,

        equipment_notes TEXT,
        address TEXT,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),

        service_day VARCHAR(20),
        service_frequency VARCHAR(50) DEFAULT 'weekly',
        monthly_rate DECIMAL(10,2),

        -- Ideal readings for this pool
        ideal_chlorine_min DECIMAL(4,2) DEFAULT 1.0,
        ideal_chlorine_max DECIMAL(4,2) DEFAULT 3.0,
        ideal_ph_min DECIMAL(4,2) DEFAULT 7.2,
        ideal_ph_max DECIMAL(4,2) DEFAULT 7.6,
        ideal_alkalinity_min DECIMAL(6,2) DEFAULT 80,
        ideal_alkalinity_max DECIMAL(6,2) DEFAULT 120,
        ideal_stabilizer_min DECIMAL(6,2) DEFAULT 30,
        ideal_stabilizer_max DECIMAL(6,2) DEFAULT 50,

        notes TEXT,
        photos JSONB DEFAULT '[]',

        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // ROUTES & SCHEDULING
    // ============================================

    // Routes (daily route for a technician)
    await query(`
      CREATE TABLE IF NOT EXISTS routes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,

        route_date DATE NOT NULL,
        day_of_week VARCHAR(20),

        status VARCHAR(20) DEFAULT 'planned',
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,

        total_stops INTEGER DEFAULT 0,
        completed_stops INTEGER DEFAULT 0,
        skipped_stops INTEGER DEFAULT 0,

        total_miles DECIMAL(10,2),
        estimated_hours DECIMAL(4,2),
        actual_hours DECIMAL(4,2),

        notes TEXT,
        optimized_at TIMESTAMP WITH TIME ZONE,

        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(company_id, technician_id, route_date)
      )
    `);

    // Route Stops
    await query(`
      CREATE TABLE IF NOT EXISTS route_stops (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

        sequence_order INTEGER NOT NULL,

        estimated_arrival TIME,
        estimated_duration INTEGER DEFAULT 30,

        actual_arrival TIMESTAMP WITH TIME ZONE,
        actual_departure TIMESTAMP WITH TIME ZONE,

        status VARCHAR(20) DEFAULT 'pending',
        skip_reason TEXT,

        service_record_id UUID,

        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Legacy route tables for backwards compatibility
    await query(`
      CREATE TABLE IF NOT EXISTS route_schedules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        technician_id UUID REFERENCES users(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        day_of_week VARCHAR(20) NOT NULL,
        route_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, technician_id, client_id, day_of_week)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS route_instances (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        technician_id UUID REFERENCES users(id) ON DELETE CASCADE,
        route_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'scheduled',
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, technician_id, route_date)
      )
    `);

    // ============================================
    // SERVICE RECORDS
    // ============================================

    await query(`
      CREATE TABLE IF NOT EXISTS service_records (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        pool_id UUID REFERENCES pools(id) ON DELETE SET NULL,
        technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
        route_stop_id UUID REFERENCES route_stops(id) ON DELETE SET NULL,

        -- Timing
        scheduled_date DATE NOT NULL,
        scheduled_time TIME,
        arrival_time TIMESTAMP WITH TIME ZONE,
        departure_time TIMESTAMP WITH TIME ZONE,
        duration_minutes INTEGER,

        status VARCHAR(20) DEFAULT 'pending',

        -- GPS
        arrival_latitude DECIMAL(10, 8),
        arrival_longitude DECIMAL(11, 8),
        departure_latitude DECIMAL(10, 8),
        departure_longitude DECIMAL(11, 8),

        -- Chemical Readings (current state of pool)
        reading_chlorine DECIMAL(4,2),
        reading_ph DECIMAL(4,2),
        reading_alkalinity DECIMAL(6,2),
        reading_stabilizer DECIMAL(6,2),
        reading_salt DECIMAL(8,2),
        reading_calcium DECIMAL(6,2),
        reading_phosphates DECIMAL(6,2),
        reading_tds DECIMAL(8,2),
        reading_temperature DECIMAL(5,2),

        -- Chemicals Applied
        applied_chlorine_gallons DECIMAL(4,2) DEFAULT 0,
        applied_acid_gallons DECIMAL(4,2) DEFAULT 0,
        applied_alkalinity_lbs DECIMAL(4,2) DEFAULT 0,
        applied_stabilizer_lbs DECIMAL(4,2) DEFAULT 0,
        applied_salt_lbs DECIMAL(6,2) DEFAULT 0,
        applied_shock_lbs DECIMAL(4,2) DEFAULT 0,
        applied_algaecide_oz DECIMAL(6,2) DEFAULT 0,
        applied_clarifier_oz DECIMAL(6,2) DEFAULT 0,
        applied_phosphate_remover_oz DECIMAL(6,2) DEFAULT 0,
        applied_other JSONB DEFAULT '[]',

        -- Checklist
        checklist_skimmer_basket BOOLEAN DEFAULT false,
        checklist_pump_basket BOOLEAN DEFAULT false,
        checklist_skim_surface BOOLEAN DEFAULT false,
        checklist_brush_walls BOOLEAN DEFAULT false,
        checklist_brush_floor BOOLEAN DEFAULT false,
        checklist_vacuum BOOLEAN DEFAULT false,
        checklist_check_filter_psi INTEGER,
        checklist_backwash BOOLEAN DEFAULT false,
        checklist_clean_filter BOOLEAN DEFAULT false,
        checklist_check_equipment BOOLEAN DEFAULT false,
        checklist_check_water_level BOOLEAN DEFAULT false,
        checklist_other JSONB DEFAULT '[]',

        -- Filter Maintenance (triggers reminders)
        filter_washed BOOLEAN DEFAULT false,
        filter_changed BOOLEAN DEFAULT false,

        -- Photos
        photos JSONB DEFAULT '[]',

        -- Notes
        technician_notes TEXT,
        internal_notes TEXT,

        -- Report Sent
        report_sent_to_client BOOLEAN DEFAULT false,
        report_sent_at TIMESTAMP WITH TIME ZONE,
        report_sent_via VARCHAR(20),

        -- Client Signature
        client_signature_url VARCHAR(500),
        signed_by VARCHAR(255),
        signed_at TIMESTAMP WITH TIME ZONE,

        -- Legacy columns
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
        signature_url VARCHAR(500),

        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // MAINTENANCE REMINDERS
    // ============================================

    await query(`
      CREATE TABLE IF NOT EXISTS maintenance_reminders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

        reminder_type VARCHAR(50) NOT NULL,
        description TEXT,

        frequency_weeks INTEGER DEFAULT 4,
        last_done_date DATE,
        next_due_date DATE,

        is_overdue BOOLEAN DEFAULT false,
        is_completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMP WITH TIME ZONE,
        completed_by UUID REFERENCES technicians(id),

        notify_client BOOLEAN DEFAULT false,
        notify_technician BOOLEAN DEFAULT true,

        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // CLIENT REQUESTS (from portal)
    // ============================================

    await query(`
      CREATE TABLE IF NOT EXISTS client_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

        request_type VARCHAR(50) NOT NULL,
        subject VARCHAR(255),
        message TEXT NOT NULL,

        status VARCHAR(20) DEFAULT 'pending',
        priority VARCHAR(20) DEFAULT 'normal',

        assigned_to UUID REFERENCES users(id),
        response TEXT,
        responded_at TIMESTAMP WITH TIME ZONE,
        responded_by UUID REFERENCES users(id),

        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // CHEMICALS & INVENTORY
    // ============================================

    await query(`
      CREATE TABLE IF NOT EXISTS chemicals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        unit VARCHAR(50) NOT NULL,
        cost_per_unit DECIMAL(10,2),
        sell_price_per_unit DECIMAL(10,2),
        default_dosage DECIMAL(10,2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

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

    await query(`
      CREATE TABLE IF NOT EXISTS service_chemicals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        service_record_id UUID NOT NULL REFERENCES service_records(id) ON DELETE CASCADE,
        chemical_id UUID REFERENCES chemicals(id),
        chemical_name VARCHAR(255),
        quantity_used DECIMAL(10,2) NOT NULL,
        unit VARCHAR(50),
        unit_cost DECIMAL(10,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // ESTIMATES
    // ============================================

    await query(`
      CREATE TABLE IF NOT EXISTS estimates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

        estimate_number VARCHAR(50) NOT NULL,

        title VARCHAR(255),
        description TEXT,

        subtotal DECIMAL(10,2) DEFAULT 0,
        tax_rate DECIMAL(5,2) DEFAULT 0,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) DEFAULT 0,

        valid_until DATE,

        status VARCHAR(20) DEFAULT 'draft',

        sent_at TIMESTAMP WITH TIME ZONE,
        viewed_at TIMESTAMP WITH TIME ZONE,
        accepted_at TIMESTAMP WITH TIME ZONE,
        declined_at TIMESTAMP WITH TIME ZONE,
        decline_reason TEXT,

        converted_to_invoice_id UUID,

        notes TEXT,
        terms TEXT,

        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(company_id, estimate_number)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS estimate_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,

        description TEXT NOT NULL,
        quantity DECIMAL(10,2) DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,

        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // INVOICES
    // ============================================

    await query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

        invoice_number VARCHAR(50) NOT NULL,

        -- Type & Recurring
        invoice_type VARCHAR(20) DEFAULT 'one_time',
        is_recurring BOOLEAN DEFAULT false,
        recurring_frequency VARCHAR(20),
        recurring_day INTEGER,
        recurring_start_date DATE,
        recurring_end_date DATE,
        parent_invoice_id UUID REFERENCES invoices(id),
        last_generated_date DATE,

        -- Amounts
        subtotal DECIMAL(10,2) DEFAULT 0,
        tax_rate DECIMAL(5,2) DEFAULT 0,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) DEFAULT 0,
        amount_paid DECIMAL(10,2) DEFAULT 0,
        balance_due DECIMAL(10,2) DEFAULT 0,

        -- Dates
        service_date DATE,
        issue_date DATE DEFAULT CURRENT_DATE,
        due_date DATE,
        billing_period_start DATE,
        billing_period_end DATE,

        -- Status
        status VARCHAR(20) DEFAULT 'draft',

        -- Payment Link
        payment_link VARCHAR(500),
        payment_link_provider VARCHAR(20),
        payment_link_expires TIMESTAMP WITH TIME ZONE,

        -- Auto-charge
        auto_charge_enabled BOOLEAN DEFAULT false,
        auto_charge_date DATE,
        auto_charge_attempted BOOLEAN DEFAULT false,
        auto_charge_failed_reason TEXT,
        retry_count INTEGER DEFAULT 0,
        next_retry_date DATE,

        -- Tracking
        sent_at TIMESTAMP WITH TIME ZONE,
        sent_via VARCHAR(20),
        viewed_at TIMESTAMP WITH TIME ZONE,
        paid_at TIMESTAMP WITH TIME ZONE,

        -- External IDs
        stripe_invoice_id VARCHAR(100),
        square_invoice_id VARCHAR(100),
        paypal_invoice_id VARCHAR(100),
        quickbooks_invoice_id VARCHAR(100),

        -- Notes
        notes TEXT,
        terms TEXT,
        footer TEXT,

        -- Adjustments
        adjustment_description VARCHAR(255),
        adjustment_amount DECIMAL(10,2) DEFAULT 0,

        -- From Estimate
        estimate_id UUID REFERENCES estimates(id),

        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(company_id, invoice_number)
      )
    `);

    // Add missing columns to invoices
    const invoiceColumns = [
      'adjustment_description VARCHAR(255)',
      'adjustment_amount DECIMAL(10,2) DEFAULT 0'
    ];

    for (const col of invoiceColumns) {
      try {
        await query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ${col}`);
      } catch (e) { /* column exists */ }
    }

    // ============================================
    // SERVICE ITEMS CATALOG (must be before invoice_items)
    // ============================================

    await query(`
      CREATE TABLE IF NOT EXISTS service_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100),
        description TEXT,
        item_type VARCHAR(50) DEFAULT 'service',
        category VARCHAR(100),

        base_price DECIMAL(10,2) NOT NULL,
        cost_price DECIMAL(10,2),
        unit VARCHAR(50) DEFAULT 'unit',
        tax_rate DECIMAL(5,2) DEFAULT 0,

        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns to service_items
    const serviceItemColumnsEarly = [
      'sku VARCHAR(100)',
      'cost_price DECIMAL(10,2)'
    ];

    for (const col of serviceItemColumnsEarly) {
      try {
        await query(`ALTER TABLE service_items ADD COLUMN IF NOT EXISTS ${col}`);
      } catch (e) { /* column exists */ }
    }

    await query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

        description TEXT NOT NULL,
        quantity DECIMAL(10,2) DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        tax_rate DECIMAL(5,2) DEFAULT 0,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        amount DECIMAL(10,2) NOT NULL,

        service_record_id UUID REFERENCES service_records(id),
        service_item_id UUID REFERENCES service_items(id),

        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns to invoice_items
    const invoiceItemColumns = [
      'discount_percent DECIMAL(5,2) DEFAULT 0',
      'discount_amount DECIMAL(10,2) DEFAULT 0'
    ];

    for (const col of invoiceItemColumns) {
      try {
        await query(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS ${col}`);
      } catch (e) { /* column exists */ }
    }

    await query(`
      CREATE TABLE IF NOT EXISTS invoice_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,

        next_invoice_number INTEGER DEFAULT 1,
        invoice_prefix VARCHAR(20) DEFAULT 'INV-',
        next_estimate_number INTEGER DEFAULT 1,
        estimate_prefix VARCHAR(20) DEFAULT 'EST-',

        default_due_days INTEGER DEFAULT 30,
        default_tax_rate DECIMAL(5,2) DEFAULT 0,
        default_terms TEXT,
        default_notes TEXT,

        auto_generate_monthly BOOLEAN DEFAULT false,
        auto_generate_day INTEGER DEFAULT 1,
        auto_send_invoices BOOLEAN DEFAULT false,
        send_via VARCHAR(20) DEFAULT 'email',

        overdue_reminder_days JSONB DEFAULT '[7, 14, 30]',
        auto_charge_on_due BOOLEAN DEFAULT false,

        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // PAYMENTS
    // ============================================

    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

        amount DECIMAL(10,2) NOT NULL,

        payment_method VARCHAR(50) NOT NULL,
        payment_reference VARCHAR(255),

        status VARCHAR(20) DEFAULT 'completed',

        -- External References
        stripe_payment_id VARCHAR(100),
        square_payment_id VARCHAR(100),
        paypal_payment_id VARCHAR(100),
        transaction_id VARCHAR(255),

        -- Card Details (masked)
        card_last4 VARCHAR(4),
        card_brand VARCHAR(20),

        -- Metadata
        metadata JSONB DEFAULT '{}',
        notes TEXT,

        -- Failure Info
        failure_code VARCHAR(50),
        failure_message TEXT,

        refunded_amount DECIMAL(10,2) DEFAULT 0,
        refund_reason TEXT,

        payment_date DATE DEFAULT CURRENT_DATE,
        processed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS payment_retries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

        attempt_number INTEGER NOT NULL,
        attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

        success BOOLEAN DEFAULT false,
        error_code VARCHAR(50),
        error_message TEXT,

        next_retry_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // ============================================
    // CLIENT SERVICE ITEMS (services assigned to clients)
    // ============================================

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

    // Legacy client_rates for backwards compatibility
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
    // NOTIFICATIONS
    // ============================================

    await query(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,

        subject VARCHAR(255),
        body_email TEXT,
        body_sms VARCHAR(500),
        body_whatsapp TEXT,

        variables JSONB DEFAULT '[]',

        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS notification_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

        recipient_type VARCHAR(20),
        recipient_id UUID,
        recipient_contact VARCHAR(255),

        channel VARCHAR(20) NOT NULL,

        template_id UUID REFERENCES notification_templates(id),
        subject VARCHAR(255),
        content TEXT,

        status VARCHAR(20) DEFAULT 'pending',

        sent_at TIMESTAMP WITH TIME ZONE,
        delivered_at TIMESTAMP WITH TIME ZONE,
        failed_at TIMESTAMP WITH TIME ZONE,
        failure_reason TEXT,

        external_id VARCHAR(255),

        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // ALERTS
    // ============================================

    await query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        pool_id UUID REFERENCES pools(id) ON DELETE CASCADE,

        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'active',

        alert_type VARCHAR(50),
        related_entity_type VARCHAR(50),
        related_entity_id UUID,

        resolved_at TIMESTAMP WITH TIME ZONE,
        resolved_by UUID REFERENCES users(id),
        resolution_notes TEXT,

        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================
    // AUDIT LOG
    // ============================================

    await query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

        user_id UUID,
        user_type VARCHAR(20),
        user_email VARCHAR(255),

        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,

        old_values JSONB,
        new_values JSONB,

        ip_address VARCHAR(45),
        user_agent TEXT,

        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
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

    // ============================================
    // INDEXES
    // ============================================

    const indexes = [
      // Clients
      'CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id)',
      'CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(company_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_clients_technician ON clients(assigned_technician_id)',
      'CREATE INDEX IF NOT EXISTS idx_clients_service_days ON clients USING gin(service_days)',

      // Technicians
      'CREATE INDEX IF NOT EXISTS idx_technicians_company ON technicians(company_id)',

      // Routes
      'CREATE INDEX IF NOT EXISTS idx_routes_date ON routes(company_id, route_date)',
      'CREATE INDEX IF NOT EXISTS idx_routes_tech_date ON routes(technician_id, route_date)',
      'CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id, sequence_order)',

      // Service Records
      'CREATE INDEX IF NOT EXISTS idx_service_records_client ON service_records(client_id, scheduled_date DESC)',
      'CREATE INDEX IF NOT EXISTS idx_service_records_date ON service_records(company_id, scheduled_date DESC)',
      'CREATE INDEX IF NOT EXISTS idx_service_records_tech ON service_records(technician_id, scheduled_date DESC)',

      // Invoices
      'CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_company_status ON invoices(company_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(company_id, due_date) WHERE status IN (\'sent\', \'overdue\')',
      'CREATE INDEX IF NOT EXISTS idx_invoices_recurring ON invoices(company_id, is_recurring) WHERE is_recurring = true',

      // Payments
      'CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id)',
      'CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id, created_at DESC)',

      // Estimates
      'CREATE INDEX IF NOT EXISTS idx_estimates_client ON estimates(client_id, status)',

      // Maintenance
      'CREATE INDEX IF NOT EXISTS idx_maintenance_due ON maintenance_reminders(company_id, next_due_date) WHERE is_completed = false',

      // Audit
      'CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_log(company_id, created_at DESC)'
    ];

    for (const idx of indexes) {
      try { await query(idx); } catch (e) { /* index exists */ }
    }

    // ============================================
    // SEED DEFAULT DATA
    // ============================================

    // Default subscription plans
    await query(`
      INSERT INTO subscription_plans (name, display_name, description, monthly_price, annual_price, max_users, max_clients, max_technicians, features, sort_order)
      VALUES
        ('trial', 'Trial Gratuito', '14 días de prueba con todas las funciones', 0, 0, 2, 25, 1, '["basic_features"]', 0),
        ('starter', 'Starter', 'Perfecto para operaciones pequeñas', 49.00, 490.00, 3, 50, 2, '["basic_features", "email_support"]', 1),
        ('professional', 'Professional', 'Para empresas en crecimiento', 99.00, 990.00, 10, 200, 5, '["all_features", "priority_support", "integrations"]', 2),
        ('enterprise', 'Enterprise', 'Sin límites para empresas grandes', 199.00, 1990.00, -1, -1, -1, '["all_features", "dedicated_support", "api_access", "white_label"]', 3)
      ON CONFLICT (name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        monthly_price = EXCLUDED.monthly_price,
        annual_price = EXCLUDED.annual_price,
        max_users = EXCLUDED.max_users,
        max_clients = EXCLUDED.max_clients,
        max_technicians = EXCLUDED.max_technicians,
        features = EXCLUDED.features
    `);

    logger.info('Database migrations completed successfully!');

  } catch (error) {
    logger.error('Migration error:', error.message);
    throw error;
  }
}

module.exports = { runMigrations };
