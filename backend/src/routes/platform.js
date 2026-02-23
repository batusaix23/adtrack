const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const router = express.Router();

// Platform Admin Authentication Middleware
const platformAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'platform_admin') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const result = await query(
      'SELECT id, email, first_name, last_name FROM platform_admins WHERE id = $1 AND is_active = true',
      [decoded.adminId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Admin not found' });
    }

    req.platformAdmin = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Log activity
const logActivity = async (adminId, action, entityType, entityId, details, ip) => {
  try {
    await query(
      `INSERT INTO platform_activity_log (admin_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, action, entityType, entityId, JSON.stringify(details), ip]
    );
  } catch (e) {
    console.error('Failed to log activity:', e);
  }
};

// ============================================
// AUTHENTICATION
// ============================================

// Platform Admin Login
router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await query(
      'SELECT * FROM platform_admins WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await query(
      'UPDATE platform_admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [admin.id]
    );

    const token = jwt.sign(
      { adminId: admin.id, type: 'platform_admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logActivity(admin.id, 'login', 'platform_admin', admin.id, {}, req.ip);

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current admin profile
router.get('/auth/me', platformAuth, (req, res) => {
  res.json({ admin: req.platformAdmin });
});

// ============================================
// DASHBOARD & STATISTICS
// ============================================

// Get platform dashboard stats
router.get('/dashboard', platformAuth, async (req, res, next) => {
  try {
    const [
      companiesStats,
      revenueStats,
      recentCompanies,
      expiringTrials
    ] = await Promise.all([
      // Companies by status
      query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE subscription_status = 'active') as active,
          COUNT(*) FILTER (WHERE subscription_status = 'trial') as trial,
          COUNT(*) FILTER (WHERE subscription_status = 'expired') as expired,
          COUNT(*) FILTER (WHERE subscription_status = 'suspended') as suspended
        FROM companies
      `),
      // Revenue stats
      query(`
        SELECT
          COALESCE(SUM(monthly_price) FILTER (WHERE subscription_status = 'active'), 0) as mrr,
          COUNT(*) FILTER (WHERE last_payment_at >= CURRENT_DATE - INTERVAL '30 days') as paid_this_month
        FROM companies
      `),
      // Recent companies
      query(`
        SELECT id, name, email, subscription_plan, subscription_status, created_at
        FROM companies
        ORDER BY created_at DESC
        LIMIT 5
      `),
      // Trials expiring soon
      query(`
        SELECT id, name, email, trial_ends_at
        FROM companies
        WHERE subscription_status = 'trial'
          AND trial_ends_at <= CURRENT_TIMESTAMP + INTERVAL '7 days'
        ORDER BY trial_ends_at ASC
        LIMIT 10
      `)
    ]);

    // Get total users and clients across platform
    const totals = await query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM clients) as total_clients,
        (SELECT COUNT(*) FROM service_records WHERE scheduled_date >= CURRENT_DATE - INTERVAL '30 days') as services_30d
    `);

    res.json({
      companies: companiesStats.rows[0],
      revenue: revenueStats.rows[0],
      recentCompanies: recentCompanies.rows,
      expiringTrials: expiringTrials.rows,
      totals: totals.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// COMPANIES MANAGEMENT
// ============================================

// Get all companies
router.get('/companies', platformAuth, async (req, res, next) => {
  try {
    const { status, plan, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT c.*,
             (SELECT COUNT(*) FROM users WHERE company_id = c.id) as user_count,
             (SELECT COUNT(*) FROM clients WHERE company_id = c.id) as client_count
      FROM companies c
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND c.subscription_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (plan) {
      sql += ` AND c.subscription_plan = $${paramIndex}`;
      params.push(plan);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) FROM companies WHERE 1=1';
    const countParams = [];
    let countIndex = 1;

    if (status) {
      countSql += ` AND subscription_status = $${countIndex}`;
      countParams.push(status);
      countIndex++;
    }
    if (plan) {
      countSql += ` AND subscription_plan = $${countIndex}`;
      countParams.push(plan);
      countIndex++;
    }
    if (search) {
      countSql += ` AND (name ILIKE $${countIndex} OR email ILIKE $${countIndex})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await query(countSql, countParams);

    res.json({
      companies: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (error) {
    next(error);
  }
});

// Get single company details
router.get('/companies/:id', platformAuth, async (req, res, next) => {
  try {
    const companyResult = await query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM users WHERE company_id = c.id) as user_count,
              (SELECT COUNT(*) FROM clients WHERE company_id = c.id) as client_count,
              (SELECT COUNT(*) FROM pools WHERE company_id = c.id) as pool_count,
              (SELECT COUNT(*) FROM service_records WHERE company_id = c.id) as total_services
       FROM companies c
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get users
    const usersResult = await query(
      'SELECT id, email, first_name, last_name, role, is_active, last_login_at FROM users WHERE company_id = $1',
      [req.params.id]
    );

    // Get recent activity
    const activityResult = await query(
      `SELECT 'service' as type, scheduled_date as date, status
       FROM service_records WHERE company_id = $1
       ORDER BY scheduled_date DESC LIMIT 10`,
      [req.params.id]
    );

    res.json({
      company: companyResult.rows[0],
      users: usersResult.rows,
      recentActivity: activityResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Update company
router.put('/companies/:id', platformAuth, async (req, res, next) => {
  try {
    const {
      subscriptionPlan,
      subscriptionStatus,
      subscriptionExpiresAt,
      maxUsers,
      maxClients,
      monthlyPrice,
      notes,
      isActive
    } = req.body;

    const result = await query(
      `UPDATE companies SET
        subscription_plan = COALESCE($1, subscription_plan),
        subscription_status = COALESCE($2, subscription_status),
        subscription_expires_at = COALESCE($3, subscription_expires_at),
        max_users = COALESCE($4, max_users),
        max_clients = COALESCE($5, max_clients),
        monthly_price = COALESCE($6, monthly_price),
        notes = COALESCE($7, notes),
        is_active = COALESCE($8, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [subscriptionPlan, subscriptionStatus, subscriptionExpiresAt, maxUsers, maxClients, monthlyPrice, notes, isActive, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    await logActivity(req.platformAdmin.id, 'update_company', 'company', req.params.id, req.body, req.ip);

    res.json({ company: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Suspend company
router.post('/companies/:id/suspend', platformAuth, async (req, res, next) => {
  try {
    const { reason } = req.body;

    await query(
      `UPDATE companies SET subscription_status = 'suspended', is_active = false, notes = COALESCE(notes || E'\n', '') || $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [`[SUSPENDED] ${new Date().toISOString()}: ${reason || 'No reason provided'}`, req.params.id]
    );

    await logActivity(req.platformAdmin.id, 'suspend_company', 'company', req.params.id, { reason }, req.ip);

    res.json({ message: 'Company suspended' });
  } catch (error) {
    next(error);
  }
});

// Activate company
router.post('/companies/:id/activate', platformAuth, async (req, res, next) => {
  try {
    const { plan, expiresAt } = req.body;

    await query(
      `UPDATE companies SET
        subscription_status = 'active',
        subscription_plan = COALESCE($1, subscription_plan),
        subscription_expires_at = $2,
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [plan, expiresAt, req.params.id]
    );

    await logActivity(req.platformAdmin.id, 'activate_company', 'company', req.params.id, { plan, expiresAt }, req.ip);

    res.json({ message: 'Company activated' });
  } catch (error) {
    next(error);
  }
});

// Extend trial
router.post('/companies/:id/extend-trial', platformAuth, async (req, res, next) => {
  try {
    const { days = 14 } = req.body;

    await query(
      `UPDATE companies SET
        trial_ends_at = CURRENT_TIMESTAMP + INTERVAL '1 day' * $1,
        subscription_status = 'trial',
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [days, req.params.id]
    );

    await logActivity(req.platformAdmin.id, 'extend_trial', 'company', req.params.id, { days }, req.ip);

    res.json({ message: `Trial extended by ${days} days` });
  } catch (error) {
    next(error);
  }
});

// Delete company (dangerous!)
router.delete('/companies/:id', platformAuth, async (req, res, next) => {
  try {
    const { confirm } = req.body;

    if (confirm !== 'DELETE') {
      return res.status(400).json({ error: 'Please confirm deletion by sending confirm: "DELETE"' });
    }

    // Log before deletion
    await logActivity(req.platformAdmin.id, 'delete_company', 'company', req.params.id, {}, req.ip);

    await query('DELETE FROM companies WHERE id = $1', [req.params.id]);

    res.json({ message: 'Company deleted' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// SUBSCRIPTION PLANS
// ============================================

// Get all plans
router.get('/plans', platformAuth, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM subscription_plans ORDER BY monthly_price ASC');
    res.json({ plans: result.rows });
  } catch (error) {
    next(error);
  }
});

// Update plan
router.put('/plans/:id', platformAuth, async (req, res, next) => {
  try {
    const { displayName, monthlyPrice, annualPrice, maxUsers, maxClients, features, isActive } = req.body;

    const result = await query(
      `UPDATE subscription_plans SET
        display_name = COALESCE($1, display_name),
        monthly_price = COALESCE($2, monthly_price),
        annual_price = COALESCE($3, annual_price),
        max_users = COALESCE($4, max_users),
        max_clients = COALESCE($5, max_clients),
        features = COALESCE($6, features),
        is_active = COALESCE($7, is_active)
       WHERE id = $8
       RETURNING *`,
      [displayName, monthlyPrice, annualPrice, maxUsers, maxClients, JSON.stringify(features), isActive, req.params.id]
    );

    res.json({ plan: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ACTIVITY LOG
// ============================================

router.get('/activity', platformAuth, async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const result = await query(
      `SELECT l.*, a.email as admin_email, a.first_name as admin_first_name
       FROM platform_activity_log l
       LEFT JOIN platform_admins a ON l.admin_id = a.id
       ORDER BY l.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({ activities: result.rows });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PLATFORM ADMIN MANAGEMENT
// ============================================

// Create platform admin (only existing admins can create new ones)
router.post('/admins', platformAuth, async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO platform_admins (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name, last_name`,
      [email.toLowerCase(), passwordHash, firstName, lastName]
    );

    await logActivity(req.platformAdmin.id, 'create_admin', 'platform_admin', result.rows[0].id, { email }, req.ip);

    res.status(201).json({ admin: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    next(error);
  }
});

// Setup first platform admin (only works if no admins exist)
router.post('/setup', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, setupKey } = req.body;

    // Check if any admin exists
    const existingAdmin = await query('SELECT COUNT(*) FROM platform_admins');

    if (parseInt(existingAdmin.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Platform already has administrators' });
    }

    // Verify setup key (should be set as environment variable)
    const validSetupKey = process.env.PLATFORM_SETUP_KEY || 'aguadulce-setup-2024';
    if (setupKey !== validSetupKey) {
      return res.status(401).json({ error: 'Invalid setup key' });
    }

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO platform_admins (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name, last_name`,
      [email.toLowerCase(), passwordHash, firstName, lastName]
    );

    res.status(201).json({
      message: 'Platform admin created successfully',
      admin: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
