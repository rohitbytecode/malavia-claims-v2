import type { Roles } from "@/core/enums/roles.enum.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Roles;
        organizationId?: string;
      };
      /** Convenience alias set by requireTenant middleware */
      organizationId?: string;
    }
  }
}

export {};

