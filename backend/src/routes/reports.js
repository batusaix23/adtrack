const express = require('express');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { query } = require('../config/database');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();

// Get service report data
router.get('/services', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { startDate, endDate, technicianId, poolId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Fechas de inicio y fin requeridas' });
    }

    let sql = `
      SELECT sr.*, p.name as pool_name, c.name as client_name,
             t.first_name || ' ' || t.last_name as technician_name,
             (SELECT SUM(cu.quantity * ch.cost_per_unit)
              FROM chemical_usage cu
              JOIN chemicals ch ON cu.chemical_id = ch.id
              WHERE cu.service_record_id = sr.id) as chemical_cost
       FROM service_records sr
       JOIN pools p ON sr.pool_id = p.id
       JOIN clients c ON c.id = p.client_id
       LEFT JOIN technicians t ON sr.technician_id = t.id
       WHERE sr.company_id = $1
         AND sr.scheduled_date BETWEEN $2 AND $3
         AND sr.status = 'completed'
    `;
    const params = [req.user.company_id, startDate, endDate];
    let paramIndex = 4;

    if (technicianId) {
      sql += ` AND sr.technician_id = $${paramIndex}`;
      params.push(technicianId);
      paramIndex++;
    }

    if (poolId) {
      sql += ` AND sr.pool_id = $${paramIndex}`;
      params.push(poolId);
    }

    sql += ` ORDER BY sr.scheduled_date, sr.scheduled_time`;

    const result = await query(sql, params);

    // Summary statistics
    const summary = {
      totalServices: result.rows.length,
      totalChemicalCost: result.rows.reduce((sum, r) => sum + (parseFloat(r.chemical_cost) || 0), 0),
      averageDuration: result.rows.reduce((sum, r) => sum + (r.duration_minutes || 0), 0) / result.rows.length || 0
    };

    res.json({ services: result.rows, summary });
  } catch (error) {
    next(error);
  }
});

// Export services to PDF
router.get('/services/pdf', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Fechas requeridas' });
    }

    const result = await query(
      `SELECT sr.scheduled_date, sr.duration_minutes, sr.ph_level, sr.chlorine_level,
              p.name as pool_name, c.name as client_name,
              t.first_name || ' ' || t.last_name as technician_name
       FROM service_records sr
       JOIN pools p ON sr.pool_id = p.id
       JOIN clients c ON c.id = p.client_id
       LEFT JOIN technicians t ON sr.technician_id = t.id
       WHERE sr.company_id = $1
         AND sr.scheduled_date BETWEEN $2 AND $3
         AND sr.status = 'completed'
       ORDER BY sr.scheduled_date`,
      [req.user.company_id, startDate, endDate]
    );

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=servicios-${startDate}-${endDate}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Reporte de Servicios', { align: 'center' });
    doc.fontSize(12).text(`Período: ${startDate} - ${endDate}`, { align: 'center' });
    doc.moveDown(2);

    // Table headers
    const tableTop = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Fecha', 50, tableTop);
    doc.text('Cliente', 120, tableTop);
    doc.text('Piscina', 220, tableTop);
    doc.text('Técnico', 320, tableTop);
    doc.text('pH', 420, tableTop);
    doc.text('Cloro', 460, tableTop);
    doc.text('Duración', 510, tableTop);

    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

    // Table rows
    doc.font('Helvetica');
    let y = tableTop + 25;

    result.rows.forEach((row, index) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      const date = new Date(row.scheduled_date).toLocaleDateString('es-ES');
      doc.text(date, 50, y);
      doc.text(row.client_name?.substring(0, 15) || '', 120, y);
      doc.text(row.pool_name?.substring(0, 15) || '', 220, y);
      doc.text(row.technician_name?.substring(0, 12) || '', 320, y);
      doc.text(row.ph_level?.toFixed(1) || '-', 420, y);
      doc.text(row.chlorine_level?.toFixed(1) || '-', 460, y);
      doc.text(row.duration_minutes ? `${row.duration_minutes}m` : '-', 510, y);

      y += 20;
    });

    // Summary
    doc.moveDown(2);
    doc.font('Helvetica-Bold');
    doc.text(`Total de servicios: ${result.rows.length}`, 50);

    doc.end();
  } catch (error) {
    next(error);
  }
});

// Export services to Excel
router.get('/services/excel', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Fechas requeridas' });
    }

    const result = await query(
      `SELECT sr.scheduled_date, sr.arrival_time, sr.departure_time, sr.duration_minutes,
              sr.ph_level, sr.chlorine_level, sr.alkalinity, sr.notes,
              p.name as pool_name, c.name as client_name,
              t.first_name || ' ' || t.last_name as technician_name
       FROM service_records sr
       JOIN pools p ON sr.pool_id = p.id
       JOIN clients c ON c.id = p.client_id
       LEFT JOIN technicians t ON sr.technician_id = t.id
       WHERE sr.company_id = $1
         AND sr.scheduled_date BETWEEN $2 AND $3
         AND sr.status = 'completed'
       ORDER BY sr.scheduled_date`,
      [req.user.company_id, startDate, endDate]
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Servicios');

    worksheet.columns = [
      { header: 'Fecha', key: 'date', width: 12 },
      { header: 'Cliente', key: 'client', width: 20 },
      { header: 'Piscina', key: 'pool', width: 20 },
      { header: 'Técnico', key: 'technician', width: 20 },
      { header: 'pH', key: 'ph', width: 8 },
      { header: 'Cloro', key: 'chlorine', width: 8 },
      { header: 'Alcalinidad', key: 'alkalinity', width: 12 },
      { header: 'Duración (min)', key: 'duration', width: 15 },
      { header: 'Notas', key: 'notes', width: 30 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0EA5E9' }
    };

    result.rows.forEach(row => {
      worksheet.addRow({
        date: new Date(row.scheduled_date).toLocaleDateString('es-ES'),
        client: row.client_name,
        pool: row.pool_name,
        technician: row.technician_name,
        ph: row.ph_level,
        chlorine: row.chlorine_level,
        alkalinity: row.alkalinity,
        duration: row.duration_minutes,
        notes: row.notes
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=servicios-${startDate}-${endDate}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

// Chemical consumption report
router.get('/chemicals', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Fechas requeridas' });
    }

    const result = await query(
      `SELECT ch.name, ch.unit, ch.category,
              SUM(cu.quantity) as total_quantity,
              SUM(cu.quantity * ch.cost_per_unit) as total_cost,
              COUNT(DISTINCT sr.id) as services_used
       FROM chemical_usage cu
       JOIN chemicals ch ON cu.chemical_id = ch.id
       JOIN service_records sr ON cu.service_record_id = sr.id
       WHERE sr.company_id = $1
         AND sr.scheduled_date BETWEEN $2 AND $3
         AND sr.status = 'completed'
       GROUP BY ch.id, ch.name, ch.unit, ch.category
       ORDER BY total_cost DESC`,
      [req.user.company_id, startDate, endDate]
    );

    const totalCost = result.rows.reduce((sum, r) => sum + parseFloat(r.total_cost || 0), 0);

    res.json({ chemicals: result.rows, totalCost });
  } catch (error) {
    next(error);
  }
});

// Client service history report
router.get('/client/:clientId', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let sql = `
      SELECT sr.*, p.name as pool_name,
             t.first_name || ' ' || t.last_name as technician_name,
             json_agg(json_build_object(
               'name', ch.name,
               'quantity', cu.quantity,
               'unit', ch.unit
             )) FILTER (WHERE cu.id IS NOT NULL) as chemicals
       FROM service_records sr
       JOIN pools p ON sr.pool_id = p.id
       LEFT JOIN technicians t ON sr.technician_id = t.id
       LEFT JOIN chemical_usage cu ON cu.service_record_id = sr.id
       LEFT JOIN chemicals ch ON cu.chemical_id = ch.id
       WHERE p.client_id = $1 AND sr.company_id = $2 AND sr.status = 'completed'
    `;
    const params = [req.params.clientId, req.user.company_id];

    if (startDate && endDate) {
      sql += ` AND sr.scheduled_date BETWEEN $3 AND $4`;
      params.push(startDate, endDate);
    }

    sql += ` GROUP BY sr.id, p.name, t.first_name, t.last_name ORDER BY sr.scheduled_date DESC`;

    const result = await query(sql, params);
    res.json({ services: result.rows });
  } catch (error) {
    next(error);
  }
});

// Technician performance report
router.get('/technicians', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Fechas requeridas' });
    }

    const result = await query(
      `SELECT u.id, u.first_name, u.last_name,
              COUNT(sr.id) as total_services,
              COUNT(sr.id) FILTER (WHERE sr.status = 'completed') as completed,
              COUNT(sr.id) FILTER (WHERE sr.status = 'cancelled') as cancelled,
              AVG(sr.duration_minutes) as avg_duration,
              SUM(EXTRACT(EPOCH FROM (sr.departure_time - sr.arrival_time))/3600) as total_hours
       FROM users u
       LEFT JOIN service_records sr ON sr.technician_id = u.id
         AND sr.scheduled_date BETWEEN $2 AND $3
       WHERE u.company_id = $1 AND u.role = 'technician'
       GROUP BY u.id
       ORDER BY completed DESC`,
      [req.user.company_id, startDate, endDate]
    );

    res.json({ technicians: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
