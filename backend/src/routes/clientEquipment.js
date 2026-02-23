const express = require('express');
const { query } = require('../config/database');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();

// Get equipment for a client
router.get('/:clientId', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM client_equipment
       WHERE client_id = $1 AND company_id = $2
       ORDER BY equipment_type, created_at DESC`,
      [req.params.clientId, req.user.company_id]
    );
    res.json({ equipment: result.rows });
  } catch (error) {
    next(error);
  }
});

// Create equipment
router.post('/:clientId', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { equipmentType, brand, model, serialNumber, installDate, notes } = req.body;

    if (!equipmentType) {
      return res.status(400).json({ error: 'Equipment type is required' });
    }

    const result = await query(
      `INSERT INTO client_equipment (client_id, company_id, equipment_type, brand, model, serial_number, install_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.params.clientId, req.user.company_id, equipmentType, brand, model, serialNumber, installDate, notes]
    );

    res.status(201).json({ equipment: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update equipment
router.put('/:clientId/:equipmentId', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { equipmentType, brand, model, serialNumber, installDate, notes } = req.body;

    const result = await query(
      `UPDATE client_equipment
       SET equipment_type = COALESCE($1, equipment_type),
           brand = COALESCE($2, brand),
           model = COALESCE($3, model),
           serial_number = COALESCE($4, serial_number),
           install_date = COALESCE($5, install_date),
           notes = COALESCE($6, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND client_id = $8 AND company_id = $9
       RETURNING *`,
      [equipmentType, brand, model, serialNumber, installDate, notes, req.params.equipmentId, req.params.clientId, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json({ equipment: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete equipment
router.delete('/:clientId/:equipmentId', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM client_equipment WHERE id = $1 AND client_id = $2 AND company_id = $3 RETURNING id',
      [req.params.equipmentId, req.params.clientId, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json({ message: 'Equipment deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
