/*
 * Role definitions.  The ordering defined here implies a hierarchy
 * where later roles include all privileges of earlier roles.  The
 * `compareRoles` helper returns true if a role meets or exceeds a
 * required level.
 */

const Roles = {
  SUPPORT: 'SUPPORT',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
};

const hierarchy = [Roles.SUPPORT, Roles.MODERATOR, Roles.ADMIN, Roles.OWNER];

function compareRoles(userRole, requiredRole) {
  const userIdx = hierarchy.indexOf(userRole);
  const requiredIdx = hierarchy.indexOf(requiredRole);
  return userIdx >= requiredIdx;
}

module.exports = {
  Roles,
  compareRoles,
  hierarchy,
};