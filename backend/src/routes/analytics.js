const express = require('express');
const { query } = require('../config/database');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();

// Get dashboard overview
router.get('/dashboard', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const today = new Date().toISOString().split('T')[0];

    // Get multiple stats in parallel
    const [
      todayStats,
      weekStats,
      alertStats,
      inventoryStats,
      recentServices
    ] = await Promise.all([
      // Today's stats
      query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress
        FROM service_records
        WHERE company_id = $1 AND scheduled_date = $2
      `, [companyId, today]),

      // This week's stats
      query(`
        SELECT
          COUNT(*) as total_services,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          SUM(EXTRACT(EPOCH FROM (departure_time - arrival_time))/60) as total_minutes
        FROM service_records
        WHERE company_id = $1
          AND scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
      `, [companyId]),

      // Active alerts
      query(`
        SELECT
          COUNT(*) FILTER (WHERE priority = 'critical') as critical,
          COUNT(*) FILTER (WHERE priority = 'high') as high,
          COUNT(*) FILTER (WHERE status = 'active') as total_active
        FROM alerts
        WHERE company_id = $1 AND status = 'active'
      `, [companyId]),

      // Low stock items
      query(`
        SELECT COUNT(*) as low_stock_count
        FROM inventory inv
        JOIN chemicals ch ON inv.chemical_id = ch.id
        WHERE inv.company_id = $1
          AND inv.quantity <= inv.min_stock_level
          AND ch.is_active = true
      `, [companyId]),

      // Recent completed services
      query(`
        SELECT sr.id, sr.scheduled_date, sr.ph_level, sr.chlorine_level,
               p.name as pool_name, c.name as client_name
        FROM service_records sr
        JOIN pools p ON sr.pool_id = p.id
        JOIN clients c ON c.id = p.client_id
        WHERE sr.company_id = $1 AND sr.status = 'completed'
        ORDER BY sr.departure_time DESC
        LIMIT 5
      `, [companyId])
    ]);

    res.json({
      today: todayStats.rows[0],
      week: weekStats.rows[0],
      alerts: alertStats.rows[0],
      inventory: inventoryStats.rows[0],
      recentServices: recentServices.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get services trend (last 30 days)
router.get('/trends/services', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    const result = await query(`
      SELECT
        DATE(scheduled_date) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
      FROM service_records
      WHERE company_id = $1
        AND scheduled_date >= CURRENT_DATE - INTERVAL '1 day' * $2
      GROUP BY DATE(scheduled_date)
      ORDER BY date
    `, [req.user.company_id, days]);

    res.json({ trend: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get chemical consumption trend
router.get('/trends/chemicals', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    const result = await query(`
      SELECT
        DATE(sr.scheduled_date) as date,
        ch.name,
        SUM(cu.quantity_used) as quantity,
        SUM(cu.quantity_used * ch.cost_per_unit) as cost
      FROM service_chemicals cu
      JOIN service_records sr ON cu.service_record_id = sr.id
      JOIN chemicals ch ON cu.chemical_id = ch.id
      WHERE sr.company_id = $1
        AND sr.scheduled_date >= CURRENT_DATE - INTERVAL '1 day' * $2
      GROUP BY DATE(sr.scheduled_date), ch.id, ch.name
      ORDER BY date, ch.name
    `, [req.user.company_id, days]);

    res.json({ trend: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get water quality averages
router.get('/water-quality', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { days = 30, poolId } = req.query;

    let sql = `
      SELECT
        DATE(scheduled_date) as date,
        AVG(ph_level) as avg_ph,
        AVG(chlorine_level) as avg_chlorine,
        AVG(alkalinity) as avg_alkalinity,
        COUNT(*) as readings
      FROM service_records
      WHERE company_id = $1
        AND scheduled_date >= CURRENT_DATE - INTERVAL '1 day' * $2
        AND status = 'completed'
        AND ph_level IS NOT NULL
    `;
    const params = [req.user.company_id, days];

    if (poolId) {
      sql += ` AND pool_id = $3`;
      params.push(poolId);
    }

    sql += ` GROUP BY DATE(scheduled_date) ORDER BY date`;

    const result = await query(sql, params);
    res.json({ waterQuality: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get technician performance
router.get('/performance/technicians', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    const result = await query(`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        COUNT(sr.id) as total_services,
        COUNT(sr.id) FILTER (WHERE sr.status = 'completed') as completed,
        AVG(EXTRACT(EPOCH FROM (sr.departure_time - sr.arrival_time))/60) FILTER (WHERE sr.status = 'completed') as avg_duration,
        AVG(sr.ph_level) FILTER (WHERE sr.ph_level IS NOT NULL) as avg_ph_reading,
        COUNT(DISTINCT DATE(sr.scheduled_date)) as active_days
      FROM users u
      LEFT JOIN service_records sr ON sr.technician_id = u.id
        AND sr.scheduled_date >= CURRENT_DATE - INTERVAL '1 day' * $2
      WHERE u.company_id = $1 AND u.role = 'technician' AND u.is_active = true
      GROUP BY u.id
      ORDER BY completed DESC
    `, [req.user.company_id, days]);

    res.json({ technicians: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get pools requiring attention
router.get('/pools/attention', authenticate, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT p.id, p.name, c.name as client_name,
             sr.scheduled_date as last_service,
             sr.ph_level, sr.chlorine_level,
             CASE
               WHEN sr.ph_level < 7.0 OR sr.ph_level > 7.8 THEN 'pH fuera de rango'
               WHEN sr.chlorine_level < 1.0 OR sr.chlorine_level > 4.0 THEN 'Cloro fuera de rango'
               WHEN sr.scheduled_date < CURRENT_DATE - INTERVAL '14 days' THEN 'Sin servicio reciente'
               ELSE 'Normal'
             END as issue
      FROM pools p
      JOIN clients c ON c.id = p.client_id
      LEFT JOIN LATERAL (
        SELECT scheduled_date, ph_level, chlorine_level
        FROM service_records
        WHERE pool_id = p.id AND status = 'completed'
        ORDER BY scheduled_date DESC
        LIMIT 1
      ) sr ON true
      WHERE p.company_id = $1 AND p.is_active = true
        AND (
          sr.ph_level < 7.0 OR sr.ph_level > 7.8
          OR sr.chlorine_level < 1.0 OR sr.chlorine_level > 4.0
          OR sr.scheduled_date < CURRENT_DATE - INTERVAL '14 days'
          OR sr.scheduled_date IS NULL
        )
      ORDER BY sr.scheduled_date ASC NULLS FIRST
    `, [req.user.company_id]);

    res.json({ pools: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get monthly summary
router.get('/summary/monthly', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { year, month } = req.query;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const [services, chemicals, revenue] = await Promise.all([
      query(`
        SELECT COUNT(*) as total,
               COUNT(*) FILTER (WHERE status = 'completed') as completed,
               SUM(EXTRACT(EPOCH FROM (departure_time - arrival_time))/60) FILTER (WHERE status = 'completed') as total_minutes
        FROM service_records
        WHERE company_id = $1 AND scheduled_date BETWEEN $2 AND $3
      `, [req.user.company_id, startDate, endDate]),

      query(`
        SELECT SUM(cu.quantity_used * ch.cost_per_unit) as total_cost
        FROM service_chemicals cu
        JOIN chemicals ch ON cu.chemical_id = ch.id
        JOIN service_records sr ON cu.service_record_id = sr.id
        WHERE sr.company_id = $1 AND sr.scheduled_date BETWEEN $2 AND $3
      `, [req.user.company_id, startDate, endDate]),

      query(`
        SELECT SUM(p.monthly_rate) as estimated_revenue
        FROM pools p
        WHERE p.company_id = $1 AND p.is_active = true
      `, [req.user.company_id])
    ]);

    res.json({
      services: services.rows[0],
      chemicals: chemicals.rows[0],
      revenue: revenue.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
