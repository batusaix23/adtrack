const express = require('express');
const { query } = require('../config/database');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();

// Get all chemicals
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { category, active } = req.query;

    let sql = `
      SELECT ch.*, inv.quantity as stock_quantity, inv.min_stock_level
      FROM chemicals ch
      LEFT JOIN inventory inv ON inv.chemical_id = ch.id
      WHERE ch.company_id = $1
    `;
    const params = [req.user.company_id];
    let paramIndex = 2;

    if (category) {
      sql += ` AND ch.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (active !== undefined) {
      sql += ` AND ch.is_active = $${paramIndex}`;
      params.push(active === 'true');
    }

    sql += ` ORDER BY ch.category, ch.name`;

    const result = await query(sql, params);
    res.json({ chemicals: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get chemical by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT ch.*, inv.quantity as stock_quantity, inv.min_stock_level
       FROM chemicals ch
       LEFT JOIN inventory inv ON inv.chemical_id = ch.id
       WHERE ch.id = $1 AND ch.company_id = $2`,
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Químico no encontrado' });
    }

    res.json({ chemical: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Create chemical
router.post('/', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { name, unit, costPerUnit, defaultDosage, category } = req.body;

    if (!name || !unit) {
      return res.status(400).json({ error: 'Nombre y unidad son requeridos' });
    }

    const result = await query(
      `INSERT INTO chemicals (company_id, name, unit, cost_per_unit, default_dosage, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.company_id, name, unit, costPerUnit, defaultDosage, category]
    );

    // Create inventory record
    await query(
      `INSERT INTO inventory (company_id, chemical_id, quantity, min_stock_level)
       VALUES ($1, $2, 0, 0)`,
      [req.user.company_id, result.rows[0].id]
    );

    res.status(201).json({ chemical: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update chemical
router.put('/:id', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { name, unit, costPerUnit, defaultDosage, category, isActive } = req.body;

    const result = await query(
      `UPDATE chemicals
       SET name = COALESCE($1, name),
           unit = COALESCE($2, unit),
           cost_per_unit = COALESCE($3, cost_per_unit),
           default_dosage = COALESCE($4, default_dosage),
           category = COALESCE($5, category),
           is_active = COALESCE($6, is_active)
       WHERE id = $7 AND company_id = $8
       RETURNING *`,
      [name, unit, costPerUnit, defaultDosage, category, isActive, req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Químico no encontrado' });
    }

    res.json({ chemical: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete chemical
router.delete('/:id', authenticate, authorizeRoles('owner'), async (req, res, next) => {
  try {
    // Check if chemical has been used
    const usageCheck = await query(
      'SELECT COUNT(*) FROM chemical_usage WHERE chemical_id = $1',
      [req.params.id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      // Soft delete
      await query(
        'UPDATE chemicals SET is_active = false WHERE id = $1 AND company_id = $2',
        [req.params.id, req.user.company_id]
      );
      return res.json({ message: 'Químico desactivado (tiene historial de uso)' });
    }

    await query(
      'DELETE FROM chemicals WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );

    res.json({ message: 'Químico eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
});

// Get chemical usage statistics
router.get('/:id/usage', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let sql = `
      SELECT DATE_TRUNC('day', sr.scheduled_date) as date,
             SUM(cu.quantity) as total_quantity,
             COUNT(*) as usage_count
      FROM chemical_usage cu
      JOIN service_records sr ON cu.service_record_id = sr.id
      WHERE cu.chemical_id = $1 AND sr.company_id = $2
    `;
    const params = [req.params.id, req.user.company_id];
    let paramIndex = 3;

    if (startDate) {
      sql += ` AND sr.scheduled_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      sql += ` AND sr.scheduled_date <= $${paramIndex}`;
      params.push(endDate);
    }

    sql += ` GROUP BY DATE_TRUNC('day', sr.scheduled_date) ORDER BY date`;

    const result = await query(sql, params);
    res.json({ usage: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
