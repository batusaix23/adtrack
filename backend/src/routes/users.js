const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, email, first_name, last_name, phone, role, is_active, last_login_at, created_at
       FROM users
       WHERE company_id = $1
       ORDER BY created_at DESC`,
      [req.user.company_id]
    );

    res.json({ users: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get('/:id', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, email, first_name, last_name, phone, role, is_active, last_login_at, created_at
       FROM users
       WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Create user
router.post('/', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }

    // Only owner can create admins
    if (role === 'admin' && req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Solo el propietario puede crear administradores' });
    }

    // Cannot create owners
    if (role === 'owner') {
      return res.status(403).json({ error: 'No se pueden crear usuarios propietarios' });
    }

    // Check if email exists in company
    const existing = await query(
      'SELECT id FROM users WHERE email = $1 AND company_id = $2',
      [email, req.user.company_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (company_id, email, password_hash, first_name, last_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, first_name, last_name, phone, role, is_active, created_at`,
      [req.user.company_id, email, passwordHash, firstName, lastName, phone, role]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/:id', authenticate, authorizeRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const { firstName, lastName, phone, role, isActive } = req.body;

    // Check user exists and belongs to company
    const existing = await query(
      'SELECT id, role FROM users WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Cannot modify owner
    if (existing.rows[0].role === 'owner') {
      return res.status(403).json({ error: 'No se puede modificar al propietario' });
    }

    // Only owner can change roles
    if (role && req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Solo el propietario puede cambiar roles' });
    }

    const result = await query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           role = COALESCE($4, role),
           is_active = COALESCE($5, is_active)
       WHERE id = $6 AND company_id = $7
       RETURNING id, email, first_name, last_name, phone, role, is_active`,
      [firstName, lastName, phone, role, isActive, req.params.id, req.user.company_id]
    );

    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete('/:id', authenticate, authorizeRoles('owner'), async (req, res, next) => {
  try {
    // Check user exists and is not owner
    const existing = await query(
      'SELECT id, role FROM users WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (existing.rows[0].role === 'owner') {
      return res.status(403).json({ error: 'No se puede eliminar al propietario' });
    }

    await query('DELETE FROM users WHERE id = $1', [req.params.id]);

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
});

// Get technicians (for assignment dropdowns)
router.get('/list/technicians', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, first_name, last_name, email
       FROM users
       WHERE company_id = $1 AND role = 'technician' AND is_active = true
       ORDER BY first_name, last_name`,
      [req.user.company_id]
    );

    res.json({ technicians: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
