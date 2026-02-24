const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * Middleware to authenticate technician portal requests
 * Validates JWT token and ensures user is a technician
 */
const authenticateTechnician = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No autorizado',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Sesión expirada',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        error: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }

    // Must be technician type
    if (decoded.type !== 'technician') {
      return res.status(403).json({
        error: 'Acceso denegado',
        code: 'NOT_TECHNICIAN'
      });
    }

    // Verify technician still exists and is active
    const result = await query(
      `SELECT t.*, c.company_name, c.settings as company_settings
       FROM technicians t
       JOIN companies c ON t.company_id = c.id
       WHERE t.id = $1 AND t.company_id = $2 AND t.is_active = true AND c.is_active = true`,
      [decoded.userId, decoded.companyId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Técnico no encontrado o inactivo',
        code: 'TECHNICIAN_INACTIVE'
      });
    }

    const technician = result.rows[0];

    // Attach technician info to request
    req.technician = {
      id: technician.id,
      companyId: technician.company_id,
      firstName: technician.first_name,
      lastName: technician.last_name,
      email: technician.email,
      phone: technician.phone,
      companyName: technician.company_name,
      companySettings: technician.company_settings
    };

    // Also set user for compatibility with other middlewares
    req.user = {
      id: technician.id,
      company_id: technician.company_id,
      companyId: technician.company_id,
      role: 'technician',
      type: 'technician'
    };

    next();
  } catch (error) {
    console.error('Technician auth error:', error);
    res.status(500).json({
      error: 'Error de autenticación',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Rate limiter specifically for technician portal
 */
const technicianRateLimit = (maxRequests = 100, windowMs = 60000) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.technician?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get request timestamps for this key
    let timestamps = requests.get(key) || [];

    // Filter to only include timestamps within the window
    timestamps = timestamps.filter(t => t > windowStart);

    if (timestamps.length >= maxRequests) {
      return res.status(429).json({
        error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
        code: 'RATE_LIMITED'
      });
    }

    timestamps.push(now);
    requests.set(key, timestamps);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      for (const [k, v] of requests.entries()) {
        if (v.every(t => t < windowStart)) {
          requests.delete(k);
        }
      }
    }

    next();
  };
};

module.exports = {
  authenticateTechnician,
  technicianRateLimit
};
