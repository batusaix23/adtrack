const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'import-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Get all clients
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, active } = req.query;

    let sql = `
      SELECT c.id, c.name, c.last_name, c.company_name, c.email, c.phone,
             c.address, c.city, c.state, c.zip_code, c.notes, c.is_active,
             c.service_day, c.service_frequency, c.client_type,
             c.portal_enabled, c.portal_email,
             COUNT(p.id) as pool_count,
             (SELECT COUNT(*) FROM service_records sr
              JOIN pools p2 ON sr.pool_id = p2.id
              WHERE p2.client_id = c.id AND sr.status = 'completed') as total_services
      FROM clients c
      LEFT JOIN pools p ON p.client_id = c.id
      WHERE c.company_id = $1
    `;
    const params = [req.user.company_id];
    let paramIndex = 2;

    if (search) {
      sql += ` AND (c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (active !== undefined) {
      sql += ` AND c.is_active = $${paramIndex}`;
      params.push(active === 'true');
    }

    sql += ` GROUP BY c.id ORDER BY c.name`;

    const result = await query(sql, params);
    res.json({ clients: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get client by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*,
              json_agg(json_build_object(
                'id', p.id,
                'name', p.name,
                'pool_type', p.pool_type,
                'service_day', p.service_day
              ) ORDER BY p.name) FILTER (WHERE p.id IS NOT NULL) as pools
       FROM clients c
       LEFT JOIN pools p ON p.client_id = c.id AND p.is_active = true
       WHERE c.id = $1 AND c.company_id = $2
       GROUP BY c.id`,
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ client: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Create client
router.post('/', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const {
      firstName, lastName, companyName, email, phone, phoneSecondary,
      address, addressLine2, city, state, zipCode,
      billingAddress, billingCity, billingState, billingZip, billingEmail, billingCountry,
      // Shipping address
      shippingAddress, shippingCity, shippingState, shippingZip, shippingCountry,
      clientType, serviceFrequency, serviceDays, preferredTime,
      monthlyServiceCost, stabilizerCost, stabilizerFrequencyMonths,
      gateCode, accessNotes, notes, internalNotes,
      autopayEnabled, portalEnabled,
      // Zoho-style fields
      salutation, displayName, mobile, website, taxId,
      paymentTerms, creditLimit, currency, portalLanguage,
      assignedTechnicianId,
      // Legacy support
      name
    } = req.body;

    const clientFirstName = firstName || name;
    if (!clientFirstName) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    if (!address) {
      return res.status(400).json({ error: 'La dirección es requerida' });
    }

    // Generate display_name if not provided
    const finalDisplayName = displayName ||
      (companyName ? companyName : `${clientFirstName}${lastName ? ' ' + lastName : ''}`);

    const result = await query(
      `INSERT INTO clients (
        company_id, first_name, last_name, company_name, email, phone, phone_secondary,
        address, address_line2, city, state, zip_code,
        billing_address, billing_city, billing_state, billing_zip, billing_email, billing_country,
        shipping_address, shipping_city, shipping_state, shipping_zip, shipping_country,
        client_type, service_frequency, service_days, preferred_time,
        monthly_service_cost, stabilizer_cost, stabilizer_frequency_months,
        gate_code, access_notes, notes, internal_notes,
        autopay_enabled, portal_enabled,
        salutation, display_name, mobile, website, tax_id,
        payment_terms, credit_limit, currency, portal_language,
        assigned_technician_id,
        name, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, 'active')
       RETURNING *`,
      [
        req.user.company_id, clientFirstName, lastName, companyName, email, phone, phoneSecondary,
        address, addressLine2, city, state, zipCode,
        billingAddress, billingCity, billingState, billingZip, billingEmail, billingCountry || 'Puerto Rico',
        shippingAddress, shippingCity, shippingState, shippingZip, shippingCountry || 'Puerto Rico',
        clientType || 'residential', serviceFrequency || '1x_week',
        JSON.stringify(serviceDays || []), preferredTime,
        monthlyServiceCost, stabilizerCost, stabilizerFrequencyMonths || 3,
        gateCode, accessNotes, notes, internalNotes,
        autopayEnabled || false, portalEnabled || false,
        salutation, finalDisplayName, mobile, website, taxId,
        paymentTerms || 'net_30', creditLimit, currency || 'USD', portalLanguage || 'es',
        assignedTechnicianId || null,
        clientFirstName
      ]
    );

    res.status(201).json({ client: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update client
router.put('/:id', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const {
      firstName, lastName, companyName, email, phone, phoneSecondary,
      address, addressLine2, city, state, zipCode,
      billingAddress, billingCity, billingState, billingZip, billingEmail, billingCountry,
      shippingAddress, shippingCity, shippingState, shippingZip, shippingCountry,
      clientType, serviceFrequency, serviceDays, preferredTime,
      monthlyServiceCost, stabilizerCost, stabilizerFrequencyMonths,
      gateCode, accessNotes, notes, internalNotes,
      autopayEnabled, portalEnabled, status, isActive,
      assignedTechnicianId,
      // Zoho-style fields
      salutation, displayName, mobile, website, taxId,
      paymentTerms, creditLimit, currency, portalLanguage,
      // Legacy
      name, serviceDay
    } = req.body;

    const clientFirstName = firstName || name;

    const result = await query(
      `UPDATE clients
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           company_name = COALESCE($3, company_name),
           email = COALESCE($4, email),
           phone = COALESCE($5, phone),
           phone_secondary = COALESCE($6, phone_secondary),
           address = COALESCE($7, address),
           address_line2 = COALESCE($8, address_line2),
           city = COALESCE($9, city),
           state = COALESCE($10, state),
           zip_code = COALESCE($11, zip_code),
           billing_address = COALESCE($12, billing_address),
           billing_city = COALESCE($13, billing_city),
           billing_state = COALESCE($14, billing_state),
           billing_zip = COALESCE($15, billing_zip),
           billing_email = COALESCE($16, billing_email),
           client_type = COALESCE($17, client_type),
           service_frequency = COALESCE($18, service_frequency),
           service_days = COALESCE($19, service_days),
           preferred_time = COALESCE($20, preferred_time),
           monthly_service_cost = COALESCE($21, monthly_service_cost),
           stabilizer_cost = COALESCE($22, stabilizer_cost),
           stabilizer_frequency_months = COALESCE($23, stabilizer_frequency_months),
           gate_code = COALESCE($24, gate_code),
           access_notes = COALESCE($25, access_notes),
           notes = COALESCE($26, notes),
           internal_notes = COALESCE($27, internal_notes),
           autopay_enabled = COALESCE($28, autopay_enabled),
           portal_enabled = COALESCE($29, portal_enabled),
           status = COALESCE($30, status),
           is_active = COALESCE($31, is_active),
           assigned_technician_id = $32,
           name = COALESCE($1, name),
           service_day = COALESCE($33, service_day),
           salutation = COALESCE($34, salutation),
           display_name = COALESCE($35, display_name),
           mobile = COALESCE($36, mobile),
           website = COALESCE($37, website),
           tax_id = COALESCE($38, tax_id),
           payment_terms = COALESCE($39, payment_terms),
           credit_limit = COALESCE($40, credit_limit),
           currency = COALESCE($41, currency),
           portal_language = COALESCE($42, portal_language),
           shipping_address = COALESCE($43, shipping_address),
           shipping_city = COALESCE($44, shipping_city),
           shipping_state = COALESCE($45, shipping_state),
           shipping_zip = COALESCE($46, shipping_zip),
           shipping_country = COALESCE($47, shipping_country),
           billing_country = COALESCE($48, billing_country),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $49 AND company_id = $50
       RETURNING *`,
      [
        clientFirstName, lastName, companyName, email, phone, phoneSecondary,
        address, addressLine2, city, state, zipCode,
        billingAddress, billingCity, billingState, billingZip, billingEmail,
        clientType, serviceFrequency,
        serviceDays ? JSON.stringify(serviceDays) : null,
        preferredTime,
        monthlyServiceCost, stabilizerCost, stabilizerFrequencyMonths,
        gateCode, accessNotes, notes, internalNotes,
        autopayEnabled, portalEnabled, status, isActive,
        assignedTechnicianId || null,
        serviceDay,
        salutation, displayName, mobile, website, taxId,
        paymentTerms, creditLimit, currency, portalLanguage,
        shippingAddress, shippingCity, shippingState, shippingZip, shippingCountry,
        billingCountry,
        req.params.id, req.user.company_id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ client: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete client
router.delete('/:id', authenticate, authorizeRoles('owner'), async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM clients WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
});

// Get client service history
router.get('/:id/services', authenticate, async (req, res, next) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    const result = await query(
      `SELECT sr.*, p.name as pool_name,
              COALESCE(t.first_name || ' ' || t.last_name, u.first_name || ' ' || u.last_name) as technician_name
       FROM service_records sr
       LEFT JOIN pools p ON sr.pool_id = p.id
       LEFT JOIN technicians t ON sr.technician_id = t.id
       LEFT JOIN users u ON sr.technician_id = u.id
       WHERE sr.client_id = $1 AND sr.company_id = $2
       ORDER BY sr.scheduled_date DESC, sr.scheduled_time DESC
       LIMIT $3 OFFSET $4`,
      [req.params.id, req.user.company_id, limit, offset]
    );

    res.json({ services: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get client transactions (invoices + payments combined)
router.get('/:id/transactions', authenticate, async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    // Get invoices
    const invoicesResult = await query(
      `SELECT
        i.id,
        i.invoice_number as reference,
        'invoice' as type,
        i.issue_date as date,
        i.total as amount,
        i.balance_due,
        i.status,
        i.due_date,
        i.created_at
       FROM invoices i
       WHERE i.client_id = $1 AND i.company_id = $2
       ORDER BY i.created_at DESC`,
      [req.params.id, req.user.company_id]
    );

    // Get payments
    const paymentsResult = await query(
      `SELECT
        p.id,
        COALESCE('PAY-' || LPAD(ROW_NUMBER() OVER (ORDER BY p.created_at)::text, 5, '0'), p.payment_reference) as reference,
        'payment' as type,
        p.payment_date as date,
        p.amount,
        0 as balance_due,
        p.status,
        NULL as due_date,
        p.created_at,
        p.payment_method,
        i.invoice_number as invoice_reference
       FROM payments p
       LEFT JOIN invoices i ON p.invoice_id = i.id
       WHERE p.client_id = $1 AND p.company_id = $2
       ORDER BY p.created_at DESC`,
      [req.params.id, req.user.company_id]
    );

    // Combine and sort
    const transactions = [
      ...invoicesResult.rows,
      ...paymentsResult.rows
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
     .slice(offset, offset + parseInt(limit));

    res.json({ transactions });
  } catch (error) {
    next(error);
  }
});

// Get client billing summary
router.get('/:id/summary', authenticate, async (req, res, next) => {
  try {
    const clientId = req.params.id;
    const companyId = req.user.company_id;

    // Get invoice totals
    const invoiceSummary = await query(
      `SELECT
        COALESCE(SUM(total), 0) as total_invoiced,
        COALESCE(SUM(amount_paid), 0) as total_paid,
        COALESCE(SUM(balance_due), 0) as total_pending,
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
        COUNT(*) FILTER (WHERE status = 'sent') as open_count,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count
       FROM invoices
       WHERE client_id = $1 AND company_id = $2`,
      [clientId, companyId]
    );

    // Get credits (overpayments)
    const creditResult = await query(
      `SELECT COALESCE(c.balance, 0) as credits
       FROM clients c
       WHERE c.id = $1`,
      [clientId]
    );

    // Get last payment
    const lastPaymentResult = await query(
      `SELECT amount, payment_date, payment_method
       FROM payments
       WHERE client_id = $1 AND company_id = $2 AND status = 'completed'
       ORDER BY payment_date DESC
       LIMIT 1`,
      [clientId, companyId]
    );

    // Get service stats
    const serviceStats = await query(
      `SELECT
        COUNT(*) as total_services,
        MAX(scheduled_date) as last_service_date
       FROM service_records
       WHERE client_id = $1 AND company_id = $2 AND status = 'completed'`,
      [clientId, companyId]
    );

    res.json({
      summary: {
        ...invoiceSummary.rows[0],
        credits: creditResult.rows[0]?.credits || 0,
        lastPayment: lastPaymentResult.rows[0] || null,
        totalServices: serviceStats.rows[0]?.total_services || 0,
        lastServiceDate: serviceStats.rows[0]?.last_service_date || null
      }
    });
  } catch (error) {
    next(error);
  }
});

// Import clients from CSV/Excel file
router.post('/import', authenticate, authorizeRoles('owner', 'admin'), upload.single('file'), async (req, res, next) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let clients = [];

    if (ext === '.csv') {
      // Parse CSV file
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        return res.status(400).json({ error: 'File is empty or has no data rows' });
      }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

      // Map column names
      const columnMap = {
        'name': 'name',
        'nombre': 'name',
        'first_name': 'name',
        'last_name': 'last_name',
        'apellido': 'last_name',
        'company': 'company_name',
        'company_name': 'company_name',
        'empresa': 'company_name',
        'email': 'email',
        'correo': 'email',
        'phone': 'phone',
        'telefono': 'phone',
        'teléfono': 'phone',
        'address': 'address',
        'direccion': 'address',
        'dirección': 'address',
        'city': 'city',
        'ciudad': 'city',
        'state': 'state',
        'estado': 'state',
        'zip_code': 'zip_code',
        'zipcode': 'zip_code',
        'codigo_postal': 'zip_code',
        'zip': 'zip_code'
      };

      const headerIndices = {};
      header.forEach((col, index) => {
        const mappedCol = columnMap[col];
        if (mappedCol) {
          headerIndices[mappedCol] = index;
        }
      });

      if (headerIndices.name === undefined) {
        return res.status(400).json({ error: 'Name column is required in the file' });
      }

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0) continue;

        const client = {
          name: values[headerIndices.name]?.trim() || '',
          last_name: values[headerIndices.last_name]?.trim() || null,
          company_name: values[headerIndices.company_name]?.trim() || null,
          email: values[headerIndices.email]?.trim() || null,
          phone: values[headerIndices.phone]?.trim() || null,
          address: values[headerIndices.address]?.trim() || null,
          city: values[headerIndices.city]?.trim() || null,
          state: values[headerIndices.state]?.trim() || null,
          zip_code: values[headerIndices.zip_code]?.trim() || null
        };

        if (client.name) {
          clients.push(client);
        }
      }
    } else {
      // Parse Excel file
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.worksheets[0];

      if (!worksheet || worksheet.rowCount < 2) {
        return res.status(400).json({ error: 'File is empty or has no data rows' });
      }

      // Get header row
      const headerRow = worksheet.getRow(1);
      const header = [];
      headerRow.eachCell((cell, colNumber) => {
        header[colNumber] = String(cell.value || '').toLowerCase().trim();
      });

      // Map column names
      const columnMap = {
        'name': 'name',
        'nombre': 'name',
        'first_name': 'name',
        'last_name': 'last_name',
        'apellido': 'last_name',
        'company': 'company_name',
        'company_name': 'company_name',
        'empresa': 'company_name',
        'email': 'email',
        'correo': 'email',
        'phone': 'phone',
        'telefono': 'phone',
        'teléfono': 'phone',
        'address': 'address',
        'direccion': 'address',
        'dirección': 'address',
        'city': 'city',
        'ciudad': 'city',
        'state': 'state',
        'estado': 'state',
        'zip_code': 'zip_code',
        'zipcode': 'zip_code',
        'codigo_postal': 'zip_code',
        'zip': 'zip_code'
      };

      const headerIndices = {};
      header.forEach((col, index) => {
        const mappedCol = columnMap[col];
        if (mappedCol) {
          headerIndices[mappedCol] = index;
        }
      });

      if (headerIndices.name === undefined) {
        return res.status(400).json({ error: 'Name column is required in the file' });
      }

      // Parse data rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const getValue = (colIndex) => {
          const cell = row.getCell(colIndex);
          return cell.value ? String(cell.value).trim() : null;
        };

        const client = {
          name: getValue(headerIndices.name) || '',
          last_name: getValue(headerIndices.last_name),
          company_name: getValue(headerIndices.company_name),
          email: getValue(headerIndices.email),
          phone: getValue(headerIndices.phone),
          address: getValue(headerIndices.address),
          city: getValue(headerIndices.city),
          state: getValue(headerIndices.state),
          zip_code: getValue(headerIndices.zip_code)
        };

        if (client.name) {
          clients.push(client);
        }
      });
    }

    if (clients.length === 0) {
      return res.status(400).json({ error: 'No valid clients found in file' });
    }

    // Insert clients into database
    let imported = 0;
    const errors = [];

    for (const client of clients) {
      try {
        await query(
          `INSERT INTO clients (company_id, name, last_name, company_name, email, phone, address, city, state, zip_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [req.user.company_id, client.name, client.last_name, client.company_name, client.email, client.phone, client.address, client.city, client.state, client.zip_code]
        );
        imported++;
      } catch (err) {
        errors.push({ name: client.name, error: err.message });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      imported,
      total: clients.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    // Clean up file on error
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    next(error);
  }
});

// Helper function to parse CSV line handling quoted values
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.replace(/^["']|["']$/g, '').trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.replace(/^["']|["']$/g, '').trim());
  return values;
}

module.exports = router;
