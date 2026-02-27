const express = require('express');
const { query } = require('../config/database');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();

// ============================================
// SERVICE ITEMS CATALOG (Master list)
// ============================================

// Get all service items (catalog)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { type, category, search, active } = req.query;

    let sql = `
      SELECT * FROM service_items
      WHERE company_id = $1
    `;
    const params = [req.user.company_id];
    let paramIndex = 2;

    if (type) {
      sql += ` AND item_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (active !== undefined) {
      sql += ` AND is_active = $${paramIndex}`;
      params.push(active === 'true');
      paramIndex++;
    }

    sql += ' ORDER BY item_type, category, name';

    const result = await query(sql, params);
    res.json({ items: result.rows });
  } catch (error) {
    next(error);
  }
});

// Search service items for invoice item selector
router.get('/search', authenticate, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ items: [] });
    }

    // Use SELECT * to handle cases where some columns may not exist yet
    const result = await query(
      `SELECT *
       FROM service_items
       WHERE company_id = $1 AND is_active = true
         AND (name ILIKE $2 OR description ILIKE $2)
       ORDER BY name
       LIMIT 20`,
      [req.user.company_id, `%${q}%`]
    );

    res.json({ items: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get categories
router.get('/categories', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT DISTINCT category FROM service_items
       WHERE company_id = $1 AND category IS NOT NULL
       ORDER BY category`,
      [req.user.company_id]
    );
    res.json({ categories: result.rows.map(r => r.category) });
  } catch (error) {
    next(error);
  }
});

// Get single item
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM service_items WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ item: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Generate SKU
async function generateSku(companyId, itemType, name) {
  // Get prefix based on item type
  const prefixes = {
    service: 'SRV',
    product: 'PRD',
    chemical: 'CHM',
    part: 'PRT',
    other: 'OTH'
  };
  const prefix = prefixes[itemType] || 'ITM';

  // Get count for sequence
  const countResult = await query(
    `SELECT COUNT(*) FROM service_items WHERE company_id = $1 AND item_type = $2`,
    [companyId, itemType]
  );
  const seq = parseInt(countResult.rows[0].count) + 1;

  // Generate SKU: PREFIX-XXX (e.g., SRV-001)
  return `${prefix}-${String(seq).padStart(3, '0')}`;
}

// Create service item
router.post('/', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { name, sku, description, itemType, category, basePrice, costPrice, unit, taxRate } = req.body;

    if (!name || basePrice === undefined) {
      return res.status(400).json({ error: 'Name and base price are required' });
    }

    // Auto-generate SKU if not provided
    let finalSku = sku;
    if (!finalSku) {
      finalSku = await generateSku(req.user.company_id, itemType || 'service', name);
    }

    // Check for SKU uniqueness
    if (finalSku) {
      const existing = await query(
        `SELECT id FROM service_items WHERE company_id = $1 AND sku = $2`,
        [req.user.company_id, finalSku]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'SKU already exists' });
      }
    }

    const result = await query(
      `INSERT INTO service_items (company_id, name, sku, description, item_type, category, base_price, cost_price, unit, tax_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [req.user.company_id, name, finalSku, description, itemType || 'service', category, basePrice, costPrice, unit || 'unit', taxRate || 0]
    );

    res.status(201).json({ item: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update service item
router.put('/:id', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { name, sku, description, itemType, category, basePrice, costPrice, unit, taxRate, isActive } = req.body;

    // Check for SKU uniqueness if updating SKU
    if (sku) {
      const existing = await query(
        `SELECT id FROM service_items WHERE company_id = $1 AND sku = $2 AND id != $3`,
        [req.user.company_id, sku, req.params.id]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'SKU already exists' });
      }
    }

    const result = await query(
      `UPDATE service_items SET
        name = COALESCE($1, name),
        sku = COALESCE($2, sku),
        description = COALESCE($3, description),
        item_type = COALESCE($4, item_type),
        category = COALESCE($5, category),
        base_price = COALESCE($6, base_price),
        cost_price = COALESCE($7, cost_price),
        unit = COALESCE($8, unit),
        tax_rate = COALESCE($9, tax_rate),
        is_active = COALESCE($10, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 AND company_id = $12
       RETURNING *`,
      [name, sku, description, itemType, category, basePrice, costPrice, unit, taxRate, isActive, req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ item: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete service item
router.delete('/:id', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    // Check if item is assigned to any client
    const usageCheck = await query(
      'SELECT COUNT(*) FROM client_service_items WHERE service_item_id = $1',
      [req.params.id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      // Soft delete - just deactivate
      await query(
        'UPDATE service_items SET is_active = false WHERE id = $1 AND company_id = $2',
        [req.params.id, req.user.company_id]
      );
      return res.json({ message: 'Item deactivated (in use by clients)' });
    }

    const result = await query(
      'DELETE FROM service_items WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// CLIENT SERVICE ITEMS (Items assigned to clients)
// ============================================

// Get items assigned to a client
router.get('/client/:clientId', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT csi.*, si.name, si.description, si.item_type, si.category, si.base_price, si.unit
       FROM client_service_items csi
       JOIN service_items si ON csi.service_item_id = si.id
       WHERE csi.client_id = $1 AND csi.company_id = $2
       ORDER BY csi.is_recurring DESC, si.item_type, si.name`,
      [req.params.clientId, req.user.company_id]
    );

    res.json({ clientItems: result.rows });
  } catch (error) {
    next(error);
  }
});

// Assign item to client
router.post('/client/:clientId', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { serviceItemId, customPrice, quantity, frequency, isRecurring, startDate, notes } = req.body;

    if (!serviceItemId) {
      return res.status(400).json({ error: 'Service item ID is required' });
    }

    // Verify the item belongs to the company
    const itemCheck = await query(
      'SELECT id FROM service_items WHERE id = $1 AND company_id = $2',
      [serviceItemId, req.user.company_id]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Service item not found' });
    }

    const result = await query(
      `INSERT INTO client_service_items
        (client_id, company_id, service_item_id, custom_price, quantity, frequency, is_recurring, start_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (client_id, service_item_id, frequency)
       DO UPDATE SET
         custom_price = EXCLUDED.custom_price,
         quantity = EXCLUDED.quantity,
         is_recurring = EXCLUDED.is_recurring,
         is_active = true,
         notes = EXCLUDED.notes,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        req.params.clientId,
        req.user.company_id,
        serviceItemId,
        customPrice,
        quantity || 1,
        frequency || 'monthly',
        isRecurring !== false,
        startDate || new Date(),
        notes
      ]
    );

    // Fetch with item details
    const fullResult = await query(
      `SELECT csi.*, si.name, si.description, si.item_type, si.category, si.base_price, si.unit
       FROM client_service_items csi
       JOIN service_items si ON csi.service_item_id = si.id
       WHERE csi.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ clientItem: fullResult.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update client item assignment
router.put('/client/:clientId/:itemId', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { customPrice, quantity, frequency, isRecurring, isActive, endDate, notes } = req.body;

    const result = await query(
      `UPDATE client_service_items SET
        custom_price = COALESCE($1, custom_price),
        quantity = COALESCE($2, quantity),
        frequency = COALESCE($3, frequency),
        is_recurring = COALESCE($4, is_recurring),
        is_active = COALESCE($5, is_active),
        end_date = $6,
        notes = COALESCE($7, notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND client_id = $9 AND company_id = $10
       RETURNING *`,
      [customPrice, quantity, frequency, isRecurring, isActive, endDate, notes, req.params.itemId, req.params.clientId, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client item not found' });
    }

    res.json({ clientItem: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Remove item from client
router.delete('/client/:clientId/:itemId', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM client_service_items WHERE id = $1 AND client_id = $2 AND company_id = $3 RETURNING id',
      [req.params.itemId, req.params.clientId, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client item not found' });
    }

    res.json({ message: 'Item removed from client' });
  } catch (error) {
    next(error);
  }
});

// Get client's monthly total
router.get('/client/:clientId/summary', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE csi.is_recurring = true) as recurring_items,
        SUM(
          COALESCE(csi.custom_price, si.base_price) * csi.quantity *
          CASE csi.frequency
            WHEN 'weekly' THEN 4
            WHEN 'biweekly' THEN 2
            WHEN 'monthly' THEN 1
            WHEN 'quarterly' THEN 0.33
            WHEN 'semiannual' THEN 0.17
            WHEN 'annual' THEN 0.083
            ELSE 0
          END
        ) as estimated_monthly_total
       FROM client_service_items csi
       JOIN service_items si ON csi.service_item_id = si.id
       WHERE csi.client_id = $1 AND csi.company_id = $2 AND csi.is_active = true AND csi.is_recurring = true`,
      [req.params.clientId, req.user.company_id]
    );

    res.json({ summary: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
