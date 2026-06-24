import { Request, Response, NextFunction } from "express";

export const requireTenant = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const orgId = req.user?.organizationId;

  if (!orgId) {
    return res.status(403).json({
      success: false,
      message: "Organization context is required",
    });
  }

  // Convenience alias at request level
  req.organizationId = orgId;
  next();
};
