import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@/modules/auth/utils/jwt.util.js";
import { tenantLocalStorage } from "@/core/tenant/tenant-context.js";

export const tenantContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authorization = req.headers["authorization"];
  const token =
    typeof authorization === "string"
      ? authorization.replace("Bearer ", "")
      : "";

  let organizationId: string | undefined;
  let userId: string | undefined;
  let role: string | undefined;

  if (token) {
    try {
      const payload = verifyAccessToken(token);
      organizationId = payload.organizationId;
      userId = payload.userId;
      role = payload.role;
    } catch (err) {
      // Ignore token verification errors here; the actual authenticate middleware will validate and throw errors
    }
  }

  tenantLocalStorage.run(
    {
      organizationId,
      userId,
      role,
      bypassTenant: role === "PLATFORM_ADMIN",
    },
    () => {
      next();
    }
  );
};
