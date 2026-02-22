const express = require('express');
const { query, getClient } = require('../config/database');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();

// Get all inventory
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { lowStock } = req.query;

    let sql = `
      SELECT inv.*, ch.name, ch.unit, ch.category, ch.cost_per_unit,
             CASE WHEN inv.quantity <= inv.min_stock_level THEN true ELSE false END as is_low_stock
      FROM inventory inv
      JOIN chemicals ch ON inv.chemical_id = ch.id
      WHERE inv.company_id = $1 AND ch.is_active = true
    `;
    const params = [req.user.company_id];

    if (lowStock === 'true') {
      sql += ` AND inv.quantity <= inv.min_stock_level`;
    }

    sql += ` ORDER BY ch.category, ch.name`;

    const result = await query(sql, params);
    res.json({ inventory: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get inventory item by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT inv.*, ch.name, ch.unit, ch.category
       FROM inventory inv
       JOIN chemicals ch ON inv.chemical_id = ch.id
       WHERE inv.id = $1 AND inv.company_id = $2`,
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    res.json({ item: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update inventory (add stock)
router.post('/:id/add', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const { quantity, unitCost, notes } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Cantidad debe ser mayor a 0' });
    }

    // Update inventory
    const result = await client.query(
      `UPDATE inventory
       SET quantity = quantity + $1,
           last_purchase_date = CURRENT_DATE,
           last_purchase_price = COALESCE($2, last_purchase_price)
       WHERE id = $3 AND company_id = $4
       RETURNING *`,
      [quantity, unitCost, req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    // Create movement record
    await client.query(
      `INSERT INTO inventory_movements (inventory_id, company_id, user_id, movement_type, quantity, unit_cost, notes)
       VALUES ($1, $2, $3, 'purchase', $4, $5, $6)`,
      [req.params.id, req.user.company_id, req.user.id, quantity, unitCost, notes]
    );

    await client.query('COMMIT');

    res.json({ inventory: result.rows[0], message: 'Stock agregado exitosamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Adjust inventory
router.post('/:id/adjust', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const { newQuantity, reason } = req.body;

    if (newQuantity === undefined || newQuantity < 0) {
      return res.status(400).json({ error: 'Cantidad inválida' });
    }

    // Get current quantity
    const current = await client.query(
      'SELECT quantity FROM inventory WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );

    if (current.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    const difference = newQuantity - current.rows[0].quantity;

    // Update inventory
    await client.query(
      'UPDATE inventory SET quantity = $1 WHERE id = $2',
      [newQuantity, req.params.id]
    );

    // Create movement record
    await client.query(
      `INSERT INTO inventory_movements (inventory_id, company_id, user_id, movement_type, quantity, notes)
       VALUES ($1, $2, $3, 'adjustment', $4, $5)`,
      [req.params.id, req.user.company_id, req.user.id, difference, reason || 'Ajuste manual']
    );

    await client.query('COMMIT');

    res.json({ message: 'Inventario ajustado exitosamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Update min stock level
router.put('/:id/min-stock', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { minStockLevel } = req.body;

    const result = await query(
      `UPDATE inventory SET min_stock_level = $1
       WHERE id = $2 AND company_id = $3
       RETURNING *`,
      [minStockLevel, req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    res.json({ inventory: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Get inventory movements
router.get('/:id/movements', authenticate, async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await query(
      `SELECT im.*, u.first_name || ' ' || u.last_name as user_name
       FROM inventory_movements im
       LEFT JOIN users u ON im.user_id = u.id
       WHERE im.inventory_id = $1 AND im.company_id = $2
       ORDER BY im.created_at DESC
       LIMIT $3 OFFSET $4`,
      [req.params.id, req.user.company_id, limit, offset]
    );

    res.json({ movements: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get low stock alerts
router.get('/status/low-stock', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT inv.*, ch.name, ch.unit
       FROM inventory inv
       JOIN chemicals ch ON inv.chemical_id = ch.id
       WHERE inv.company_id = $1 AND inv.quantity <= inv.min_stock_level AND ch.is_active = true
       ORDER BY (inv.min_stock_level - inv.quantity) DESC`,
      [req.user.company_id]
    );

    res.json({ lowStockItems: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
