'use strict';

const { ForbiddenError } = require('./errors.js');

const createPermissionChecker = (db) => {
  // Cache permissions per role (loaded once, invalidated on role change)
  let permissionCache = null;

  const loadPermissions = async () => {
    if (permissionCache) return permissionCache;
    const result = await db.query(
      `SELECT r."name" AS role, p."resource", p."action"
       FROM "Permission" p
       JOIN "Role" r ON r."roleId" = p."roleId"`,
    );
    const map = new Map();
    for (const row of result.rows) {
      if (!map.has(row.role)) map.set(row.role, []);
      map.get(row.role).push({ resource: row.resource, action: row.action });
    }
    permissionCache = map;
    return map;
  };

  const invalidateCache = () => {
    permissionCache = null;
  };

  const checkPermission = async (user, resource, action) => {
    if (!user || !user.roles || user.roles.length === 0) {
      throw new ForbiddenError('No roles assigned');
    }

    const permissions = await loadPermissions();

    for (const roleName of user.roles) {
      const rolePerms = permissions.get(roleName);
      if (!rolePerms) continue;

      for (const perm of rolePerms) {
        if (perm.resource !== resource) continue;
        // 'manage' is wildcard — grants all CRUD actions
        if (perm.action === 'manage') return true;
        if (perm.action === action) return true;
      }
    }

    throw new ForbiddenError(
      `Missing permission: ${resource}:${action}`,
    );
  };

  const hasPermission = async (user, resource, action) => {
    try {
      await checkPermission(user, resource, action);
      return true;
    } catch {
      return false;
    }
  };

  return { checkPermission, hasPermission, invalidateCache };
};

module.exports = createPermissionChecker;
