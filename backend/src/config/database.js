const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

async function testConnection(retries = 5, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT NOW()');
        return true;
      } finally {
        client.release();
      }
    } catch (err) {
      console.log(`Database connection attempt ${i + 1}/${retries} failed:`, err.message);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
}

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
  }
  return res;
}

async function getClient() {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;

  // Set timeout for release
  const timeout = setTimeout(() => {
    console.error('Client has been out for more than 5 seconds!');
  }, 5000);

  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release.apply(client);
  };

  return client;
}

// Set tenant context for RLS
async function setTenantContext(client, companyId) {
  await client.query(`SET app.company_id = '${companyId}'`);
}

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  setTenantContext
};
