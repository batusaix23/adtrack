const express = require('express');
const { query } = require('../config/database');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();

// Get all reminders
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, poolId, startDate, endDate } = req.query;

    let sql = `
      SELECT r.*, p.name as pool_name, c.name as client_name,
             u.first_name || ' ' || u.last_name as assigned_to_name
      FROM reminders r
      LEFT JOIN pools p ON r.pool_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.company_id = $1
    `;
    const params = [req.user.company_id];
    let paramIndex = 2;

    // Technicians only see their assigned reminders
    if (req.user.role === 'technician') {
      sql += ` AND (r.user_id = $${paramIndex} OR r.user_id IS NULL)`;
      params.push(req.user.id);
      paramIndex++;
    }

    if (status) {
      sql += ` AND r.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (poolId) {
      sql += ` AND r.pool_id = $${paramIndex}`;
      params.push(poolId);
      paramIndex++;
    }

    if (startDate) {
      sql += ` AND r.due_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      sql += ` AND r.due_date <= $${paramIndex}`;
      params.push(endDate);
    }

    sql += ` ORDER BY r.due_date, r.due_time`;

    const result = await query(sql, params);
    res.json({ reminders: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get upcoming reminders
router.get('/upcoming', authenticate, async (req, res, next) => {
  try {
    const { days = 7 } = req.query;

    let sql = `
      SELECT r.*, p.name as pool_name, c.name as client_name
      FROM reminders r
      LEFT JOIN pools p ON r.pool_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE r.company_id = $1
        AND r.status = 'pending'
        AND r.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day' * $2
    `;
    const params = [req.user.company_id, days];

    if (req.user.role === 'technician') {
      sql += ` AND (r.user_id = $3 OR r.user_id IS NULL)`;
      params.push(req.user.id);
    }

    sql += ` ORDER BY r.due_date, r.due_time`;

    const result = await query(sql, params);
    res.json({ reminders: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get reminder by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.*, p.name as pool_name, c.name as client_name,
              u.first_name || ' ' || u.last_name as assigned_to_name
       FROM reminders r
       LEFT JOIN pools p ON r.pool_id = p.id
       LEFT JOIN clients c ON p.client_id = c.id
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = $1 AND r.company_id = $2`,
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recordatorio no encontrado' });
    }

    res.json({ reminder: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Create reminder
router.post('/', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { poolId, userId, title, description, dueDate, dueTime, isRecurring, recurrencePattern } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ error: 'Título y fecha son requeridos' });
    }

    const result = await query(
      `INSERT INTO reminders (company_id, pool_id, user_id, title, description, due_date, due_time, is_recurring, recurrence_pattern)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.user.company_id, poolId, userId, title, description, dueDate, dueTime, isRecurring, recurrencePattern]
    );

    res.status(201).json({ reminder: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update reminder
router.put('/:id', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { poolId, userId, title, description, dueDate, dueTime, isRecurring, recurrencePattern, status } = req.body;

    const result = await query(
      `UPDATE reminders
       SET pool_id = COALESCE($1, pool_id),
           user_id = COALESCE($2, user_id),
           title = COALESCE($3, title),
           description = COALESCE($4, description),
           due_date = COALESCE($5, due_date),
           due_time = COALESCE($6, due_time),
           is_recurring = COALESCE($7, is_recurring),
           recurrence_pattern = COALESCE($8, recurrence_pattern),
           status = COALESCE($9, status)
       WHERE id = $10 AND company_id = $11
       RETURNING *`,
      [poolId, userId, title, description, dueDate, dueTime, isRecurring, recurrencePattern, status, req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recordatorio no encontrado' });
    }

    res.json({ reminder: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Complete reminder
router.post('/:id/complete', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE reminders
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1 AND company_id = $2 AND status = 'pending'
       RETURNING *`,
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recordatorio no encontrado o ya completado' });
    }

    // If recurring, create next occurrence
    const reminder = result.rows[0];
    if (reminder.is_recurring && reminder.recurrence_pattern) {
      const pattern = reminder.recurrence_pattern;
      let nextDate = new Date(reminder.due_date);

      switch (pattern.frequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + (pattern.interval || 1));
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7 * (pattern.interval || 1));
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + (pattern.interval || 1));
          break;
      }

      await query(
        `INSERT INTO reminders (company_id, pool_id, user_id, title, description, due_date, due_time, is_recurring, recurrence_pattern)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)`,
        [req.user.company_id, reminder.pool_id, reminder.user_id, reminder.title, reminder.description, nextDate, reminder.due_time, pattern]
      );
    }

    res.json({ reminder: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Cancel reminder
router.post('/:id/cancel', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE reminders SET status = 'cancelled'
       WHERE id = $1 AND company_id = $2
       RETURNING *`,
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recordatorio no encontrado' });
    }

    res.json({ reminder: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete reminder
router.delete('/:id', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM reminders WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recordatorio no encontrado' });
    }

    res.json({ message: 'Recordatorio eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
