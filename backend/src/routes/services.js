const express = require('express');
const { query, getClient } = require('../config/database');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');
const upload = require('../middleware/upload');

const router = express.Router();

// Get services with filters
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate, technicianId, poolId, status, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT sr.*, p.name as pool_name, c.name as client_name,
             t.first_name || ' ' || t.last_name as technician_name
       FROM service_records sr
       JOIN pools p ON sr.pool_id = p.id
       JOIN clients c ON c.id = p.client_id
       LEFT JOIN technicians t ON sr.technician_id = t.id
       WHERE sr.company_id = $1
    `;
    const params = [req.user.company_id];
    let paramIndex = 2;

    // Technicians can only see their own services
    if (req.user.role === 'technician') {
      sql += ` AND sr.technician_id = $${paramIndex}`;
      params.push(req.user.id);
      paramIndex++;
    } else if (technicianId) {
      sql += ` AND sr.technician_id = $${paramIndex}`;
      params.push(technicianId);
      paramIndex++;
    }

    if (startDate) {
      sql += ` AND sr.scheduled_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      sql += ` AND sr.scheduled_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (poolId) {
      sql += ` AND sr.pool_id = $${paramIndex}`;
      params.push(poolId);
      paramIndex++;
    }

    if (status) {
      sql += ` AND sr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    sql += ` ORDER BY sr.scheduled_date DESC, sr.scheduled_time DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    res.json({ services: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get services for calendar
router.get('/calendar', authenticate, async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    let sql = `
      SELECT sr.id, sr.scheduled_date, sr.scheduled_time, sr.status,
             p.name as pool_name, c.name as client_name,
             t.first_name as technician_first_name
       FROM service_records sr
       JOIN pools p ON sr.pool_id = p.id
       JOIN clients c ON c.id = p.client_id
       LEFT JOIN technicians t ON sr.technician_id = t.id
       WHERE sr.company_id = $1
         AND sr.scheduled_date BETWEEN $2 AND $3
    `;
    const params = [req.user.company_id, startDate, endDate];

    if (req.user.role === 'technician') {
      sql += ` AND sr.technician_id = $4`;
      params.push(req.user.id);
    }

    sql += ` ORDER BY sr.scheduled_date, sr.scheduled_time`;

    const result = await query(sql, params);
    res.json({ services: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get service by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT sr.*, p.name as pool_name, p.volume_gallons, p.has_salt_system,
              c.name as client_name, c.phone as client_phone,
              t.first_name || ' ' || t.last_name as technician_name,
              json_agg(DISTINCT jsonb_build_object(
                'id', cu.id,
                'chemical_id', cu.chemical_id,
                'quantity', cu.quantity,
                'name', ch.name,
                'unit', ch.unit
              )) FILTER (WHERE cu.id IS NOT NULL) as chemicals_used,
              json_agg(DISTINCT jsonb_build_object(
                'id', sp.id,
                'photo_url', sp.photo_url,
                'caption', sp.caption,
                'photo_type', sp.photo_type
              )) FILTER (WHERE sp.id IS NOT NULL) as photos
       FROM service_records sr
       JOIN pools p ON sr.pool_id = p.id
       JOIN clients c ON c.id = p.client_id
       LEFT JOIN technicians t ON sr.technician_id = t.id
       LEFT JOIN chemical_usage cu ON cu.service_record_id = sr.id
       LEFT JOIN chemicals ch ON cu.chemical_id = ch.id
       LEFT JOIN service_photos sp ON sp.service_record_id = sr.id
       WHERE sr.id = $1 AND sr.company_id = $2
       GROUP BY sr.id, p.name, p.volume_gallons, p.has_salt_system,
                c.name, c.phone, t.first_name, t.last_name`,
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    res.json({ service: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Create scheduled service
router.post('/', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { poolId, technicianId, scheduledDate, scheduledTime } = req.body;

    if (!poolId || !technicianId || !scheduledDate) {
      return res.status(400).json({ error: 'Piscina, técnico y fecha son requeridos' });
    }

    const result = await query(
      `INSERT INTO service_records (company_id, pool_id, technician_id, scheduled_date, scheduled_time)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.company_id, poolId, technicianId, scheduledDate, scheduledTime]
    );

    res.status(201).json({ service: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Start service (technician)
router.post('/:id/start', authenticate, async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;

    const result = await query(
      `UPDATE service_records
       SET status = 'in_progress',
           arrival_time = NOW(),
           arrival_latitude = $1,
           arrival_longitude = $2
       WHERE id = $3 AND company_id = $4 AND technician_id = $5 AND status = 'pending'
       RETURNING *`,
      [latitude, longitude, req.params.id, req.user.company_id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado o no asignado' });
    }

    res.json({ service: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Complete service
router.post('/:id/complete', authenticate, async (req, res, next) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const {
      latitude, longitude,
      phLevel, chlorineLevel, alkalinity, calciumHardness, cyanuricAcid, saltLevel, waterTemperature,
      skimmedSurface, brushedWalls, vacuumedPool, cleanedSkimmer, checkedEquipment, backwashedFilter, emptiedPumpBasket,
      chemicals, notes, signature, signatureName
    } = req.body;

    // Update service record
    const result = await client.query(
      `UPDATE service_records
       SET status = 'completed',
           departure_time = NOW(),
           departure_latitude = $1,
           departure_longitude = $2,
           ph_level = $3,
           chlorine_level = $4,
           alkalinity = $5,
           calcium_hardness = $6,
           cyanuric_acid = $7,
           salt_level = $8,
           water_temperature = $9,
           skimmed_surface = $10,
           brushed_walls = $11,
           vacuumed_pool = $12,
           cleaned_skimmer = $13,
           checked_equipment = $14,
           backwashed_filter = $15,
           emptied_pump_basket = $16,
           notes = $17,
           client_signature = $18,
           signature_name = $19,
           signature_timestamp = $20,
           duration_minutes = EXTRACT(EPOCH FROM (NOW() - arrival_time)) / 60
       WHERE id = $21 AND company_id = $22 AND technician_id = $23 AND status = 'in_progress'
       RETURNING *`,
      [
        latitude, longitude,
        phLevel, chlorineLevel, alkalinity, calciumHardness, cyanuricAcid, saltLevel, waterTemperature,
        skimmedSurface, brushedWalls, vacuumedPool, cleanedSkimmer, checkedEquipment, backwashedFilter, emptiedPumpBasket,
        notes, signature, signatureName, signature ? new Date() : null,
        req.params.id, req.user.company_id, req.user.id
      ]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Servicio no encontrado o no en progreso' });
    }

    // Add chemical usage
    if (chemicals && chemicals.length > 0) {
      for (const chem of chemicals) {
        if (chem.quantity > 0) {
          await client.query(
            `INSERT INTO chemical_usage (service_record_id, chemical_id, quantity)
             VALUES ($1, $2, $3)`,
            [req.params.id, chem.chemicalId, chem.quantity]
          );
        }
      }
    }

    await client.query('COMMIT');

    res.json({ service: result.rows[0], message: 'Servicio completado exitosamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Upload service photo
router.post('/:id/photos', authenticate, upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó imagen' });
    }

    const { caption, photoType } = req.body;
    const photoUrl = `/uploads/${req.user.company_id}/${req.file.filename}`;

    const result = await query(
      `INSERT INTO service_photos (service_record_id, photo_url, caption, photo_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.id, photoUrl, caption, photoType || 'general']
    );

    res.status(201).json({ photo: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Cancel service
router.post('/:id/cancel', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { reason } = req.body;

    const result = await query(
      `UPDATE service_records
       SET status = 'cancelled', notes = COALESCE(notes || ' | ', '') || 'Cancelado: ' || $1
       WHERE id = $2 AND company_id = $3 AND status = 'pending'
       RETURNING *`,
      [reason || 'Sin razón especificada', req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado o no puede ser cancelado' });
    }

    res.json({ service: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Reschedule service
router.put('/:id/reschedule', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { scheduledDate, scheduledTime, technicianId } = req.body;

    const result = await query(
      `UPDATE service_records
       SET scheduled_date = COALESCE($1, scheduled_date),
           scheduled_time = COALESCE($2, scheduled_time),
           technician_id = COALESCE($3, technician_id)
       WHERE id = $4 AND company_id = $5 AND status = 'pending'
       RETURNING *`,
      [scheduledDate, scheduledTime, technicianId, req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado o no puede ser reprogramado' });
    }

    res.json({ service: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Bulk create services (for recurring)
router.post('/bulk', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const { services } = req.body;

    if (!services || !Array.isArray(services)) {
      return res.status(400).json({ error: 'Se requiere un array de servicios' });
    }

    const created = [];
    for (const svc of services) {
      const result = await client.query(
        `INSERT INTO service_records (company_id, pool_id, technician_id, scheduled_date, scheduled_time)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [req.user.company_id, svc.poolId, svc.technicianId, svc.scheduledDate, svc.scheduledTime]
      );
      if (result.rows.length > 0) {
        created.push(result.rows[0].id);
      }
    }

    await client.query('COMMIT');

    res.status(201).json({ created: created.length, serviceIds: created });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
