const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const router = express.Router();

// Middleware for portal authentication
const portalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'portal') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const result = await query(
      'SELECT id, name, last_name, company_name, email, phone, portal_email, company_id FROM clients WHERE id = $1 AND portal_enabled = true',
      [decoded.clientId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Client not found or portal disabled' });
    }

    req.client = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ============================================
// PORTAL AUTH
// ============================================

// Portal Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await query(
      `SELECT id, name, last_name, company_name, email, portal_email, portal_password_hash, company_id
       FROM clients
       WHERE (portal_email = $1 OR email = $1) AND portal_enabled = true`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const client = result.rows[0];

    if (!client.portal_password_hash) {
      return res.status(401).json({ error: 'Portal access not configured' });
    }

    const validPassword = await bcrypt.compare(password, client.portal_password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await query(
      'UPDATE clients SET portal_last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [client.id]
    );

    // Generate JWT
    const token = jwt.sign(
      { clientId: client.id, type: 'portal' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      client: {
        id: client.id,
        name: client.name,
        lastName: client.last_name,
        companyName: client.company_name,
        email: client.portal_email || client.email
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current client profile
router.get('/profile', portalAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, last_name, company_name, email, phone, address, city, state, zip_code,
              portal_email, service_day, service_frequency, client_type
       FROM clients WHERE id = $1`,
      [req.client.id]
    );

    res.json({ client: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching profile' });
  }
});

// ============================================
// SERVICE HISTORY
// ============================================

// Get service history (from route stops)
router.get('/services', portalAuth, async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const result = await query(
      `SELECT rs.id, rs.status, rs.arrival_time, rs.departure_time, rs.notes,
              ri.route_date, ri.status as route_status,
              u.first_name as technician_first_name, u.last_name as technician_last_name
       FROM route_stops rs
       JOIN route_instances ri ON rs.route_instance_id = ri.id
       JOIN users u ON ri.technician_id = u.id
       WHERE rs.client_id = $1
       ORDER BY ri.route_date DESC
       LIMIT $2 OFFSET $3`,
      [req.client.id, limit, offset]
    );

    // Also get legacy service_records if they exist
    const legacyResult = await query(
      `SELECT sr.*, p.name as pool_name,
              u.first_name as technician_first_name, u.last_name as technician_last_name
       FROM service_records sr
       JOIN pools p ON sr.pool_id = p.id
       JOIN users u ON sr.technician_id = u.id
       WHERE p.client_id = $1
       ORDER BY sr.scheduled_date DESC
       LIMIT $2 OFFSET $3`,
      [req.client.id, limit, offset]
    );

    res.json({
      services: result.rows,
      legacyServices: legacyResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get upcoming services
router.get('/services/upcoming', portalAuth, async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT rs.id, rs.stop_order, rs.status,
              ri.route_date, ri.status as route_status,
              u.first_name as technician_first_name, u.last_name as technician_last_name
       FROM route_stops rs
       JOIN route_instances ri ON rs.route_instance_id = ri.id
       JOIN users u ON ri.technician_id = u.id
       WHERE rs.client_id = $1 AND ri.route_date >= $2 AND rs.status = 'pending'
       ORDER BY ri.route_date ASC
       LIMIT 10`,
      [req.client.id, today]
    );

    res.json({ upcoming: result.rows });
  } catch (error) {
    next(error);
  }
});

// ============================================
// BILLING / RATES
// ============================================

// Get client rates
router.get('/rates', portalAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, amount, frequency, is_active, next_billing_date
       FROM client_rates
       WHERE client_id = $1 AND is_active = true
       ORDER BY name`,
      [req.client.id]
    );

    res.json({ rates: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get invoices
router.get('/invoices', portalAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, invoice_number, status, subtotal, tax_amount, total,
              amount_paid, balance_due, issue_date, due_date, paid_date,
              billing_period_start, billing_period_end, created_at
       FROM invoices
       WHERE client_id = $1 AND status != 'draft'
       ORDER BY issue_date DESC
       LIMIT 50`,
      [req.client.id]
    );

    res.json({ invoices: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get single invoice details for portal
router.get('/invoices/:id', portalAuth, async (req, res, next) => {
  try {
    const invoiceResult = await query(
      `SELECT i.*,
              comp.name as company_name,
              comp.address as company_address,
              comp.phone as company_phone,
              comp.email as company_email,
              comp.logo_url as company_logo
       FROM invoices i
       JOIN companies comp ON i.company_id = comp.id
       WHERE i.id = $1 AND i.client_id = $2 AND i.status != 'draft'`,
      [req.params.id, req.client.id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const itemsResult = await query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at',
      [req.params.id]
    );

    res.json({
      invoice: invoiceResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// EQUIPMENT
// ============================================

// Get client equipment
router.get('/equipment', portalAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, equipment_type, brand, model, serial_number, install_date, notes
       FROM client_equipment
       WHERE client_id = $1
       ORDER BY equipment_type`,
      [req.client.id]
    );

    res.json({ equipment: result.rows });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ADMIN: PORTAL MANAGEMENT
// ============================================

// These routes are for admins to manage client portal access
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

// Enable portal access for a client
router.post('/admin/enable/:clientId', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Get client info
    const clientResult = await query(
      'SELECT id, email FROM clients WHERE id = $1 AND company_id = $2',
      [req.params.clientId, req.user.company_id]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const portalEmail = email || clientResult.rows[0].email;
    const passwordHash = await bcrypt.hash(password, 12);

    await query(
      `UPDATE clients
       SET portal_enabled = true, portal_email = $1, portal_password_hash = $2
       WHERE id = $3`,
      [portalEmail, passwordHash, req.params.clientId]
    );

    res.json({ message: 'Portal access enabled', portalEmail });
  } catch (error) {
    next(error);
  }
});

// Disable portal access
router.post('/admin/disable/:clientId', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    await query(
      `UPDATE clients SET portal_enabled = false WHERE id = $1 AND company_id = $2`,
      [req.params.clientId, req.user.company_id]
    );

    res.json({ message: 'Portal access disabled' });
  } catch (error) {
    next(error);
  }
});

// Reset portal password
router.post('/admin/reset-password/:clientId', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await query(
      `UPDATE clients SET portal_password_hash = $1 WHERE id = $2 AND company_id = $3`,
      [passwordHash, req.params.clientId, req.user.company_id]
    );

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
