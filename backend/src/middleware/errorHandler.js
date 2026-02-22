const logger = require('../config/logger');

function errorHandler(err, req, res, next) {
  logger.error(err.stack);

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      details: err.details || err.message
    });
  }

  // Database errors
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'El registro ya existe'
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Referencia a registro inexistente'
    });
  }

  // Custom application errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  // Default error
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message
  });
}

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

module.exports = errorHandler;
module.exports.AppError = AppError;
