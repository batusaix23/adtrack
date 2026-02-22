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
      SELECT c.*,
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
    const { name, lastName, companyName, email, phone, address, city, state, zipCode, notes, billingEmail } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const result = await query(
      `INSERT INTO clients (company_id, name, last_name, company_name, email, phone, address, city, state, zip_code, notes, billing_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [req.user.company_id, name, lastName, companyName, email, phone, address, city, state, zipCode, notes, billingEmail]
    );

    res.status(201).json({ client: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update client
router.put('/:id', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { name, lastName, companyName, email, phone, address, city, state, zipCode, notes, billingEmail, isActive } = req.body;

    const result = await query(
      `UPDATE clients
       SET name = COALESCE($1, name),
           last_name = COALESCE($2, last_name),
           company_name = COALESCE($3, company_name),
           email = COALESCE($4, email),
           phone = COALESCE($5, phone),
           address = COALESCE($6, address),
           city = COALESCE($7, city),
           state = COALESCE($8, state),
           zip_code = COALESCE($9, zip_code),
           notes = COALESCE($10, notes),
           billing_email = COALESCE($11, billing_email),
           is_active = COALESCE($12, is_active)
       WHERE id = $13 AND company_id = $14
       RETURNING *`,
      [name, lastName, companyName, email, phone, address, city, state, zipCode, notes, billingEmail, isActive, req.params.id, req.user.company_id]
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
              u.first_name || ' ' || u.last_name as technician_name
       FROM service_records sr
       JOIN pools p ON sr.pool_id = p.id
       JOIN users u ON sr.technician_id = u.id
       WHERE p.client_id = $1 AND sr.company_id = $2
       ORDER BY sr.scheduled_date DESC, sr.scheduled_time DESC
       LIMIT $3 OFFSET $4`,
      [req.params.id, req.user.company_id, limit, offset]
    );

    res.json({ services: result.rows });
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
