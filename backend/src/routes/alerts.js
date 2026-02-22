const express = require('express');
const { query } = require('../config/database');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();

// Get all alerts
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, priority, type, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT a.*, p.name as pool_name, c.name as client_name
      FROM alerts a
      LEFT JOIN pools p ON a.pool_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE a.company_id = $1
    `;
    const params = [req.user.company_id];
    let paramIndex = 2;

    if (status) {
      sql += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (priority) {
      sql += ` AND a.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    if (type) {
      sql += ` AND a.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    sql += ` ORDER BY
      CASE a.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        ELSE 4
      END,
      a.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    res.json({ alerts: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get active alerts count
router.get('/count', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'active' AND priority = 'critical') as critical,
        COUNT(*) FILTER (WHERE status = 'active' AND priority = 'high') as high,
        COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged
       FROM alerts
       WHERE company_id = $1`,
      [req.user.company_id]
    );

    res.json({ counts: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Get alert by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT a.*, p.name as pool_name, c.name as client_name,
              ack.first_name || ' ' || ack.last_name as acknowledged_by_name,
              res.first_name || ' ' || res.last_name as resolved_by_name
       FROM alerts a
       LEFT JOIN pools p ON a.pool_id = p.id
       LEFT JOIN clients c ON p.client_id = c.id
       LEFT JOIN users ack ON a.acknowledged_by = ack.id
       LEFT JOIN users res ON a.resolved_by = res.id
       WHERE a.id = $1 AND a.company_id = $2`,
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }

    res.json({ alert: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Create alert
router.post('/', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { poolId, type, title, message, priority } = req.body;

    if (!type || !title) {
      return res.status(400).json({ error: 'Tipo y título son requeridos' });
    }

    const result = await query(
      `INSERT INTO alerts (company_id, pool_id, type, title, message, priority)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.company_id, poolId, type, title, message, priority || 'medium']
    );

    res.status(201).json({ alert: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Acknowledge alert
router.post('/:id/acknowledge', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE alerts
       SET status = 'acknowledged',
           acknowledged_at = NOW(),
           acknowledged_by = $1
       WHERE id = $2 AND company_id = $3 AND status = 'active'
       RETURNING *`,
      [req.user.id, req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada o ya procesada' });
    }

    res.json({ alert: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Resolve alert
router.post('/:id/resolve', authenticate, async (req, res, next) => {
  try {
    const { resolution } = req.body;

    const result = await query(
      `UPDATE alerts
       SET status = 'resolved',
           resolved_at = NOW(),
           resolved_by = $1,
           metadata = metadata || jsonb_build_object('resolution', $2)
       WHERE id = $3 AND company_id = $4 AND status IN ('active', 'acknowledged')
       RETURNING *`,
      [req.user.id, resolution, req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada o ya resuelta' });
    }

    res.json({ alert: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete alert (admin only)
router.delete('/:id', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM alerts WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }

    res.json({ message: 'Alerta eliminada exitosamente' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
