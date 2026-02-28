const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

console.log('Technicians routes module loaded');

// Test route (no auth required)
router.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Technicians route is working' });
});

// Get all technicians for company
router.get('/', authenticate, async (req, res) => {
  console.log('GET /api/technicians called');
  try {
    const result = await query(
      `SELECT
        id, first_name, last_name, phone, email,
        hire_date, hourly_rate, employee_id, color,
        is_active, last_login_at,
        notification_preferences,
        created_at
       FROM technicians
       WHERE company_id = $1
       ORDER BY first_name, last_name`,
      [req.user.company_id]
    );

    res.json({ technicians: result.rows });
  } catch (error) {
    console.error('Error fetching technicians:', error);
    res.status(500).json({ error: 'Error fetching technicians' });
  }
});

// Get single technician
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT
        id, first_name, last_name, phone, email,
        hire_date, hourly_rate, employee_id, color,
        is_active, last_login_at,
        notification_preferences,
        created_at, updated_at
       FROM technicians
       WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    res.json({ technician: result.rows[0] });
  } catch (error) {
    console.error('Error fetching technician:', error);
    res.status(500).json({ error: 'Error fetching technician' });
  }
});

// Create technician
router.post('/', authenticate, authorizeRoles('owner', 'admin'), async (req, res) => {
  try {
    const {
      firstName, lastName, phone, email,
      hireDate, hourlyRate, employeeId, color,
      portalPassword, portalPin,
      notificationPreferences
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    // Check email uniqueness if provided
    if (email) {
      const existing = await query(
        'SELECT id FROM technicians WHERE email = $1 AND company_id = $2',
        [email, req.user.company_id]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use by another technician' });
      }
    }

    // Hash portal password if provided
    let passwordHash = null;
    if (portalPassword) {
      passwordHash = await bcrypt.hash(portalPassword, 10);
    }

    const result = await query(
      `INSERT INTO technicians (
        company_id, first_name, last_name, phone, email,
        hire_date, hourly_rate, employee_id, color,
        portal_password_hash, portal_pin,
        notification_preferences
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        req.user.company_id,
        firstName,
        lastName,
        phone || null,
        email || null,
        hireDate || null,
        hourlyRate || null,
        employeeId || null,
        color || '#3B82F6',
        passwordHash,
        portalPin || null,
        JSON.stringify(notificationPreferences || { sms: true, email: true, push: true })
      ]
    );

    // Don't return password hash
    const technician = result.rows[0];
    delete technician.portal_password_hash;

    res.status(201).json({ technician });
  } catch (error) {
    console.error('Error creating technician:', error);
    res.status(500).json({ error: 'Error creating technician' });
  }
});

// Update technician
router.put('/:id', authenticate, authorizeRoles('owner', 'admin'), async (req, res) => {
  try {
    const {
      firstName, lastName, phone, email,
      hireDate, hourlyRate, employeeId, color,
      portalPassword, portalPin,
      notificationPreferences, isActive
    } = req.body;

    // Check technician exists
    const existing = await query(
      'SELECT id FROM technicians WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    // Check email uniqueness if changed
    if (email) {
      const emailCheck = await query(
        'SELECT id FROM technicians WHERE email = $1 AND company_id = $2 AND id != $3',
        [email, req.user.company_id, req.params.id]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Build update query
    let updateFields = [];
    let values = [];
    let paramCount = 1;

    if (firstName !== undefined) { updateFields.push(`first_name = $${paramCount++}`); values.push(firstName); }
    if (lastName !== undefined) { updateFields.push(`last_name = $${paramCount++}`); values.push(lastName); }
    if (phone !== undefined) { updateFields.push(`phone = $${paramCount++}`); values.push(phone); }
    if (email !== undefined) { updateFields.push(`email = $${paramCount++}`); values.push(email); }
    if (hireDate !== undefined) { updateFields.push(`hire_date = $${paramCount++}`); values.push(hireDate); }
    if (hourlyRate !== undefined) { updateFields.push(`hourly_rate = $${paramCount++}`); values.push(hourlyRate); }
    if (employeeId !== undefined) { updateFields.push(`employee_id = $${paramCount++}`); values.push(employeeId); }
    if (color !== undefined) { updateFields.push(`color = $${paramCount++}`); values.push(color); }
    if (portalPin !== undefined) { updateFields.push(`portal_pin = $${paramCount++}`); values.push(portalPin); }
    if (notificationPreferences !== undefined) {
      updateFields.push(`notification_preferences = $${paramCount++}`);
      values.push(JSON.stringify(notificationPreferences));
    }
    if (isActive !== undefined) { updateFields.push(`is_active = $${paramCount++}`); values.push(isActive); }

    // Handle password update
    if (portalPassword) {
      const passwordHash = await bcrypt.hash(portalPassword, 10);
      updateFields.push(`portal_password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(req.params.id);
    values.push(req.user.company_id);

    const result = await query(
      `UPDATE technicians SET ${updateFields.join(', ')}
       WHERE id = $${paramCount++} AND company_id = $${paramCount}
       RETURNING *`,
      values
    );

    const technician = result.rows[0];
    delete technician.portal_password_hash;

    res.json({ technician });
  } catch (error) {
    console.error('Error updating technician:', error);
    res.status(500).json({ error: 'Error updating technician' });
  }
});

// Delete technician
router.delete('/:id', authenticate, authorizeRoles('owner', 'admin'), async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM technicians WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    res.json({ success: true, message: 'Technician deleted' });
  } catch (error) {
    console.error('Error deleting technician:', error);
    res.status(500).json({ error: 'Error deleting technician' });
  }
});

// Get technician's route for a date
router.get('/:id/route/:date', authenticate, async (req, res) => {
  try {
    const { id, date } = req.params;

    // Get route
    const routeResult = await query(
      `SELECT r.*, t.first_name as tech_first_name, t.last_name as tech_last_name
       FROM routes r
       LEFT JOIN technicians t ON r.technician_id = t.id
       WHERE r.technician_id = $1 AND r.route_date = $2 AND r.company_id = $3`,
      [id, date, req.user.company_id]
    );

    if (routeResult.rows.length === 0) {
      return res.json({ route: null, stops: [] });
    }

    const route = routeResult.rows[0];

    // Get stops with client info
    const stopsResult = await query(
      `SELECT
        rs.*,
        c.first_name, c.last_name, c.address, c.city, c.state,
        c.phone, c.gate_code, c.access_notes, c.notes as client_notes,
        c.latitude, c.longitude
       FROM route_stops rs
       JOIN clients c ON rs.client_id = c.id
       WHERE rs.route_id = $1
       ORDER BY rs.sequence_order`,
      [route.id]
    );

    res.json({ route, stops: stopsResult.rows });
  } catch (error) {
    console.error('Error fetching technician route:', error);
    res.status(500).json({ error: 'Error fetching route' });
  }
});

// Get technician statistics
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate || new Date(new Date().setDate(1)).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // Services completed
    const servicesResult = await query(
      `SELECT COUNT(*) as total_services,
              AVG(duration_minutes) as avg_duration
       FROM service_records
       WHERE technician_id = $1
         AND company_id = $2
         AND scheduled_date BETWEEN $3 AND $4
         AND status = 'completed'`,
      [id, req.user.company_id, start, end]
    );

    // Chemicals used
    const chemicalsResult = await query(
      `SELECT
        SUM(applied_chlorine_gallons) as chlorine_gallons,
        SUM(applied_acid_gallons) as acid_gallons,
        SUM(applied_alkalinity_lbs) as alkalinity_lbs,
        SUM(applied_stabilizer_lbs) as stabilizer_lbs
       FROM service_records
       WHERE technician_id = $1
         AND company_id = $2
         AND scheduled_date BETWEEN $3 AND $4`,
      [id, req.user.company_id, start, end]
    );

    res.json({
      stats: {
        period: { start, end },
        services: servicesResult.rows[0],
        chemicals: chemicalsResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Error fetching technician stats:', error);
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

// Technician Portal Login
router.post('/portal/login', async (req, res) => {
  try {
    const { email, password, pin, companySlug } = req.body;

    // Find company
    let companyQuery = 'SELECT id FROM companies WHERE ';
    let companyParams = [];

    if (companySlug) {
      companyQuery += 'slug = $1';
      companyParams = [companySlug];
    } else {
      return res.status(400).json({ error: 'Company identifier required' });
    }

    const companyResult = await query(companyQuery, companyParams);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const companyId = companyResult.rows[0].id;

    // Find technician
    let techQuery = 'SELECT * FROM technicians WHERE company_id = $1 AND ';
    let techParams = [companyId];

    if (email) {
      techQuery += 'email = $2';
      techParams.push(email);
    } else {
      return res.status(400).json({ error: 'Email required' });
    }

    const techResult = await query(techQuery, techParams);
    if (techResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const technician = techResult.rows[0];

    if (!technician.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Validate password or pin
    let isValid = false;

    if (password && technician.portal_password_hash) {
      isValid = await bcrypt.compare(password, technician.portal_password_hash);
    } else if (pin && technician.portal_pin) {
      isValid = pin === technician.portal_pin;
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await query(
      'UPDATE technicians SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [technician.id]
    );

    // Generate token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        userId: technician.id,
        companyId: companyId,
        role: 'technician',
        type: 'technician'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      technician: {
        id: technician.id,
        firstName: technician.first_name,
        lastName: technician.last_name,
        email: technician.email,
        phone: technician.phone
      }
    });
  } catch (error) {
    console.error('Error in technician login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
