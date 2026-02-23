const express = require('express');
const { query } = require('../config/database');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();

// ============================================
// ROUTE SCHEDULES (Weekly Templates)
// ============================================

// Get all route schedules grouped by day and technician
router.get('/schedules', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT rs.*,
              c.name as client_name, c.last_name as client_last_name,
              c.company_name, c.phone as client_phone, c.address as client_address,
              c.city as client_city, c.service_frequency, c.client_type,
              u.first_name as technician_first_name, u.last_name as technician_last_name
       FROM route_schedules rs
       JOIN clients c ON rs.client_id = c.id
       JOIN users u ON rs.technician_id = u.id
       WHERE rs.company_id = $1 AND rs.is_active = true
       ORDER BY rs.day_of_week, rs.technician_id, rs.route_order`,
      [req.user.company_id]
    );

    // Group by day -> technician
    const grouped = {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    days.forEach(day => {
      grouped[day] = {};
    });

    result.rows.forEach(row => {
      const day = row.day_of_week;
      const techId = row.technician_id;

      if (!grouped[day]) grouped[day] = {};
      if (!grouped[day][techId]) {
        grouped[day][techId] = {
          technician_id: techId,
          technician_name: `${row.technician_first_name} ${row.technician_last_name || ''}`.trim(),
          clients: []
        };
      }

      grouped[day][techId].clients.push({
        schedule_id: row.id,
        client_id: row.client_id,
        client_name: `${row.client_name} ${row.client_last_name || ''}`.trim(),
        company_name: row.company_name,
        phone: row.client_phone,
        address: row.client_address,
        city: row.client_city,
        service_frequency: row.service_frequency,
        client_type: row.client_type,
        route_order: row.route_order
      });
    });

    res.json({ schedules: grouped });
  } catch (error) {
    next(error);
  }
});

// Get clients available for scheduling (have service_day set but not in schedule)
router.get('/available-clients', authenticate, async (req, res, next) => {
  try {
    const { day } = req.query;

    let sql = `
      SELECT c.id, c.name, c.last_name, c.company_name, c.phone, c.address, c.city,
             c.service_day, c.service_frequency, c.client_type
      FROM clients c
      WHERE c.company_id = $1
        AND c.is_active = true
        AND c.service_day IS NOT NULL
        AND c.service_day != ''
    `;
    const params = [req.user.company_id];

    if (day) {
      sql += ` AND c.service_day = $2`;
      params.push(day);

      // Exclude clients already in schedule for this day
      sql += ` AND c.id NOT IN (
        SELECT client_id FROM route_schedules
        WHERE company_id = $1 AND day_of_week = $2 AND is_active = true
      )`;
    }

    sql += ` ORDER BY c.service_day, c.name`;

    const result = await query(sql, params);
    res.json({ clients: result.rows });
  } catch (error) {
    next(error);
  }
});

// Add client to route schedule
router.post('/schedules', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { technicianId, clientId, dayOfWeek, routeOrder } = req.body;

    if (!technicianId || !clientId || !dayOfWeek) {
      return res.status(400).json({ error: 'Technician, client, and day are required' });
    }

    const result = await query(
      `INSERT INTO route_schedules (company_id, technician_id, client_id, day_of_week, route_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (company_id, technician_id, client_id, day_of_week)
       DO UPDATE SET is_active = true, route_order = $5, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.company_id, technicianId, clientId, dayOfWeek, routeOrder || 0]
    );

    res.status(201).json({ schedule: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Remove client from route schedule
router.delete('/schedules/:id', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    await query(
      `UPDATE route_schedules SET is_active = false WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    res.json({ message: 'Removed from schedule' });
  } catch (error) {
    next(error);
  }
});

// Update route order
router.put('/schedules/reorder', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { orders } = req.body; // Array of { scheduleId, order }

    for (const item of orders) {
      await query(
        `UPDATE route_schedules SET route_order = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND company_id = $3`,
        [item.order, item.scheduleId, req.user.company_id]
      );
    }

    res.json({ message: 'Order updated' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ROUTE INSTANCES (Generated Routes)
// ============================================

// Generate routes for a specific date (or week)
router.post('/generate', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { date, weekStart } = req.body;

    // Get the day of week for the date
    const targetDate = new Date(date || weekStart);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let datesToGenerate = [];

    if (weekStart) {
      // Generate for entire week
      for (let i = 0; i < 7; i++) {
        const d = new Date(targetDate);
        d.setDate(d.getDate() + i);
        datesToGenerate.push({ date: d, dayOfWeek: days[d.getDay()] });
      }
    } else {
      datesToGenerate.push({ date: targetDate, dayOfWeek: days[targetDate.getDay()] });
    }

    let generated = 0;

    for (const { date: routeDate, dayOfWeek } of datesToGenerate) {
      const dateStr = routeDate.toISOString().split('T')[0];

      // Get schedules for this day
      const schedules = await query(
        `SELECT DISTINCT technician_id FROM route_schedules
         WHERE company_id = $1 AND day_of_week = $2 AND is_active = true`,
        [req.user.company_id, dayOfWeek]
      );

      for (const { technician_id } of schedules.rows) {
        // Create route instance if doesn't exist
        const existingRoute = await query(
          `SELECT id FROM route_instances
           WHERE company_id = $1 AND technician_id = $2 AND route_date = $3`,
          [req.user.company_id, technician_id, dateStr]
        );

        let routeInstanceId;

        if (existingRoute.rows.length === 0) {
          const newRoute = await query(
            `INSERT INTO route_instances (company_id, technician_id, route_date)
             VALUES ($1, $2, $3) RETURNING id`,
            [req.user.company_id, technician_id, dateStr]
          );
          routeInstanceId = newRoute.rows[0].id;
          generated++;

          // Create stops from schedule
          const clientSchedules = await query(
            `SELECT client_id, route_order FROM route_schedules
             WHERE company_id = $1 AND technician_id = $2 AND day_of_week = $3 AND is_active = true
             ORDER BY route_order`,
            [req.user.company_id, technician_id, dayOfWeek]
          );

          for (const schedule of clientSchedules.rows) {
            await query(
              `INSERT INTO route_stops (route_instance_id, client_id, stop_order)
               VALUES ($1, $2, $3)
               ON CONFLICT DO NOTHING`,
              [routeInstanceId, schedule.client_id, schedule.route_order]
            );
          }
        }
      }
    }

    res.json({ message: `Generated ${generated} routes`, generated });
  } catch (error) {
    next(error);
  }
});

// Get route instances for a date range
router.get('/instances', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate, technicianId } = req.query;

    let sql = `
      SELECT ri.*,
             u.first_name as technician_first_name, u.last_name as technician_last_name,
             (SELECT COUNT(*) FROM route_stops rs WHERE rs.route_instance_id = ri.id) as total_stops,
             (SELECT COUNT(*) FROM route_stops rs WHERE rs.route_instance_id = ri.id AND rs.status = 'completed') as completed_stops
      FROM route_instances ri
      JOIN users u ON ri.technician_id = u.id
      WHERE ri.company_id = $1
    `;
    const params = [req.user.company_id];
    let paramIndex = 2;

    if (startDate) {
      sql += ` AND ri.route_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      sql += ` AND ri.route_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (technicianId) {
      sql += ` AND ri.technician_id = $${paramIndex}`;
      params.push(technicianId);
      paramIndex++;
    }

    sql += ` ORDER BY ri.route_date DESC, u.first_name`;

    const result = await query(sql, params);
    res.json({ instances: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get specific route instance with stops
router.get('/instances/:id', authenticate, async (req, res, next) => {
  try {
    const routeResult = await query(
      `SELECT ri.*,
              u.first_name as technician_first_name, u.last_name as technician_last_name
       FROM route_instances ri
       JOIN users u ON ri.technician_id = u.id
       WHERE ri.id = $1 AND ri.company_id = $2`,
      [req.params.id, req.user.company_id]
    );

    if (routeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const stopsResult = await query(
      `SELECT rs.*,
              c.name as client_name, c.last_name as client_last_name,
              c.company_name, c.phone, c.address, c.city
       FROM route_stops rs
       JOIN clients c ON rs.client_id = c.id
       WHERE rs.route_instance_id = $1
       ORDER BY rs.stop_order`,
      [req.params.id]
    );

    res.json({
      route: routeResult.rows[0],
      stops: stopsResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Update route instance status
router.put('/instances/:id', authenticate, async (req, res, next) => {
  try {
    const { status, notes } = req.body;

    let updateFields = [];
    let params = [];
    let paramIndex = 1;

    if (status) {
      updateFields.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;

      if (status === 'in_progress') {
        updateFields.push(`started_at = CURRENT_TIMESTAMP`);
      } else if (status === 'completed') {
        updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
      }
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      params.push(notes);
      paramIndex++;
    }

    params.push(req.params.id, req.user.company_id);

    const result = await query(
      `UPDATE route_instances SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1}
       RETURNING *`,
      params
    );

    res.json({ route: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update route stop status
router.put('/stops/:id', authenticate, async (req, res, next) => {
  try {
    const { status, notes } = req.body;

    let updateFields = [];
    let params = [];
    let paramIndex = 1;

    if (status) {
      updateFields.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;

      if (status === 'in_progress') {
        updateFields.push(`arrival_time = CURRENT_TIMESTAMP`);
      } else if (status === 'completed' || status === 'skipped') {
        updateFields.push(`departure_time = CURRENT_TIMESTAMP`);
      }
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      params.push(notes);
      paramIndex++;
    }

    params.push(req.params.id);

    const result = await query(
      `UPDATE route_stops SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    res.json({ stop: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ROUTE HISTORY
// ============================================

// Get route history for a client
router.get('/history/client/:clientId', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT rs.*, ri.route_date, ri.status as route_status,
              u.first_name as technician_first_name, u.last_name as technician_last_name
       FROM route_stops rs
       JOIN route_instances ri ON rs.route_instance_id = ri.id
       JOIN users u ON ri.technician_id = u.id
       WHERE rs.client_id = $1 AND ri.company_id = $2
       ORDER BY ri.route_date DESC
       LIMIT 50`,
      [req.params.clientId, req.user.company_id]
    );

    res.json({ history: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get route history for a technician
router.get('/history/technician/:technicianId', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let sql = `
      SELECT ri.*,
             (SELECT COUNT(*) FROM route_stops rs WHERE rs.route_instance_id = ri.id) as total_stops,
             (SELECT COUNT(*) FROM route_stops rs WHERE rs.route_instance_id = ri.id AND rs.status = 'completed') as completed_stops
      FROM route_instances ri
      WHERE ri.technician_id = $1 AND ri.company_id = $2
    `;
    const params = [req.params.technicianId, req.user.company_id];

    if (startDate) {
      sql += ` AND ri.route_date >= $3`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND ri.route_date <= $${params.length + 1}`;
      params.push(endDate);
    }

    sql += ` ORDER BY ri.route_date DESC LIMIT 100`;

    const result = await query(sql, params);
    res.json({ history: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
