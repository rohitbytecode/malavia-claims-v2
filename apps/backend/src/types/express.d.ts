import type { Roles } from "@/core/enums/roles.enum.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Roles;
      };
    }
  }
}

export {};
