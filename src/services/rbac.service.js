// services/rbac.service.js
import { ROLE_PERMISSIONS, ROLE_HIERARCHY } from "../config/roles.config.js";

/**
 * RbacService — Core RBAC business logic.
 *
 * Pattern: Service Layer (design doc)
 * Resolves a user's EFFECTIVE permissions by combining:
 *   1. Base permissions from all their assigned roles (roles.config.js)
 *   2. Dynamically granted extras    (PermissionOverride.granted)
 *   3. Minus explicitly revoked ones (PermissionOverride.revoked)
 *
 * Injected by Awilix. Never instantiated manually.
 */
export class RbacService {
  /**
   * @param {{ roleRepository: import('../repositories/role.repository.js').RoleRepository }} deps
   */
  constructor({ roleRepository }) {
    this.roleRepository = roleRepository;
  }

  /**
   * Resolve the complete effective permission set for a user.
   *
   * @param {string}   userId
   * @param {string[]} roles   — from user.roles in the session/token
   * @returns {Promise<Set<string>>}
   */
  async resolvePermissions(userId, roles = []) {
    // 1. Union of all base permissions across every assigned role
    const effective = new Set(
      roles.flatMap(role => ROLE_PERMISSIONS[role] ?? [])
    );

    // 2. Pull any dynamic overrides from DB
    const overrides = await this.roleRepository.getOverridesForUser(userId);
    if (!overrides) return effective;

    // 3. Apply grants on top
    for (const perm of overrides.granted) {
      effective.add(perm);
    }

    // 4. Strip revocations
    for (const perm of overrides.revoked) {
      effective.delete(perm);
    }

    return effective;
  }

  /**
   * Returns true if the user holds ALL of the required permissions.
   *
   * @param {string}   userId
   * @param {string[]} roles
   * @param {string[]} requiredPermissions
   * @returns {Promise<boolean>}
   */
  async hasPermissions(userId, roles, requiredPermissions = []) {
    if (requiredPermissions.length === 0) return true;
    const effective = await this.resolvePermissions(userId, roles);
    return requiredPermissions.every(p => effective.has(p));
  }

  /**
   * Returns true if the user has AT LEAST ONE of the listed roles.
   * Synchronous — no DB call needed, roles come from session.
   *
   * @param {string[]} userRoles
   * @param {string[]} requiredRoles
   * @returns {boolean}
   */
  hasRole(userRoles = [], requiredRoles = []) {
    return requiredRoles.some(r => userRoles.includes(r));
  }

  /**
   * Returns true if the user's highest role meets a minimum hierarchy level.
   * e.g. requireMinLevel("business") passes for business AND admin.
   *
   * @param {string[]} userRoles
   * @param {string}   minimumRole
   * @returns {boolean}
   */
  meetsMinimumLevel(userRoles = [], minimumRole) {
    const required = ROLE_HIERARCHY[minimumRole] ?? 0;
    const highest = Math.max(...userRoles.map(r => ROLE_HIERARCHY[r] ?? 0));
    return highest >= required;
  }
}