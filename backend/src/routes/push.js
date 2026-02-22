const express = require('express');
const webpush = require('web-push');
const { query } = require('../config/database');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@aguadulcetrack.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Get VAPID public key
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Subscribe to push notifications
router.post('/subscribe', authenticate, async (req, res, next) => {
  try {
    const { subscription, deviceInfo } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Suscripción inválida' });
    }

    // Check if subscription exists
    const existing = await query(
      'SELECT id FROM push_subscriptions WHERE endpoint = $1',
      [subscription.endpoint]
    );

    if (existing.rows.length > 0) {
      // Update existing subscription
      await query(
        `UPDATE push_subscriptions
         SET user_id = $1, keys = $2, device_info = $3, is_active = true
         WHERE endpoint = $4`,
        [req.user.id, subscription.keys, deviceInfo, subscription.endpoint]
      );
    } else {
      // Create new subscription
      await query(
        `INSERT INTO push_subscriptions (user_id, endpoint, keys, device_info)
         VALUES ($1, $2, $3, $4)`,
        [req.user.id, subscription.endpoint, subscription.keys, deviceInfo]
      );
    }

    res.json({ message: 'Suscripción registrada exitosamente' });
  } catch (error) {
    next(error);
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticate, async (req, res, next) => {
  try {
    const { endpoint } = req.body;

    await query(
      'UPDATE push_subscriptions SET is_active = false WHERE endpoint = $1 AND user_id = $2',
      [endpoint, req.user.id]
    );

    res.json({ message: 'Suscripción cancelada' });
  } catch (error) {
    next(error);
  }
});

// Send notification to user
router.post('/send', authenticate, async (req, res, next) => {
  try {
    const { userId, title, body, data, icon } = req.body;

    // Only admins can send to others
    if (userId !== req.user.id && req.user.role === 'technician') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const subscriptions = await query(
      `SELECT endpoint, keys FROM push_subscriptions
       WHERE user_id = $1 AND is_active = true`,
      [userId || req.user.id]
    );

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        ...data,
        timestamp: new Date().toISOString()
      }
    });

    const results = await Promise.allSettled(
      subscriptions.rows.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        )
      )
    );

    // Remove failed subscriptions
    const failed = results
      .map((r, i) => r.status === 'rejected' ? subscriptions.rows[i].endpoint : null)
      .filter(Boolean);

    if (failed.length > 0) {
      await query(
        'UPDATE push_subscriptions SET is_active = false WHERE endpoint = ANY($1)',
        [failed]
      );
    }

    const sent = results.filter(r => r.status === 'fulfilled').length;
    res.json({ sent, failed: failed.length });
  } catch (error) {
    next(error);
  }
});

// Send notification to all technicians
router.post('/broadcast/technicians', authenticate, async (req, res, next) => {
  try {
    if (req.user.role === 'technician') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { title, body, data } = req.body;

    const subscriptions = await query(
      `SELECT ps.endpoint, ps.keys
       FROM push_subscriptions ps
       JOIN users u ON ps.user_id = u.id
       WHERE u.company_id = $1 AND u.role = 'technician' AND ps.is_active = true`,
      [req.user.company_id]
    );

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      data
    });

    const results = await Promise.allSettled(
      subscriptions.rows.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        )
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    res.json({ sent, total: subscriptions.rows.length });
  } catch (error) {
    next(error);
  }
});

// Test notification
router.post('/test', authenticate, async (req, res, next) => {
  try {
    const subscriptions = await query(
      `SELECT endpoint, keys FROM push_subscriptions
       WHERE user_id = $1 AND is_active = true
       LIMIT 1`,
      [req.user.id]
    );

    if (subscriptions.rows.length === 0) {
      return res.status(400).json({ error: 'No hay suscripciones activas' });
    }

    const payload = JSON.stringify({
      title: 'Notificación de Prueba',
      body: 'Las notificaciones están funcionando correctamente.',
      icon: '/icons/icon-192x192.png'
    });

    await webpush.sendNotification(
      {
        endpoint: subscriptions.rows[0].endpoint,
        keys: subscriptions.rows[0].keys
      },
      payload
    );

    res.json({ message: 'Notificación de prueba enviada' });
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription expired
      return res.status(400).json({ error: 'Suscripción expirada, por favor vuelve a suscribirte' });
    }
    next(error);
  }
});

module.exports = router;
