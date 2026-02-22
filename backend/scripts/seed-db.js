require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function seedDatabase() {
  console.log('🌱 Seeding database with sample data...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const companyId = 'a0000000-0000-0000-0000-000000000001';

    // Additional clients
    const clients = [
      { name: 'Hotel Playa Azul', email: 'reservas@playaazul.com', phone: '555-0201', address: '456 Beach Blvd', city: 'Miami Beach', state: 'FL' },
      { name: 'Condominio Las Palmas', email: 'admin@laspalmas.com', phone: '555-0202', address: '789 Palm Drive', city: 'Coral Gables', state: 'FL' },
      { name: 'Club Deportivo Elite', email: 'gerencia@clubelite.com', phone: '555-0203', address: '321 Sports Ave', city: 'Doral', state: 'FL' },
      { name: 'Familia Rodríguez', email: 'rodriguez@email.com', phone: '555-0204', address: '654 Oak Lane', city: 'Kendall', state: 'FL' },
      { name: 'Familia Martinez', email: 'martinez@email.com', phone: '555-0205', address: '987 Maple Street', city: 'Homestead', state: 'FL' }
    ];

    for (const c of clients) {
      await client.query(
        `INSERT INTO clients (company_id, name, email, phone, address, city, state, zip_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, '33101')
         ON CONFLICT DO NOTHING`,
        [companyId, c.name, c.email, c.phone, c.address, c.city, c.state]
      );
    }
    console.log('✅ Clients created');

    // Get client IDs
    const clientsResult = await client.query(
      'SELECT id, name FROM clients WHERE company_id = $1',
      [companyId]
    );

    // Create pools for each client
    const serviceDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    let dayIndex = 0;

    for (const cl of clientsResult.rows) {
      const poolCount = cl.name.includes('Hotel') ? 2 : 1;

      for (let i = 0; i < poolCount; i++) {
        const poolName = poolCount > 1 ? `Piscina ${i + 1}` : 'Piscina Principal';
        await client.query(
          `INSERT INTO pools (client_id, company_id, name, pool_type, volume_gallons, service_day, monthly_rate)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [
            cl.id,
            companyId,
            poolName,
            cl.name.includes('Hotel') || cl.name.includes('Club') ? 'commercial' : 'residential',
            cl.name.includes('commercial') ? 30000 : 15000,
            serviceDays[dayIndex % serviceDays.length],
            cl.name.includes('Hotel') ? 300 : 150
          ]
        );
        dayIndex++;
      }
    }
    console.log('✅ Pools created');

    // Create additional technician
    const techPassword = await bcrypt.hash('Tech123!', 12);
    await client.query(
      `INSERT INTO users (company_id, email, password_hash, first_name, last_name, role)
       VALUES ($1, 'juan@demo.com', $2, 'Juan', 'Pérez', 'technician')
       ON CONFLICT DO NOTHING`,
      [companyId, techPassword]
    );
    console.log('✅ Additional technician created');

    // Create inventory records for chemicals
    const chemicals = await client.query(
      'SELECT id FROM chemicals WHERE company_id = $1',
      [companyId]
    );

    for (const chem of chemicals.rows) {
      await client.query(
        `INSERT INTO inventory (company_id, chemical_id, quantity, min_stock_level)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (company_id, chemical_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
        [companyId, chem.id, Math.floor(Math.random() * 50) + 10, 5]
      );
    }
    console.log('✅ Inventory initialized');

    // Create some service records
    const pools = await client.query(
      'SELECT id FROM pools WHERE company_id = $1',
      [companyId]
    );

    const technicians = await client.query(
      `SELECT id FROM users WHERE company_id = $1 AND role = 'technician'`,
      [companyId]
    );

    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const serviceDate = new Date(today);
      serviceDate.setDate(serviceDate.getDate() - i);

      const poolIndex = i % pools.rows.length;
      const techIndex = i % technicians.rows.length;

      await client.query(
        `INSERT INTO service_records (
          company_id, pool_id, technician_id, scheduled_date, status,
          ph_level, chlorine_level, alkalinity,
          skimmed_surface, brushed_walls, vacuumed_pool, cleaned_skimmer,
          arrival_time, departure_time, duration_minutes
        ) VALUES ($1, $2, $3, $4, 'completed', $5, $6, $7, true, true, true, true, $8, $9, $10)
        ON CONFLICT DO NOTHING`,
        [
          companyId,
          pools.rows[poolIndex].id,
          technicians.rows[techIndex].id,
          serviceDate.toISOString().split('T')[0],
          7.2 + Math.random() * 0.4,
          2.0 + Math.random() * 1.5,
          80 + Math.random() * 40,
          new Date(serviceDate.setHours(9, 0, 0)),
          new Date(serviceDate.setHours(9, 45, 0)),
          45
        ]
      );
    }
    console.log('✅ Service records created');

    // Create some alerts
    await client.query(
      `INSERT INTO alerts (company_id, pool_id, type, title, message, priority)
       VALUES
         ($1, $2, 'water_quality', 'pH Alto Detectado', 'El nivel de pH está por encima del rango recomendado', 'high'),
         ($1, $3, 'equipment', 'Mantenimiento de Bomba', 'La bomba requiere inspección programada', 'medium')
       ON CONFLICT DO NOTHING`,
      [companyId, pools.rows[0].id, pools.rows[1]?.id || pools.rows[0].id]
    );
    console.log('✅ Sample alerts created');

    // Create reminders
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await client.query(
      `INSERT INTO reminders (company_id, pool_id, title, description, due_date)
       VALUES
         ($1, $2, 'Inspección de filtro', 'Revisar y limpiar el filtro de arena', $3),
         ($1, $4, 'Cambio de sal', 'Agregar sal al sistema de cloración', $3)
       ON CONFLICT DO NOTHING`,
      [companyId, pools.rows[0].id, tomorrow, pools.rows[1]?.id || pools.rows[0].id]
    );
    console.log('✅ Sample reminders created');

    await client.query('COMMIT');

    console.log('');
    console.log('🎉 Database seeding complete!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase().catch(console.error);
