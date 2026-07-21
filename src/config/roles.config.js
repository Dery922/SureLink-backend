// config/roles.config.js

/**
 * RBAC Role & Permission Definitions
 * Pattern: Role → [permissions]
 * Roles inherit from lower roles via the hierarchy map.
 * Permission pattern : "<resource>:<action>" OR  "<resource>:<action>:<scope>"
 * 
 * Scopes{own,all} own = user's own data only || all= any user's data
 */


export const ROLES = Object.freeze({
  CUSTOMER: "customer",
  PROVIDER: "provider",
  DRIVER: "driver",
  BUSINESS: "business",
  ADMIN: "admin",
});

/**
 * Higher number = higher privilege.
 */
export const ROLE_HIERARCHY = Object.freeze({
  customer: 10,
  driver: 20,
  provider: 20,
  business: 30,
  admin: 100,
});

/**
 * Explicit permission sets per role.
 * A user with multiple roles gets the UNION of all their role permissions.
 */
export const ROLE_PERMISSIONS = Object.freeze({
  customer: [
    "booking:create",
    "booking:read:own",
    "booking:cancel:own",
    "profile:read:own",
    "profile:update:own",
    "review:create",
  ],

  driver: [
    "booking:read:own",
    "booking:accept",
    "booking:complete",
    "location:update",
    "profile:read:own",
    "profile:update:own",
    "earnings:read:own",
  ],

  provider: [
    "booking:read:own",
    "booking:accept",
    "booking:complete",
    "service:create",
    "service:update:own",
    "profile:read:own",
    "profile:update:own",
    "earnings:read:own",
  ],

  business: [
    "booking:read:all",
    "booking:manage",
    "service:create",
    "service:update:own",
    "service:delete:own",
    "staff:invite",
    "staff:manage",
    "profile:read:own",
    "profile:update:own",
    "earnings:read:own",
    "analytics:read:own",
  ],

  admin: [
    "booking:read:all",
    "booking:manage",
    "user:read:all",
    "user:suspend",
    "user:ban",
    "user:manage",
    "service:manage",
    "analytics:read:all",
    "audit:read",
    "role:assign",
    "fraud:manage",
  ],
});