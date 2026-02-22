const { setTenantContext, getClient } = require('../config/database');

async function withTenantContext(req, res, next) {
  if (!req.user || !req.user.company_id) {
    return next();
  }

  const client = await getClient();
  try {
    await setTenantContext(client, req.user.company_id);
    req.dbClient = client;
    next();
  } catch (error) {
    client.release();
    next(error);
  }
}

// Clean up client after request
function releaseTenantContext(req, res, next) {
  if (req.dbClient) {
    req.dbClient.release();
  }
  next();
}

module.exports = { withTenantContext, releaseTenantContext };
