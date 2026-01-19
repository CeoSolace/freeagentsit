const { Roles, compareRoles } = require('./roles');

/*
 * Middleware to require a minimum role for a route.  If the current
 * user does not meet the requirement, a 403 response is returned.
 */

function requireRole(requiredRole) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userRole = req.user.roles && req.user.roles[0];
    if (!userRole || !compareRoles(userRole, requiredRole)) {
      return res.status(403).json({ error: `Requires role ${requiredRole}` });
    }
    return next();
  };
}

module.exports = { requireRole, Roles };