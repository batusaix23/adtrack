const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { authenticateTechnician, technicianRateLimit } = require('../middleware/technicianAuth');

// ============================================
// AUTHENTICATION
// ============================================

// Login
router.post('/login', technicianRateLimit(10, 60000), async (req, res) => {
  try {
    const { email, password, pin, companyCode } = req.body;

    if (!email || (!password && !pin)) {
      return res.status(400).json({
        error: 'Email y contraseña/PIN son requeridos',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find company by code/slug if provided
    let companyId = null;
    if (companyCode) {
      const companyResult = await query(
        'SELECT id FROM companies WHERE slug = $1 AND is_active = true',
        [companyCode]
      );
      if (companyResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Empresa no encontrada',
          code: 'COMPANY_NOT_FOUND'
        });
      }
      companyId = companyResult.rows[0].id;
    }

    // Find technician
    let techQuery = `
      SELECT t.*, c.company_name, c.slug as company_slug
      FROM technicians t
      JOIN companies c ON t.company_id = c.id
      WHERE t.email = $1 AND t.is_active = true AND c.is_active = true
    `;
    const params = [email];

    if (companyId) {
      techQuery += ' AND t.company_id = $2';
      params.push(companyId);
    }

    const result = await query(techQuery, params);

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const technician = result.rows[0];

    // Validate password or PIN
    let isValid = false;

    if (password && technician.portal_password_hash) {
      isValid = await bcrypt.compare(password, technician.portal_password_hash);
    } else if (pin && technician.portal_pin) {
      isValid = pin === technician.portal_pin;
    }

    if (!isValid) {
      // Log failed attempt
      await query(
        `INSERT INTO audit_log (company_id, user_id, user_type, action, ip_address, created_at)
         VALUES ($1, $2, 'technician', 'login_failed', $3, CURRENT_TIMESTAMP)`,
        [technician.company_id, technician.id, req.ip]
      );

      return res.status(401).json({
        error: 'Credenciales inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: technician.id,
        companyId: technician.company_id,
        role: 'technician',
        type: 'technician'
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    const refreshToken = jwt.sign(
      {
        userId: technician.id,
        companyId: technician.company_id,
        type: 'technician_refresh'
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    // Update last login
    await query(
      'UPDATE technicians SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [technician.id]
    );

    // Log successful login
    await query(
      `INSERT INTO audit_log (company_id, user_id, user_type, action, ip_address, created_at)
       VALUES ($1, $2, 'technician', 'login_success', $3, CURRENT_TIMESTAMP)`,
      [technician.company_id, technician.id, req.ip]
    );

    res.json({
      success: true,
      accessToken,
      refreshToken,
      technician: {
        id: technician.id,
        firstName: technician.first_name,
        lastName: technician.last_name,
        email: technician.email,
        phone: technician.phone,
        companyName: technician.company_name,
        companySlug: technician.company_slug
      }
    });
  } catch (error) {
    console.error('Technician login error:', error);
    res.status(500).json({
      error: 'Error en el servidor',
      code: 'SERVER_ERROR'
    });
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

    if (decoded.type !== 'technician_refresh') {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Verify technician still exists
    const result = await query(
      'SELECT id, company_id FROM technicians WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Técnico no encontrado' });
    }

    const technician = result.rows[0];

    const newAccessToken = jwt.sign(
      {
        userId: technician.id,
        companyId: technician.company_id,
        role: 'technician',
        type: 'technician'
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Get current technician profile
router.get('/me', authenticateTechnician, async (req, res) => {
  res.json({ technician: req.technician });
});

// Alias for profile
router.get('/profile', authenticateTechnician, async (req, res) => {
  res.json({ technician: req.technician });
});

// Get chemicals list for the company
router.get('/chemicals', authenticateTechnician, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, description, unit, category, is_active
       FROM chemicals
       WHERE company_id = $1 AND is_active = true
       ORDER BY category, name`,
      [req.technician.companyId]
    );
    res.json({ chemicals: result.rows });
  } catch (error) {
    console.error('Error fetching chemicals:', error);
    res.status(500).json({ error: 'Error cargando químicos' });
  }
});

// Get single service record
router.get('/service/:id', authenticateTechnician, async (req, res) => {
  try {
    const result = await query(
      `SELECT sr.*,
              c.first_name as client_first_name,
              c.last_name as client_last_name,
              c.address as client_address,
              c.phone as client_phone,
              c.gate_code,
              c.access_notes,
              p.name as pool_name,
              p.volume_gallons,
              p.has_spa,
              p.has_salt_system,
              t.first_name as tech_first_name,
              t.last_name as tech_last_name
       FROM service_records sr
       JOIN clients c ON sr.client_id = c.id
       LEFT JOIN pools p ON p.client_id = c.id AND p.is_active = true
       LEFT JOIN technicians t ON sr.technician_id = t.id
       WHERE sr.id = $1 AND sr.company_id = $2`,
      [req.params.id, req.technician.companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro de servicio no encontrado' });
    }

    res.json({ service: result.rows[0] });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Error cargando servicio' });
  }
});

// ============================================
// ROUTES & SCHEDULE
// ============================================

// Get today's route
router.get('/route/today', authenticateTechnician, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const route = await getRouteForDate(req.technician.id, req.technician.companyId, today);
    res.json(route);
  } catch (error) {
    console.error('Error fetching today route:', error);
    res.status(500).json({ error: 'Error cargando la ruta' });
  }
});

// Get route for specific date
router.get('/route/:date', authenticateTechnician, async (req, res) => {
  try {
    const route = await getRouteForDate(req.technician.id, req.technician.companyId, req.params.date);
    res.json(route);
  } catch (error) {
    console.error('Error fetching route:', error);
    res.status(500).json({ error: 'Error cargando la ruta' });
  }
});

// Get week schedule
router.get('/schedule/week', authenticateTechnician, async (req, res) => {
  try {
    const { startDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date();
    start.setDate(start.getDate() - start.getDay()); // Start of week

    const schedule = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const result = await query(
        `SELECT COUNT(*) as stop_count,
                COUNT(*) FILTER (WHERE rs.status = 'completed') as completed_count
         FROM routes r
         JOIN route_stops rs ON rs.route_id = r.id
         WHERE r.technician_id = $1 AND r.route_date = $2`,
        [req.technician.id, dateStr]
      );

      schedule.push({
        date: dateStr,
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
        totalStops: parseInt(result.rows[0].stop_count),
        completedStops: parseInt(result.rows[0].completed_count)
      });
    }

    res.json({ schedule });
  } catch (error) {
    console.error('Error fetching week schedule:', error);
    res.status(500).json({ error: 'Error cargando horario' });
  }
});

// Helper function to get route for a date
async function getRouteForDate(technicianId, companyId, date) {
  // Get or create route for the date
  let routeResult = await query(
    `SELECT * FROM routes WHERE technician_id = $1 AND route_date = $2 AND company_id = $3`,
    [technicianId, date, companyId]
  );

  if (routeResult.rows.length === 0) {
    // Try to generate from schedule
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    const dayOfWeekLower = dayOfWeek.toLowerCase();

    // Check if there are clients assigned for this day
    // Support both capitalized (Monday) and lowercase (monday) day names
    const clientsResult = await query(
      `SELECT c.* FROM clients c
       WHERE c.company_id = $1
         AND c.assigned_technician_id = $2
         AND c.is_active = true
         AND c.status = 'active'
         AND (
           c.service_days::jsonb ? $3
           OR c.service_days::jsonb ? $4
           OR LOWER(c.service_day) = $4
         )
       ORDER BY c.route_order, c.first_name`,
      [companyId, technicianId, dayOfWeek, dayOfWeekLower]
    );

    if (clientsResult.rows.length > 0) {
      // Create route
      const newRoute = await query(
        `INSERT INTO routes (company_id, technician_id, route_date, day_of_week, status, total_stops)
         VALUES ($1, $2, $3, $4, 'planned', $5)
         RETURNING *`,
        [companyId, technicianId, date, dayOfWeek, clientsResult.rows.length]
      );

      // Create stops
      for (let i = 0; i < clientsResult.rows.length; i++) {
        const client = clientsResult.rows[i];
        await query(
          `INSERT INTO route_stops (route_id, client_id, sequence_order, estimated_duration, status)
           VALUES ($1, $2, $3, 30, 'pending')`,
          [newRoute.rows[0].id, client.id, i + 1]
        );
      }

      routeResult = newRoute;
    } else {
      return { route: null, stops: [], message: 'No hay paradas programadas para este día' };
    }
  }

  const route = routeResult.rows[0];

  // Get stops with client info
  const stopsResult = await query(
    `SELECT
      rs.*,
      c.first_name, c.last_name, c.company_name as client_company,
      c.address, c.city, c.state, c.zip_code,
      c.phone, c.email,
      c.gate_code, c.access_notes,
      c.notes as client_notes,
      c.latitude, c.longitude,
      c.monthly_service_cost,
      p.name as pool_name, p.volume_gallons, p.has_spa, p.has_salt_system,
      sr.id as last_service_id,
      sr.scheduled_date as last_service_date,
      sr.reading_chlorine as last_chlorine,
      sr.reading_ph as last_ph
     FROM route_stops rs
     JOIN clients c ON rs.client_id = c.id
     LEFT JOIN pools p ON p.client_id = c.id AND p.is_active = true
     LEFT JOIN LATERAL (
       SELECT * FROM service_records
       WHERE client_id = c.id AND status = 'completed'
       ORDER BY scheduled_date DESC
       LIMIT 1
     ) sr ON true
     WHERE rs.route_id = $1
     ORDER BY rs.sequence_order`,
    [route.id]
  );

  // Calculate progress
  const totalStops = stopsResult.rows.length;
  const completedStops = stopsResult.rows.filter(s => s.status === 'completed').length;

  return {
    route: {
      ...route,
      progress: {
        total: totalStops,
        completed: completedStops,
        percentage: totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0
      }
    },
    stops: stopsResult.rows
  };
}

// ============================================
// SERVICE RECORDS
// ============================================

// Start service (arrive at client)
router.post('/service/start', authenticateTechnician, async (req, res) => {
  try {
    const { stopId, serviceRecordId, latitude, longitude } = req.body;

    // If serviceRecordId is provided, update existing record
    if (serviceRecordId) {
      const existingResult = await query(
        `SELECT sr.*, rs.id as stop_id, rs.route_id
         FROM service_records sr
         LEFT JOIN route_stops rs ON rs.service_record_id = sr.id
         WHERE sr.id = $1 AND sr.company_id = $2`,
        [serviceRecordId, req.technician.companyId]
      );

      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Servicio no encontrado' });
      }

      const existing = existingResult.rows[0];

      // Update service record
      await query(
        `UPDATE service_records SET
          arrival_time = CURRENT_TIMESTAMP,
          arrival_latitude = $1,
          arrival_longitude = $2,
          status = 'in_progress'
         WHERE id = $3`,
        [latitude, longitude, serviceRecordId]
      );

      // Update route stop if exists
      if (existing.stop_id) {
        await query(
          `UPDATE route_stops SET
            actual_arrival = CURRENT_TIMESTAMP,
            status = 'in_progress'
           WHERE id = $1`,
          [existing.stop_id]
        );
      }

      // Update route status
      if (existing.route_id) {
        await query(
          `UPDATE routes SET status = 'in_progress', started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
           WHERE id = $1 AND status = 'planned'`,
          [existing.route_id]
        );
      }

      return res.json({
        success: true,
        serviceRecord: { ...existing, status: 'in_progress' }
      });
    }

    // Original logic using stopId
    if (!stopId) {
      return res.status(400).json({ error: 'stopId o serviceRecordId requerido' });
    }

    // Verify stop belongs to technician
    const stopResult = await query(
      `SELECT rs.*, r.technician_id, r.company_id
       FROM route_stops rs
       JOIN routes r ON rs.route_id = r.id
       WHERE rs.id = $1 AND r.technician_id = $2`,
      [stopId, req.technician.id]
    );

    if (stopResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parada no encontrada' });
    }

    const stop = stopResult.rows[0];

    // Update stop
    await query(
      `UPDATE route_stops SET
        actual_arrival = CURRENT_TIMESTAMP,
        status = 'in_progress'
       WHERE id = $1`,
      [stopId]
    );

    // Create service record
    const serviceResult = await query(
      `INSERT INTO service_records (
        company_id, client_id, technician_id, route_stop_id,
        scheduled_date, arrival_time,
        arrival_latitude, arrival_longitude,
        status
       ) VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_TIMESTAMP, $5, $6, 'in_progress')
       RETURNING *`,
      [
        stop.company_id, stop.client_id, req.technician.id, stopId,
        latitude || null, longitude || null
      ]
    );

    // Update stop with service record id
    await query(
      'UPDATE route_stops SET service_record_id = $1 WHERE id = $2',
      [serviceResult.rows[0].id, stopId]
    );

    // Update route status if first stop
    await query(
      `UPDATE routes SET status = 'in_progress', started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
       WHERE id = $1 AND status = 'planned'`,
      [stop.route_id]
    );

    res.json({
      success: true,
      serviceRecord: serviceResult.rows[0]
    });
  } catch (error) {
    console.error('Error starting service:', error);
    res.status(500).json({ error: 'Error iniciando servicio' });
  }
});

// Complete service
router.post('/service/complete', authenticateTechnician, async (req, res) => {
  try {
    const {
      serviceRecordId,
      stopId,
      // Chemical readings - can be flat or nested in 'readings' object
      readings,
      readingChlorine, readingPh, readingAlkalinity, readingStabilizer,
      readingSalt, readingTemperature,
      // Chemicals applied
      chemicals,
      appliedChlorineGallons, appliedAcidGallons, appliedAlkalinityLbs,
      appliedStabilizerLbs, appliedShockLbs, appliedOther,
      // Checklist
      checklist,
      // Filter maintenance
      filterWashed, filterChanged,
      // Photos & notes
      photos, notes, technicianNotes,
      // GPS
      latitude, longitude,
      // Signature
      clientSignature
    } = req.body;

    // Handle readings object from frontend
    const finalReadings = {
      chlorine: readings?.chlorineLevel || readingChlorine,
      ph: readings?.phLevel || readingPh,
      alkalinity: readings?.alkalinity || readingAlkalinity,
      stabilizer: readings?.stabilizer || readingStabilizer,
      salt: readings?.saltLevel || readingSalt,
      temperature: readings?.waterTemperature || readingTemperature
    };

    // Handle notes
    const finalNotes = notes || technicianNotes;

    // Verify service record belongs to technician
    const serviceResult = await query(
      `SELECT sr.*, rs.route_id
       FROM service_records sr
       LEFT JOIN route_stops rs ON rs.id = sr.route_stop_id
       WHERE sr.id = $1 AND sr.technician_id = $2`,
      [serviceRecordId, req.technician.id]
    );

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Registro de servicio no encontrado' });
    }

    const service = serviceResult.rows[0];

    // Calculate duration
    const arrivalTime = new Date(service.arrival_time);
    const departureTime = new Date();
    const durationMinutes = Math.round((departureTime - arrivalTime) / 60000);

    // Update service record
    const updateResult = await query(
      `UPDATE service_records SET
        departure_time = CURRENT_TIMESTAMP,
        duration_minutes = $1,

        reading_chlorine = $2,
        reading_ph = $3,
        reading_alkalinity = $4,
        reading_stabilizer = $5,
        reading_salt = $6,
        reading_temperature = $7,

        applied_chlorine_gallons = $8,
        applied_acid_gallons = $9,
        applied_alkalinity_lbs = $10,
        applied_stabilizer_lbs = $11,
        applied_shock_lbs = $12,
        applied_other = $13,

        checklist_skimmer_basket = $14,
        checklist_pump_basket = $15,
        checklist_skim_surface = $16,
        checklist_brush_walls = $17,
        checklist_vacuum = $18,
        checklist_backwash = $19,
        checklist_clean_filter = $20,
        checklist_check_equipment = $21,

        filter_washed = $22,
        filter_changed = $23,

        photos = $24,
        technician_notes = $25,

        departure_latitude = $26,
        departure_longitude = $27,

        client_signature_url = $28,
        signed_at = CASE WHEN $28 IS NOT NULL THEN CURRENT_TIMESTAMP ELSE NULL END,

        status = 'completed',
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $29
       RETURNING *`,
      [
        durationMinutes,
        finalReadings.chlorine, finalReadings.ph, finalReadings.alkalinity, finalReadings.stabilizer,
        finalReadings.salt, finalReadings.temperature,
        appliedChlorineGallons || 0, appliedAcidGallons || 0, appliedAlkalinityLbs || 0,
        appliedStabilizerLbs || 0, appliedShockLbs || 0,
        JSON.stringify(chemicals || appliedOther || []),
        checklist?.cleanedSkimmer || checklist?.skimmerBasket || false,
        checklist?.emptiedPumpBasket || checklist?.pumpBasket || false,
        checklist?.skimmedSurface || checklist?.skimSurface || false,
        checklist?.brushedWalls || checklist?.brushWalls || false,
        checklist?.vacuumedPool || checklist?.vacuum || false,
        checklist?.backwashedFilter || checklist?.backwash || false,
        checklist?.backwashedFilter || checklist?.cleanFilter || false,
        checklist?.checkedEquipment || checklist?.checkEquipment || false,
        filterWashed || false,
        filterChanged || false,
        JSON.stringify(photos || []),
        finalNotes,
        latitude, longitude,
        clientSignature,
        serviceRecordId
      ]
    );

    // Update route stop
    if (stopId) {
      await query(
        `UPDATE route_stops SET
          actual_departure = CURRENT_TIMESTAMP,
          status = 'completed'
         WHERE id = $1`,
        [stopId]
      );
    }

    // Update route progress
    if (service.route_id) {
      await query(
        `UPDATE routes SET
          completed_stops = (
            SELECT COUNT(*) FROM route_stops WHERE route_id = $1 AND status = 'completed'
          ),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [service.route_id]
      );

      // Check if all stops completed
      const routeCheck = await query(
        `SELECT total_stops, completed_stops FROM routes WHERE id = $1`,
        [service.route_id]
      );

      if (routeCheck.rows[0].total_stops === routeCheck.rows[0].completed_stops) {
        await query(
          `UPDATE routes SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [service.route_id]
        );
      }
    }

    // Update maintenance reminders if filter was washed/changed
    if (filterWashed) {
      await query(
        `UPDATE maintenance_reminders SET
          last_done_date = CURRENT_DATE,
          next_due_date = CURRENT_DATE + (frequency_weeks * 7),
          is_overdue = false,
          is_completed = false
         WHERE client_id = $1 AND reminder_type = 'filter_wash'`,
        [service.client_id]
      );
    }

    if (filterChanged) {
      await query(
        `UPDATE maintenance_reminders SET
          last_done_date = CURRENT_DATE,
          next_due_date = CURRENT_DATE + INTERVAL '1 year',
          is_overdue = false,
          is_completed = false
         WHERE client_id = $1 AND reminder_type = 'filter_change'`,
        [service.client_id]
      );
    }

    res.json({
      success: true,
      serviceRecord: updateResult.rows[0],
      duration: durationMinutes
    });
  } catch (error) {
    console.error('Error completing service:', error);
    res.status(500).json({ error: 'Error completando servicio' });
  }
});

// Skip service
router.post('/service/skip', authenticateTechnician, async (req, res) => {
  try {
    const { stopId, serviceRecordId, reason } = req.body;

    // If serviceRecordId is provided, find the associated stop
    if (serviceRecordId) {
      const serviceResult = await query(
        `SELECT sr.*, rs.id as stop_id, rs.route_id
         FROM service_records sr
         LEFT JOIN route_stops rs ON rs.service_record_id = sr.id
         WHERE sr.id = $1 AND sr.company_id = $2`,
        [serviceRecordId, req.technician.companyId]
      );

      if (serviceResult.rows.length === 0) {
        return res.status(404).json({ error: 'Servicio no encontrado' });
      }

      const service = serviceResult.rows[0];

      // Update service record
      await query(
        `UPDATE service_records SET
          status = 'skipped',
          technician_notes = $1,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [reason || 'Sin razón especificada', serviceRecordId]
      );

      // Update route stop if exists
      if (service.stop_id) {
        await query(
          `UPDATE route_stops SET
            status = 'skipped',
            skip_reason = $1
           WHERE id = $2`,
          [reason || 'Sin razón especificada', service.stop_id]
        );

        // Update route
        if (service.route_id) {
          await query(
            `UPDATE routes SET
              skipped_stops = skipped_stops + 1,
              updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [service.route_id]
          );
        }
      }

      return res.json({ success: true });
    }

    // Original logic using stopId
    if (!stopId) {
      return res.status(400).json({ error: 'stopId o serviceRecordId requerido' });
    }

    // Verify stop belongs to technician
    const stopResult = await query(
      `SELECT rs.*, r.route_id
       FROM route_stops rs
       JOIN routes r ON rs.route_id = r.id
       WHERE rs.id = $1 AND r.technician_id = $2`,
      [stopId, req.technician.id]
    );

    if (stopResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parada no encontrada' });
    }

    // Update stop
    await query(
      `UPDATE route_stops SET
        status = 'skipped',
        skip_reason = $1
       WHERE id = $2`,
      [reason || 'Sin razón especificada', stopId]
    );

    // Update route
    await query(
      `UPDATE routes SET
        skipped_stops = skipped_stops + 1,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [stopResult.rows[0].route_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error skipping service:', error);
    res.status(500).json({ error: 'Error saltando servicio' });
  }
});

// Get all services for this technician (paginated)
router.get('/services', authenticateTechnician, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE sr.technician_id = $1 AND sr.company_id = $2';
    const params = [req.technician.id, req.technician.companyId];
    let paramCount = 3;

    if (status) {
      whereClause += ` AND sr.status = $${paramCount++}`;
      params.push(status);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM service_records sr ${whereClause}`,
      params
    );

    // Get services
    params.push(limit, offset);
    const result = await query(
      `SELECT sr.*,
              c.first_name as client_first_name,
              c.last_name as client_last_name,
              c.address as client_address,
              p.name as pool_name
       FROM service_records sr
       JOIN clients c ON sr.client_id = c.id
       LEFT JOIN pools p ON p.client_id = c.id AND p.is_active = true
       ${whereClause}
       ORDER BY sr.scheduled_date DESC, sr.arrival_time DESC
       LIMIT $${paramCount++} OFFSET $${paramCount}`,
      params
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

// Get service history for a client
router.get('/client/:clientId/history', authenticateTechnician, async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const result = await query(
      `SELECT sr.*, t.first_name as tech_first, t.last_name as tech_last
       FROM service_records sr
       LEFT JOIN technicians t ON sr.technician_id = t.id
       WHERE sr.client_id = $1 AND sr.company_id = $2 AND sr.status = 'completed'
       ORDER BY sr.scheduled_date DESC
       LIMIT $3`,
      [req.params.clientId, req.technician.companyId, limit]
    );

    res.json({ services: result.rows });
  } catch (error) {
    console.error('Error fetching client history:', error);
    res.status(500).json({ error: 'Error cargando historial' });
  }
});

// ============================================
// PHOTOS
// ============================================

// Upload photo (base64)
router.post('/photos/upload', authenticateTechnician, async (req, res) => {
  try {
    const { serviceRecordId, photo, caption } = req.body;

    if (!photo) {
      return res.status(400).json({ error: 'Foto requerida' });
    }

    // In production, upload to S3/cloud storage
    // For now, we'll store the reference
    const photoData = {
      id: Date.now().toString(),
      url: photo, // In production this would be the S3 URL
      caption: caption || '',
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.technician.id
    };

    // Update service record photos array
    await query(
      `UPDATE service_records
       SET photos = COALESCE(photos, '[]')::jsonb || $1::jsonb
       WHERE id = $2 AND technician_id = $3`,
      [JSON.stringify([photoData]), serviceRecordId, req.technician.id]
    );

    res.json({ success: true, photo: photoData });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Error subiendo foto' });
  }
});

module.exports = router;
