const express = require('express');
const { query } = require('../config/database');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();

// Get rates for a client
router.get('/:clientId', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM client_rates
       WHERE client_id = $1 AND company_id = $2
       ORDER BY created_at DESC`,
      [req.params.clientId, req.user.company_id]
    );
    res.json({ rates: result.rows });
  } catch (error) {
    next(error);
  }
});

// Create rate
router.post('/:clientId', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { name, amount, frequency, nextBillingDate } = req.body;

    if (!name || !amount) {
      return res.status(400).json({ error: 'Name and amount are required' });
    }

    const result = await query(
      `INSERT INTO client_rates (client_id, company_id, name, amount, frequency, next_billing_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.clientId, req.user.company_id, name, amount, frequency || 'monthly', nextBillingDate]
    );

    res.status(201).json({ rate: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update rate
router.put('/:clientId/:rateId', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { name, amount, frequency, isActive, nextBillingDate } = req.body;

    const result = await query(
      `UPDATE client_rates
       SET name = COALESCE($1, name),
           amount = COALESCE($2, amount),
           frequency = COALESCE($3, frequency),
           is_active = COALESCE($4, is_active),
           next_billing_date = COALESCE($5, next_billing_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND client_id = $7 AND company_id = $8
       RETURNING *`,
      [name, amount, frequency, isActive, nextBillingDate, req.params.rateId, req.params.clientId, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rate not found' });
    }

    res.json({ rate: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete rate
router.delete('/:clientId/:rateId', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM client_rates WHERE id = $1 AND client_id = $2 AND company_id = $3 RETURNING id',
      [req.params.rateId, req.params.clientId, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rate not found' });
    }

    res.json({ message: 'Rate deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
