/**
 * Script para generar datos de prueba
 * Ejecutar con: node scripts/seed-test-data.js
 */

require('dotenv').config();
const { query, pool } = require('../src/config/database');
const bcrypt = require('bcryptjs');

const randomPhone = () => `787-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`;

async function seedTestData() {
  try {
    console.log('🚀 Iniciando generación de datos de prueba...\n');

    const companyResult = await query('SELECT id FROM companies LIMIT 1');
    if (companyResult.rows.length === 0) {
      console.error('❌ No hay compañía registrada.');
      process.exit(1);
    }
    const companyId = companyResult.rows[0].id;
    console.log(`✅ Compañía: ${companyId}\n`);

    // 1. TÉCNICOS
    console.log('👷 Técnicos...');
    const technicians = [
      { firstName: 'Carlos', lastName: 'Rodríguez', email: 'carlos@test.com', phone: '787-555-0101', color: '#3B82F6' },
      { firstName: 'Miguel', lastName: 'Santos', email: 'miguel@test.com', phone: '787-555-0102', color: '#10B981' },
      { firstName: 'José', lastName: 'Martínez', email: 'jose@test.com', phone: '787-555-0103', color: '#F59E0B' }
    ];

    const technicianIds = [];
    for (const tech of technicians) {
      const existing = await query('SELECT id FROM technicians WHERE email = $1 AND company_id = $2', [tech.email, companyId]);
      if (existing.rows.length > 0) {
        technicianIds.push(existing.rows[0].id);
        console.log(`  ⏭️  ${tech.firstName} ya existe`);
      } else {
        const hash = await bcrypt.hash('tech123', 10);
        const result = await query(
          `INSERT INTO technicians (company_id, first_name, last_name, email, phone, color, portal_password_hash, portal_pin, hire_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, '1234', CURRENT_DATE) RETURNING id`,
          [companyId, tech.firstName, tech.lastName, tech.email, tech.phone, tech.color, hash]
        );
        technicianIds.push(result.rows[0].id);
        console.log(`  ✅ ${tech.firstName} ${tech.lastName} creado`);
      }
    }

    // 2. CLIENTES
    console.log('\n👥 Clientes...');
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const clientNames = [
      'Juan Pérez', 'María González', 'Roberto Silva', 'Carmen Díaz', 'Luis Torres',
      'Ana Martín', 'Pedro Ruiz', 'Sofia López', 'Diego Hernández', 'Elena Vargas',
      'Fernando Castro', 'Isabel Morales', 'Andrés Jiménez', 'Patricia Reyes', 'Ricardo Navarro',
      'Lucía Romero', 'Gabriel Flores', 'Marta Medina', 'Sergio Vega', 'Paula Ortiz',
      'Daniel Sánchez', 'Laura Ramos', 'Jorge Guerrero', 'Claudia Delgado', 'Raúl Núñez'
    ];
    const addresses = [
      'Calle Sol 123, San Juan', 'Ave. Ashford 456, Condado', 'Calle Luna 789, Isla Verde',
      'Ave. Roosevelt 321, Guaynabo', 'Calle Mar 654, Carolina', 'Ave. Ponce de León 987, Santurce',
      'Calle Palma 147, Bayamón', 'Ave. Condado 258, San Juan', 'Calle Brisa 369, Dorado',
      'Ave. Isla Verde 741, Carolina', 'Calle Coral 852, Fajardo', 'Ave. Baldorioty 963, San Juan',
      'Calle Arena 159, Aguadilla', 'Ave. Las Americas 357, Ponce', 'Calle Flamingo 486, Mayagüez',
      'Ave. Kennedy 624, Caguas', 'Calle Delfín 713, Humacao', 'Ave. Muñoz Rivera 892, San Juan',
      'Calle Pelícano 231, Guaynabo', 'Ave. Fernández Juncos 546, Santurce', 'Calle Gaviota 678, Carolina',
      'Ave. De Diego 894, San Juan', 'Calle Concha 312, Rincón', 'Ave. Piñero 543, Río Piedras', 'Calle Marina 765, Vega Baja'
    ];
    const costs = [125, 150, 175, 200, 250, 300, 350, 400];

    const clientIds = [];
    for (let i = 0; i < clientNames.length; i++) {
      const [firstName, lastName] = clientNames[i].split(' ');
      const dayIndex = Math.floor(i / 5);

      const existing = await query(
        'SELECT id FROM clients WHERE first_name = $1 AND last_name = $2 AND company_id = $3',
        [firstName, lastName, companyId]
      );

      if (existing.rows.length > 0) {
        clientIds.push(existing.rows[0].id);
        console.log(`  ⏭️  ${firstName} ${lastName}`);
        continue;
      }

      const result = await query(
        `INSERT INTO clients (
          company_id, name, first_name, last_name, display_name,
          email, phone, mobile, address, city, state, zip_code,
          service_frequency, service_day, service_days, preferred_time,
          monthly_service_cost, payment_terms, is_active
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
        [
          companyId, `${firstName} ${lastName}`, firstName, lastName, `${firstName} ${lastName}`,
          `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
          randomPhone(), randomPhone(), addresses[i], 'Puerto Rico', 'PR', `00${901 + i}`,
          '1x_week', daysOfWeek[dayIndex], JSON.stringify([daysOfWeek[dayIndex]]),
          i % 2 === 0 ? 'AM' : 'PM', costs[i % costs.length], 'net_30', true
        ]
      );
      clientIds.push(result.rows[0].id);
      console.log(`  ✅ ${firstName} ${lastName} (${daysOfWeek[dayIndex]})`);
    }

    // 3. FACTURAS (solo si la tabla existe completamente)
    console.log('\n🧾 Facturas...');
    try {
      const invoiceStatuses = ['paid', 'paid', 'paid', 'sent', 'sent', 'draft', 'overdue', 'partial', 'paid', 'sent'];
      let invoiceNum = 1;

      for (let i = 0; i < Math.min(10, clientIds.length); i++) {
        const existing = await query('SELECT id FROM invoices WHERE client_id = $1 LIMIT 1', [clientIds[i]]);
        if (existing.rows.length > 0) {
          console.log(`  ⏭️  Cliente ${i + 1} ya tiene factura`);
          continue;
        }

        const subtotal = costs[i % costs.length];
        const taxAmount = subtotal * 0.115;
        const total = subtotal + taxAmount;
        const status = invoiceStatuses[i];
        const amountPaid = status === 'paid' ? total : status === 'partial' ? total / 2 : 0;

        const issueDate = new Date();
        issueDate.setDate(issueDate.getDate() - (i * 3));
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + 30);

        await query(
          `INSERT INTO invoices (
            company_id, client_id, invoice_number, invoice_type,
            subtotal, tax_rate, tax_amount, total, amount_paid, balance_due,
            issue_date, due_date, status, notes
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [
            companyId, clientIds[i], `INV-${String(invoiceNum++).padStart(5, '0')}`, 'one_time',
            subtotal, 11.5, taxAmount, total, amountPaid, total - amountPaid,
            issueDate, dueDate, status, 'Mantenimiento mensual'
          ]
        );
        console.log(`  ✅ Factura INV-${String(invoiceNum - 1).padStart(5, '0')} (${status})`);
      }
    } catch (e) {
      console.log(`  ⚠️  Error en facturas: ${e.message}`);
    }

    // 4. RUTAS
    console.log('\n🗺️ Rutas...');
    try {
      for (let i = 0; i < clientIds.length; i++) {
        const dayOfWeek = daysOfWeek[Math.floor(i / 5)];
        const techId = technicianIds[i % 3];

        const existing = await query('SELECT id FROM route_schedules WHERE client_id = $1', [clientIds[i]]);
        if (existing.rows.length > 0) continue;

        await query(
          `INSERT INTO route_schedules (company_id, technician_id, client_id, day_of_week, route_order, is_active)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [companyId, techId, clientIds[i], dayOfWeek, i % 5]
        );
      }
      console.log('  ✅ Rutas creadas');
    } catch (e) {
      console.log(`  ⚠️  Error en rutas: ${e.message}`);
    }

    // RESUMEN
    console.log('\n═══════════════════════════════════════════════');
    console.log('           📊 DATOS CREADOS');
    console.log('═══════════════════════════════════════════════');
    console.log(`  👷 Técnicos:  3`);
    console.log(`  👥 Clientes:  ${clientIds.length} (5 por día Lun-Vie)`);
    console.log(`  🧾 Facturas:  10`);
    console.log(`  🗺️ Rutas:     ${clientIds.length}`);
    console.log('═══════════════════════════════════════════════\n');

    console.log('📝 Técnicos - Pin: 1234');
    console.log('   carlos@test.com, miguel@test.com, jose@test.com\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

seedTestData();
