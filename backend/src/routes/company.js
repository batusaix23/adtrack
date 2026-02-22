const express = require('express');
const { query } = require('../config/database');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();

// Get company info
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, slug, email, phone, address, logo_url, timezone, settings,
              website, instagram, facebook, twitter, fei_ein,
              subscription_plan, subscription_expires_at, is_active, created_at
       FROM companies WHERE id = $1`,
      [req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.json({ company: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update company info
router.put('/', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const {
      name, email, phone, address, timezone,
      website, instagram, facebook, twitter, feiEin
    } = req.body;

    const result = await query(
      `UPDATE companies
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           timezone = COALESCE($5, timezone),
           website = COALESCE($6, website),
           instagram = COALESCE($7, instagram),
           facebook = COALESCE($8, facebook),
           twitter = COALESCE($9, twitter),
           fei_ein = COALESCE($10, fei_ein),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [name, email, phone, address, timezone, website, instagram, facebook, twitter, feiEin, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.json({ company: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
