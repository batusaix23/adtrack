require('dotenv').config();

// Check required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error('ERROR: Missing required environment variables:', missingVars.join(', '));
  console.error('Please set these variables in your Railway dashboard or .env file');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { pool, testConnection } = require('./config/database');
const logger = require('./config/logger');
const { runMigrations } = require('./config/migrations');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const clientRoutes = require('./routes/clients');
const poolRoutes = require('./routes/pools');
const serviceRoutes = require('./routes/services');
const chemicalRoutes = require('./routes/chemicals');
const inventoryRoutes = require('./routes/inventory');
const alertRoutes = require('./routes/alerts');
const reportRoutes = require('./routes/reports');
const analyticsRoutes = require('./routes/analytics');
const reminderRoutes = require('./routes/reminders');
const pushRoutes = require('./routes/push');
const companyRoutes = require('./routes/company');
const clientRatesRoutes = require('./routes/clientRates');
const clientEquipmentRoutes = require('./routes/clientEquipment');
const routesRoutes = require('./routes/routes');
const portalRoutes = require('./routes/portal');
const invoiceRoutes = require('./routes/invoices');
const platformRoutes = require('./routes/platform');
const serviceItemsRoutes = require('./routes/serviceItems');

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Security middleware - disabled temporarily for CORS debugging
// app.use(helmet({
//   crossOriginResourcePolicy: { policy: 'cross-origin' }
// }));

// Rate limiting - increased for production use
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  message: { error: 'Demasiadas solicitudes, intenta de nuevo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 min
  message: { error: 'Demasiados intentos de inicio de sesión.' }
});
app.use('/api/auth/login', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check - responds immediately, doesn't depend on database
let dbConnected = false;
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: dbConnected ? 'connected' : 'connecting',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/pools', poolRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/chemicals', chemicalRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/client-rates', clientRatesRoutes);
app.use('/api/client-equipment', clientEquipmentRoutes);
app.use('/api/routes', routesRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/service-items', serviceItemsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  // Start listening FIRST so health check works
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Then connect to database
  try {
    await testConnection();
    dbConnected = true;
    logger.info('Database connection established');

    // Run migrations
    await runMigrations();
    logger.info('Migrations completed');
  } catch (error) {
    logger.error('Database connection failed:', error);
    // Don't exit - let the health check still respond
    // The API routes will fail but at least the server is running
  }
}

startServer();

module.exports = app;
