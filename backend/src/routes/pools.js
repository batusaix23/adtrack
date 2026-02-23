const express = require('express');
const { query } = require('../config/database');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();

// Get all pools
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { clientId, serviceDay, active } = req.query;

    let sql = `
      SELECT p.*, c.name as client_name, c.last_name as client_last_name, c.phone as client_phone,
             (SELECT scheduled_date FROM service_records sr
              WHERE sr.pool_id = p.id AND sr.status = 'completed'
              ORDER BY scheduled_date DESC LIMIT 1) as last_service_date
      FROM pools p
      JOIN clients c ON c.id = p.client_id
      WHERE p.company_id = $1
    `;
    const params = [req.user.company_id];
    let paramIndex = 2;

    if (clientId) {
      sql += ` AND p.client_id = $${paramIndex}`;
      params.push(clientId);
      paramIndex++;
    }

    if (serviceDay) {
      sql += ` AND p.service_day = $${paramIndex}`;
      params.push(serviceDay);
      paramIndex++;
    }

    if (active !== undefined) {
      sql += ` AND p.is_active = $${paramIndex}`;
      params.push(active === 'true');
    }

    sql += ` ORDER BY c.name, p.name`;

    const result = await query(sql, params);
    res.json({ pools: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get pools for today (technician route)
router.get('/today', authenticate, async (req, res, next) => {
  try {
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

    let sql = `
      SELECT p.*, c.name as client_name, c.last_name as client_last_name, c.phone as client_phone, c.address as client_address,
             sr.id as service_record_id, sr.status as service_status
      FROM pools p
      JOIN clients c ON c.id = p.client_id
      LEFT JOIN service_records sr ON sr.pool_id = p.id AND sr.scheduled_date = CURRENT_DATE
      WHERE p.company_id = $1 AND p.service_day = $2 AND p.is_active = true
    `;
    const params = [req.user.company_id, dayOfWeek];

    // Technicians only see their assigned pools
    if (req.user.role === 'technician') {
      sql += ` AND sr.technician_id = $3`;
      params.push(req.user.id);
    }

    sql += ` ORDER BY c.name, p.name`;

    const result = await query(sql, params);
    res.json({ pools: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get pool by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, c.name as client_name, c.phone as client_phone, c.email as client_email
       FROM pools p
       JOIN clients c ON c.id = p.client_id
       WHERE p.id = $1 AND p.company_id = $2`,
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Piscina no encontrada' });
    }

    res.json({ pool: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Create pool
router.post('/', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const {
      clientId, name, poolType, volumeGallons, surfaceAreaSqft,
      hasSpa, hasHeater, hasSaltSystem, equipmentNotes, address,
      latitude, longitude, serviceDay, serviceFrequency, monthlyRate, notes
    } = req.body;

    if (!clientId || !name) {
      return res.status(400).json({ error: 'Cliente y nombre son requeridos' });
    }

    // Verify client belongs to company
    const clientCheck = await query(
      'SELECT id FROM clients WHERE id = $1 AND company_id = $2',
      [clientId, req.user.company_id]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Cliente no válido' });
    }

    const result = await query(
      `INSERT INTO pools (
        client_id, company_id, name, pool_type, volume_gallons, surface_area_sqft,
        has_spa, has_heater, has_salt_system, equipment_notes, address,
        latitude, longitude, service_day, service_frequency, monthly_rate, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        clientId, req.user.company_id, name, poolType, volumeGallons, surfaceAreaSqft,
        hasSpa, hasHeater, hasSaltSystem, equipmentNotes, address,
        latitude, longitude, serviceDay, serviceFrequency, monthlyRate, notes
      ]
    );

    res.status(201).json({ pool: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update pool
router.put('/:id', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const {
      name, poolType, volumeGallons, surfaceAreaSqft,
      hasSpa, hasHeater, hasSaltSystem, equipmentNotes, address,
      latitude, longitude, serviceDay, serviceFrequency, monthlyRate, notes, isActive
    } = req.body;

    const result = await query(
      `UPDATE pools
       SET name = COALESCE($1, name),
           pool_type = COALESCE($2, pool_type),
           volume_gallons = COALESCE($3, volume_gallons),
           surface_area_sqft = COALESCE($4, surface_area_sqft),
           has_spa = COALESCE($5, has_spa),
           has_heater = COALESCE($6, has_heater),
           has_salt_system = COALESCE($7, has_salt_system),
           equipment_notes = COALESCE($8, equipment_notes),
           address = COALESCE($9, address),
           latitude = COALESCE($10, latitude),
           longitude = COALESCE($11, longitude),
           service_day = COALESCE($12, service_day),
           service_frequency = COALESCE($13, service_frequency),
           monthly_rate = COALESCE($14, monthly_rate),
           notes = COALESCE($15, notes),
           is_active = COALESCE($16, is_active)
       WHERE id = $17 AND company_id = $18
       RETURNING *`,
      [
        name, poolType, volumeGallons, surfaceAreaSqft,
        hasSpa, hasHeater, hasSaltSystem, equipmentNotes, address,
        latitude, longitude, serviceDay, serviceFrequency, monthlyRate, notes, isActive,
        req.params.id, req.user.company_id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Piscina no encontrada' });
    }

    res.json({ pool: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete pool
router.delete('/:id', authenticate, authorizeRoles('owner'), async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM pools WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Piscina no encontrada' });
    }

    res.json({ message: 'Piscina eliminada exitosamente' });
  } catch (error) {
    next(error);
  }
});

// Get pool service history
router.get('/:id/services', authenticate, async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const result = await query(
      `SELECT sr.*, u.first_name || ' ' || u.last_name as technician_name,
              json_agg(json_build_object(
                'chemical_id', cu.chemical_id,
                'quantity', cu.quantity,
                'name', ch.name,
                'unit', ch.unit
              )) FILTER (WHERE cu.id IS NOT NULL) as chemicals_used
       FROM service_records sr
       JOIN users u ON sr.technician_id = u.id
       LEFT JOIN chemical_usage cu ON cu.service_record_id = sr.id
       LEFT JOIN chemicals ch ON cu.chemical_id = ch.id
       WHERE sr.pool_id = $1 AND sr.company_id = $2
       GROUP BY sr.id, u.first_name, u.last_name
       ORDER BY sr.scheduled_date DESC
       LIMIT $3 OFFSET $4`,
      [req.params.id, req.user.company_id, limit, offset]
    );

    res.json({ services: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
