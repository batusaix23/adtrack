const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

// Get all estimates
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, clientId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE e.company_id = $1';
    const params = [req.user.company_id];
    let paramCount = 2;

    if (status) {
      whereClause += ` AND e.status = $${paramCount++}`;
      params.push(status);
    }

    if (clientId) {
      whereClause += ` AND e.client_id = $${paramCount++}`;
      params.push(clientId);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM estimates e ${whereClause}`,
      params
    );

    // Get estimates with client info
    params.push(limit, offset);
    const result = await query(
      `SELECT e.*,
              c.first_name as client_first_name,
              c.last_name as client_last_name,
              c.email as client_email,
              c.company_name as client_company
       FROM estimates e
       JOIN clients c ON e.client_id = c.id
       ${whereClause}
       ORDER BY e.created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount}`,
      params
    );

    res.json({
      estimates: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching estimates:', error);
    res.status(500).json({ error: 'Error fetching estimates' });
  }
});

// Get single estimate with items
router.get('/:id', authenticate, async (req, res) => {
  try {
    const estimateResult = await query(
      `SELECT e.*,
              c.first_name as client_first_name,
              c.last_name as client_last_name,
              c.email as client_email,
              c.phone as client_phone,
              c.address as client_address,
              c.city as client_city,
              c.state as client_state,
              c.zip_code as client_zip
       FROM estimates e
       JOIN clients c ON e.client_id = c.id
       WHERE e.id = $1 AND e.company_id = $2`,
      [req.params.id, req.user.company_id]
    );

    if (estimateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    const itemsResult = await query(
      `SELECT * FROM estimate_items WHERE estimate_id = $1 ORDER BY sort_order`,
      [req.params.id]
    );

    res.json({
      estimate: estimateResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('Error fetching estimate:', error);
    res.status(500).json({ error: 'Error fetching estimate' });
  }
});

// Create estimate
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      clientId, title, description, items,
      taxRate, discountAmount, validUntil, notes, terms
    } = req.body;

    if (!clientId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Client and items are required' });
    }

    // Get next estimate number
    const settingsResult = await query(
      `INSERT INTO invoice_settings (company_id)
       VALUES ($1)
       ON CONFLICT (company_id) DO UPDATE SET company_id = $1
       RETURNING next_estimate_number, estimate_prefix`,
      [req.user.company_id]
    );

    const settings = settingsResult.rows[0];
    const estimateNumber = `${settings.estimate_prefix}${String(settings.next_estimate_number).padStart(5, '0')}`;

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.quantity * item.unitPrice;
    }

    const taxAmount = subtotal * ((taxRate || 0) / 100);
    const total = subtotal + taxAmount - (discountAmount || 0);

    // Create estimate
    const estimateResult = await query(
      `INSERT INTO estimates (
        company_id, client_id, estimate_number,
        title, description, subtotal, tax_rate, tax_amount,
        discount_amount, total, valid_until, notes, terms,
        created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'draft')
      RETURNING *`,
      [
        req.user.company_id, clientId, estimateNumber,
        title, description, subtotal, taxRate || 0, taxAmount,
        discountAmount || 0, total, validUntil, notes, terms,
        req.user.userId
      ]
    );

    const estimate = estimateResult.rows[0];

    // Create items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await query(
        `INSERT INTO estimate_items (estimate_id, description, quantity, unit_price, total, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [estimate.id, item.description, item.quantity, item.unitPrice, item.quantity * item.unitPrice, i]
      );
    }

    // Increment estimate number
    await query(
      `UPDATE invoice_settings SET next_estimate_number = next_estimate_number + 1 WHERE company_id = $1`,
      [req.user.company_id]
    );

    res.status(201).json({ estimate });
  } catch (error) {
    console.error('Error creating estimate:', error);
    res.status(500).json({ error: 'Error creating estimate' });
  }
});

// Update estimate
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      title, description, items,
      taxRate, discountAmount, validUntil, notes, terms, status
    } = req.body;

    // Check estimate exists and is editable
    const existing = await query(
      `SELECT * FROM estimates WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user.company_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    if (existing.rows[0].status === 'converted') {
      return res.status(400).json({ error: 'Cannot edit converted estimate' });
    }

    // Calculate totals if items provided
    let subtotal = existing.rows[0].subtotal;
    let taxAmount = existing.rows[0].tax_amount;
    let total = existing.rows[0].total;

    if (items && items.length > 0) {
      subtotal = 0;
      for (const item of items) {
        subtotal += item.quantity * item.unitPrice;
      }
      taxAmount = subtotal * ((taxRate || existing.rows[0].tax_rate) / 100);
      total = subtotal + taxAmount - (discountAmount || existing.rows[0].discount_amount || 0);

      // Delete existing items and recreate
      await query('DELETE FROM estimate_items WHERE estimate_id = $1', [req.params.id]);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await query(
          `INSERT INTO estimate_items (estimate_id, description, quantity, unit_price, total, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [req.params.id, item.description, item.quantity, item.unitPrice, item.quantity * item.unitPrice, i]
        );
      }
    }

    // Update estimate
    const result = await query(
      `UPDATE estimates SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        subtotal = $3,
        tax_rate = COALESCE($4, tax_rate),
        tax_amount = $5,
        discount_amount = COALESCE($6, discount_amount),
        total = $7,
        valid_until = COALESCE($8, valid_until),
        notes = COALESCE($9, notes),
        terms = COALESCE($10, terms),
        status = COALESCE($11, status),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 AND company_id = $13
       RETURNING *`,
      [
        title, description, subtotal, taxRate, taxAmount,
        discountAmount, total, validUntil, notes, terms, status,
        req.params.id, req.user.company_id
      ]
    );

    res.json({ estimate: result.rows[0] });
  } catch (error) {
    console.error('Error updating estimate:', error);
    res.status(500).json({ error: 'Error updating estimate' });
  }
});

// Send estimate to client
router.post('/:id/send', authenticate, async (req, res) => {
  try {
    const { via = 'email' } = req.body;

    const result = await query(
      `UPDATE estimates SET
        status = 'sent',
        sent_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND company_id = $2
       RETURNING *`,
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    // TODO: Actually send email/sms/whatsapp

    res.json({ success: true, estimate: result.rows[0] });
  } catch (error) {
    console.error('Error sending estimate:', error);
    res.status(500).json({ error: 'Error sending estimate' });
  }
});

// Convert estimate to invoice
router.post('/:id/convert', authenticate, async (req, res) => {
  try {
    // Get estimate with items
    const estimateResult = await query(
      `SELECT e.*, c.first_name, c.last_name, c.email
       FROM estimates e
       JOIN clients c ON e.client_id = c.id
       WHERE e.id = $1 AND e.company_id = $2`,
      [req.params.id, req.user.company_id]
    );

    if (estimateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    const estimate = estimateResult.rows[0];

    if (estimate.status === 'converted') {
      return res.status(400).json({ error: 'Estimate already converted' });
    }

    const itemsResult = await query(
      `SELECT * FROM estimate_items WHERE estimate_id = $1 ORDER BY sort_order`,
      [req.params.id]
    );

    // Get next invoice number
    const settingsResult = await query(
      `SELECT next_invoice_number, invoice_prefix, default_due_days
       FROM invoice_settings WHERE company_id = $1`,
      [req.user.company_id]
    );

    const settings = settingsResult.rows[0] || { next_invoice_number: 1, invoice_prefix: 'INV-', default_due_days: 30 };
    const invoiceNumber = `${settings.invoice_prefix}${String(settings.next_invoice_number).padStart(5, '0')}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + settings.default_due_days);

    // Create invoice
    const invoiceResult = await query(
      `INSERT INTO invoices (
        company_id, client_id, invoice_number, invoice_type,
        subtotal, tax_rate, tax_amount, discount_amount, total, balance_due,
        issue_date, due_date, notes, terms, estimate_id, status, created_by
      ) VALUES ($1, $2, $3, 'one_time', $4, $5, $6, $7, $8, $8, CURRENT_DATE, $9, $10, $11, $12, 'draft', $13)
      RETURNING *`,
      [
        req.user.company_id, estimate.client_id, invoiceNumber,
        estimate.subtotal, estimate.tax_rate, estimate.tax_amount,
        estimate.discount_amount, estimate.total, dueDate.toISOString().split('T')[0],
        estimate.notes, estimate.terms, estimate.id, req.user.userId
      ]
    );

    const invoice = invoiceResult.rows[0];

    // Copy items
    for (const item of itemsResult.rows) {
      await query(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [invoice.id, item.description, item.quantity, item.unit_price, item.total, item.sort_order]
      );
    }

    // Update estimate status
    await query(
      `UPDATE estimates SET status = 'converted', converted_to_invoice_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [invoice.id, req.params.id]
    );

    // Increment invoice number
    await query(
      `UPDATE invoice_settings SET next_invoice_number = next_invoice_number + 1 WHERE company_id = $1`,
      [req.user.company_id]
    );

    res.json({ success: true, invoice });
  } catch (error) {
    console.error('Error converting estimate:', error);
    res.status(500).json({ error: 'Error converting estimate to invoice' });
  }
});

// Delete estimate
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM estimates WHERE id = $1 AND company_id = $2 AND status NOT IN ('converted')
       RETURNING id`,
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found or cannot be deleted' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting estimate:', error);
    res.status(500).json({ error: 'Error deleting estimate' });
  }
});

module.exports = router;
