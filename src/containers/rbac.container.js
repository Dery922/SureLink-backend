import { RoleRepository } from "../repositories/role.repository.js";
import { RbacService } from "../services/rbac.service.js";

/**
 * Lightweight "container" to support RBAC middleware without external DI deps.
 *
 * A stable way for `rbac.middleware.js` to access a singleton service
 * `rbacService`. 
 * A public contract to keep the public DI framework contract: `req.container.resolve("rbacService")`.
 */
const roleRepository = new RoleRepository();
const rbacService = new RbacService({ roleRepository });

export const registerContainerMiddleware = () => {
  return (req, _res, next) => {
    req.container = {
      resolve(name) {
        if (name === "rbacService") return rbacService;
        if (name === "roleRepository") return roleRepository;
        throw new Error(`Unknown container dependency: ${name}`);
      },
    };
    next();
  };
};

export default {
  resolve(name) {
    if (name === "rbacService") return rbacService;
    if (name === "roleRepository") return roleRepository;
    throw new Error(`Unknown container dependency: ${name}`);
  },
};