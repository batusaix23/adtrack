require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function initDatabase() {
  console.log('🚀 Initializing database...');

  // First connect without database to create it
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: 'postgres'
  });

  try {
    const dbName = process.env.DB_NAME || 'aguadulce_track';

    // Check if database exists
    const checkResult = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkResult.rows.length === 0) {
      console.log(`📦 Creating database: ${dbName}`);
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      console.log('✅ Database created');
    } else {
      console.log(`📦 Database ${dbName} already exists`);
    }

    await adminPool.end();

    // Now connect to the actual database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL ||
        `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${dbName}`
    });

    // Read and execute init.sql
    const initSqlPath = path.join(__dirname, '../../database/init.sql');

    if (fs.existsSync(initSqlPath)) {
      console.log('📄 Executing init.sql...');
      const initSql = fs.readFileSync(initSqlPath, 'utf8');
      await pool.query(initSql);
      console.log('✅ Schema created successfully');
    } else {
      console.log('⚠️  init.sql not found, skipping schema creation');
    }

    await pool.end();

    console.log('');
    console.log('🎉 Database initialization complete!');
    console.log('');
    console.log('Demo credentials:');
    console.log('  Admin: admin@demo.com / Admin123!');
    console.log('  Technician: tecnico@demo.com / Tech123!');

  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  }
}

initDatabase();
