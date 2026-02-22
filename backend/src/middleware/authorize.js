const PERMISSIONS = {
  owner: [
    'manage_company',
    'manage_users',
    'manage_clients',
    'manage_pools',
    'manage_services',
    'manage_inventory',
    'manage_chemicals',
    'view_analytics',
    'view_reports',
    'export_reports',
    'manage_alerts',
    'manage_reminders',
    'perform_service'
  ],
  admin: [
    'manage_users',
    'manage_clients',
    'manage_pools',
    'manage_services',
    'manage_inventory',
    'manage_chemicals',
    'view_analytics',
    'view_reports',
    'export_reports',
    'manage_alerts',
    'manage_reminders',
    'perform_service'
  ],
  technician: [
    'view_assigned_pools',
    'perform_service',
    'view_own_services',
    'view_alerts',
    'view_reminders'
  ]
};

function authorize(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const userPermissions = PERMISSIONS[req.user.role] || [];

    const hasPermission = requiredPermissions.some(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'No tienes permisos para realizar esta acción'
      });
    }

    next();
  };
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'No tienes permisos para realizar esta acción'
      });
    }

    next();
  };
}

module.exports = { authorize, authorizeRoles, PERMISSIONS };
