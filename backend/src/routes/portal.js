const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const router = express.Router();

// ============================================
// PORTAL AUTH MIDDLEWARE
// ============================================

const portalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No autorizado', code: 'NO_TOKEN' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Sesión expirada', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Token inválido', code: 'INVALID_TOKEN' });
    }

    if (decoded.type !== 'portal') {
      return res.status(401).json({ error: 'Tipo de token inválido', code: 'INVALID_TYPE' });
    }

    const result = await query(
      `SELECT c.*, comp.company_name as service_company_name
       FROM clients c
       JOIN companies comp ON c.company_id = comp.id
       WHERE c.id = $1 AND c.portal_enabled = true AND c.is_active = true AND comp.is_active = true`,
      [decoded.clientId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Cliente no encontrado o portal deshabilitado', code: 'CLIENT_INACTIVE' });
    }

    req.client = result.rows[0];
    next();
  } catch (error) {
    console.error('Portal auth error:', error);
    return res.status(500).json({ error: 'Error de autenticación', code: 'AUTH_ERROR' });
  }
};

// ============================================
// AUTHENTICATION
// ============================================

// Portal Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, companyCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    // Find client by email
    let clientQuery = `
      SELECT c.*, comp.company_name as service_company_name, comp.slug as company_slug
      FROM clients c
      JOIN companies comp ON c.company_id = comp.id
      WHERE (c.portal_email = $1 OR c.email = $1)
        AND c.portal_enabled = true
        AND c.is_active = true
        AND comp.is_active = true
    `;
    const params = [email.toLowerCase()];

    if (companyCode) {
      clientQuery += ' AND comp.slug = $2';
      params.push(companyCode);
    }

    const result = await query(clientQuery, params);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const client = result.rows[0];

    if (!client.portal_password_hash) {
      return res.status(401).json({ error: 'Acceso al portal no configurado' });
    }

    const validPassword = await bcrypt.compare(password, client.portal_password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Update last login
    await query(
      'UPDATE clients SET portal_last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [client.id]
    );

    // Generate tokens
    const accessToken = jwt.sign(
      { clientId: client.id, companyId: client.company_id, type: 'portal' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { clientId: client.id, companyId: client.company_id, type: 'portal_refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      accessToken,
      refreshToken,
      client: {
        id: client.id,
        firstName: client.first_name,
        lastName: client.last_name,
        companyName: client.company_name,
        email: client.portal_email || client.email,
        serviceCompany: client.service_company_name
      }
    });
  } catch (error) {
    console.error('Portal login error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    if (decoded.type !== 'portal_refresh') {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const result = await query(
      'SELECT id, company_id FROM clients WHERE id = $1 AND portal_enabled = true AND is_active = true',
      [decoded.clientId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Cliente no encontrado' });
    }

    const client = result.rows[0];

    const newAccessToken = jwt.sign(
      { clientId: client.id, companyId: client.company_id, type: 'portal' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ============================================
// PROFILE
// ============================================

router.get('/profile', portalAuth, async (req, res) => {
  try {
    const client = req.client;

    // Get pool info
    const poolResult = await query(
      `SELECT id, name, volume_gallons, has_spa, has_salt_system, pool_type
       FROM pools WHERE client_id = $1 AND is_active = true`,
      [client.id]
    );

    // Get assigned technician
    let technician = null;
    if (client.assigned_technician_id) {
      const techResult = await query(
        'SELECT id, first_name, last_name, phone FROM technicians WHERE id = $1',
        [client.assigned_technician_id]
      );
      if (techResult.rows.length > 0) {
        technician = techResult.rows[0];
      }
    }

    res.json({
      client: {
        id: client.id,
        firstName: client.first_name,
        lastName: client.last_name,
        companyName: client.company_name,
        email: client.portal_email || client.email,
        phone: client.phone,
        address: client.address,
        city: client.city,
        state: client.state,
        zipCode: client.zip_code,
        serviceDay: client.service_day,
        serviceDays: client.service_days,
        serviceFrequency: client.service_frequency,
        clientType: client.client_type,
        monthlyServiceCost: client.monthly_service_cost,
        gateCode: client.gate_code,
        accessNotes: client.access_notes,
        serviceCompany: client.service_company_name
      },
      pools: poolResult.rows,
      technician
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Error cargando perfil' });
  }
});

// ============================================
// SERVICES
// ============================================

// Get service history
router.get('/services', portalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const countResult = await query(
      `SELECT COUNT(*) FROM service_records WHERE client_id = $1 AND status = 'completed'`,
      [req.client.id]
    );

    const result = await query(
      `SELECT sr.*,
              t.first_name as technician_first_name,
              t.last_name as technician_last_name,
              p.name as pool_name
       FROM service_records sr
       LEFT JOIN technicians t ON sr.technician_id = t.id
       LEFT JOIN pools p ON p.client_id = sr.client_id AND p.is_active = true
       WHERE sr.client_id = $1 AND sr.status = 'completed'
       ORDER BY sr.scheduled_date DESC, sr.departure_time DESC
       LIMIT $2 OFFSET $3`,
      [req.client.id, limit, offset]
    );

    res.json({
      services: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Error cargando servicios' });
  }
});

// Get single service details
router.get('/services/:id', portalAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT sr.*,
              t.first_name as technician_first_name,
              t.last_name as technician_last_name,
              p.name as pool_name
       FROM service_records sr
       LEFT JOIN technicians t ON sr.technician_id = t.id
       LEFT JOIN pools p ON p.client_id = sr.client_id AND p.is_active = true
       WHERE sr.id = $1 AND sr.client_id = $2`,
      [req.params.id, req.client.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    res.json({ service: result.rows[0] });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Error cargando servicio' });
  }
});

// Get upcoming services
router.get('/services/upcoming', portalAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT rs.id, rs.sequence_order, rs.status, rs.estimated_arrival,
              r.route_date, r.status as route_status,
              t.first_name as technician_first_name,
              t.last_name as technician_last_name
       FROM route_stops rs
       JOIN routes r ON rs.route_id = r.id
       LEFT JOIN technicians t ON r.technician_id = t.id
       WHERE rs.client_id = $1 AND r.route_date >= $2 AND rs.status = 'pending'
       ORDER BY r.route_date ASC
       LIMIT 10`,
      [req.client.id, today]
    );

    res.json({ upcoming: result.rows });
  } catch (error) {
    console.error('Error fetching upcoming services:', error);
    res.status(500).json({ error: 'Error cargando próximos servicios' });
  }
});

// ============================================
// BILLING & INVOICES
// ============================================

// Get client rates
router.get('/rates', portalAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, amount, frequency, is_active, next_billing_date
       FROM client_rates
       WHERE client_id = $1 AND is_active = true
       ORDER BY name`,
      [req.client.id]
    );

    // Also get monthly service cost from client record
    const monthlyCost = req.client.monthly_service_cost;

    res.json({
      rates: result.rows,
      monthlyServiceCost: monthlyCost
    });
  } catch (error) {
    console.error('Error fetching rates:', error);
    res.status(500).json({ error: 'Error cargando tarifas' });
  }
});

// Get invoices
router.get('/invoices', portalAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE i.client_id = $1 AND i.status != $2';
    const params = [req.client.id, 'draft'];
    let paramCount = 3;

    if (status) {
      whereClause += ` AND i.status = $${paramCount++}`;
      params.push(status);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM invoices i ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await query(
      `SELECT i.id, i.invoice_number, i.invoice_type, i.status,
              i.subtotal, i.tax_amount, i.discount_amount, i.total,
              i.amount_paid, i.balance_due, i.issue_date, i.due_date, i.paid_date,
              i.billing_period_start, i.billing_period_end
       FROM invoices i
       ${whereClause}
       ORDER BY i.issue_date DESC
       LIMIT $${paramCount++} OFFSET $${paramCount}`,
      params
    );

    // Get summary
    const summaryResult = await query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'sent') as pending_count,
        COALESCE(SUM(balance_due) FILTER (WHERE status IN ('sent', 'overdue')), 0) as total_due,
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count
       FROM invoices
       WHERE client_id = $1 AND status != 'draft'`,
      [req.client.id]
    );

    res.json({
      invoices: result.rows,
      summary: summaryResult.rows[0],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Error cargando facturas' });
  }
});

// Get single invoice with items
router.get('/invoices/:id', portalAuth, async (req, res) => {
  try {
    const invoiceResult = await query(
      `SELECT i.*,
              c.company_name as company_name,
              c.address as company_address,
              c.city as company_city,
              c.state as company_state,
              c.zip_code as company_zip,
              c.phone as company_phone,
              c.email as company_email,
              c.logo_url as company_logo,
              c.fei_ein as company_tax_id
       FROM invoices i
       JOIN companies c ON i.company_id = c.id
       WHERE i.id = $1 AND i.client_id = $2 AND i.status != 'draft'`,
      [req.params.id, req.client.id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const itemsResult = await query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order, created_at',
      [req.params.id]
    );

    const paymentsResult = await query(
      `SELECT id, amount, payment_method, payment_date, reference_number, notes
       FROM payments
       WHERE invoice_id = $1 AND status = 'completed'
       ORDER BY payment_date DESC`,
      [req.params.id]
    );

    res.json({
      invoice: invoiceResult.rows[0],
      items: itemsResult.rows,
      payments: paymentsResult.rows
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Error cargando factura' });
  }
});

// ============================================
// EQUIPMENT
// ============================================

router.get('/equipment', portalAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, equipment_type, brand, model, serial_number, install_date,
              warranty_expiration, last_service_date, condition, notes
       FROM client_equipment
       WHERE client_id = $1
       ORDER BY equipment_type`,
      [req.client.id]
    );

    res.json({ equipment: result.rows });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ error: 'Error cargando equipos' });
  }
});

// ============================================
// CLIENT REQUESTS
// ============================================

// Submit a service request
router.post('/requests', portalAuth, async (req, res) => {
  try {
    const { requestType, description, preferredDate, urgency } = req.body;

    if (!requestType || !description) {
      return res.status(400).json({ error: 'Tipo de solicitud y descripción requeridos' });
    }

    const result = await query(
      `INSERT INTO client_requests (
        company_id, client_id, request_type, description,
        preferred_date, urgency, status
       ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [
        req.client.company_id, req.client.id, requestType, description,
        preferredDate || null, urgency || 'normal'
      ]
    );

    res.status(201).json({ request: result.rows[0] });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Error creando solicitud' });
  }
});

// Get client's requests
router.get('/requests', portalAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM client_requests
       WHERE client_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.client.id]
    );

    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Error cargando solicitudes' });
  }
});

// ============================================
// ADMIN: PORTAL MANAGEMENT
// ============================================

const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

// Enable portal access for a client
router.post('/admin/enable/:clientId', authenticate, authorizeRoles('owner', 'admin'), async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const clientResult = await query(
      'SELECT id, email FROM clients WHERE id = $1 AND company_id = $2',
      [req.params.clientId, req.user.company_id]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const portalEmail = email || clientResult.rows[0].email;
    const passwordHash = await bcrypt.hash(password, 12);

    await query(
      `UPDATE clients
       SET portal_enabled = true, portal_email = $1, portal_password_hash = $2
       WHERE id = $3`,
      [portalEmail, passwordHash, req.params.clientId]
    );

    res.json({ message: 'Acceso al portal habilitado', portalEmail });
  } catch (error) {
    console.error('Error enabling portal:', error);
    res.status(500).json({ error: 'Error habilitando portal' });
  }
});

// Disable portal access
router.post('/admin/disable/:clientId', authenticate, authorizeRoles('owner', 'admin'), async (req, res) => {
  try {
    await query(
      `UPDATE clients SET portal_enabled = false WHERE id = $1 AND company_id = $2`,
      [req.params.clientId, req.user.company_id]
    );

    res.json({ message: 'Acceso al portal deshabilitado' });
  } catch (error) {
    console.error('Error disabling portal:', error);
    res.status(500).json({ error: 'Error deshabilitando portal' });
  }
});

// Reset portal password
router.post('/admin/reset-password/:clientId', authenticate, authorizeRoles('owner', 'admin'), async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await query(
      `UPDATE clients SET portal_password_hash = $1 WHERE id = $2 AND company_id = $3`,
      [passwordHash, req.params.clientId, req.user.company_id]
    );

    res.json({ message: 'Contraseña actualizada' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Error actualizando contraseña' });
  }
});

module.exports = router;
