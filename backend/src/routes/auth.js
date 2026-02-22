const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

// Generate tokens
function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
}

// Register company and owner
router.post('/register', async (req, res, next) => {
  try {
    const { companyName, email, password, firstName, lastName, phone } = req.body;

    // Validate required fields
    if (!companyName || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Check if email exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    // Create slug from company name
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug exists
    const existingCompany = await query('SELECT id FROM companies WHERE slug = $1', [slug]);
    if (existingCompany.rows.length > 0) {
      return res.status(409).json({ error: 'Una empresa con ese nombre ya existe' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create company
    const companyResult = await query(
      `INSERT INTO companies (name, slug, email, phone)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [companyName, slug, email, phone]
    );
    const companyId = companyResult.rows[0].id;

    // Create owner user
    const userResult = await query(
      `INSERT INTO users (company_id, email, password_hash, first_name, last_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6, 'owner') RETURNING id`,
      [companyId, email, passwordHash, firstName, lastName, phone]
    );
    const userId = userResult.rows[0].id;

    // Generate tokens
    const tokens = generateTokens(userId);

    // Save refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokens.refreshToken, expiresAt]
    );

    res.status(201).json({
      message: 'Empresa registrada exitosamente',
      user: {
        id: userId,
        email,
        firstName,
        lastName,
        role: 'owner',
        companyId,
        companyName
      },
      ...tokens
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    // Get user
    const result = await query(
      `SELECT u.id, u.company_id, u.email, u.password_hash, u.first_name,
              u.last_name, u.role, u.is_active, c.name as company_name, c.is_active as company_active
       FROM users u
       JOIN companies c ON c.id = u.company_id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    if (!user.is_active || !user.company_active) {
      return res.status(401).json({ error: 'Cuenta desactivada' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generate tokens
    const tokens = generateTokens(user.id);

    // Save refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokens.refreshToken, expiresAt]
    );

    // Update last login
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        companyId: user.company_id,
        companyName: user.company_name
      },
      ...tokens
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check if token exists in database
    const tokenResult = await query(
      `SELECT rt.*, u.is_active, c.is_active as company_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       JOIN companies c ON c.id = u.company_id
       WHERE rt.token = $1 AND rt.expires_at > NOW()`,
      [refreshToken]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const tokenData = tokenResult.rows[0];

    if (!tokenData.is_active || !tokenData.company_active) {
      return res.status(401).json({ error: 'Cuenta desactivada' });
    }

    // Delete old refresh token
    await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);

    // Generate new tokens
    const tokens = generateTokens(decoded.userId);

    // Save new refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [decoded.userId, tokens.refreshToken, expiresAt]
    );

    res.json(tokens);
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    next(error);
  }
});

// Logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }

    res.json({ message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.first_name,
      lastName: req.user.last_name,
      role: req.user.role,
      companyId: req.user.company_id,
      companyName: req.user.company_name
    }
  });
});

// Forgot password - request reset
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email requerido' });
    }

    // Check if user exists
    const userResult = await query(
      'SELECT id, email, first_name FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    // Always return success to prevent email enumeration
    if (userResult.rows.length === 0) {
      return res.json({ message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' });
    }

    const user = userResult.rows[0];

    // Generate reset token
    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing reset tokens for this user
    await query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);

    // Save reset token
    await query(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, resetToken, expiresAt]
    );

    // TODO: Send email with reset link
    // For now, log the token (in production, remove this and send email)
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({
      message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña',
      // Remove this in production - only for testing
      ...(process.env.NODE_ENV !== 'production' && { resetToken })
    });
  } catch (error) {
    next(error);
  }
});

// Reset password with token
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token y nueva contraseña requeridos' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    // Find valid reset token
    const tokenResult = await query(
      `SELECT pr.*, u.email
       FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.token = $1 AND pr.expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const resetData = tokenResult.rows[0];

    // Update password
    const newHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, resetData.user_id]);

    // Delete used token
    await query('DELETE FROM password_resets WHERE token = $1', [token]);

    // Invalidate all refresh tokens for this user
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [resetData.user_id]);

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    next(error);
  }
});

// Change password
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseñas requeridas' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    // Get current password hash
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    // Update password
    const newHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    // Invalidate all refresh tokens
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
