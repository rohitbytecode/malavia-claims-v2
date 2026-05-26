import { Request, Response, NextFunction } from "express";
import { Roles } from "@/core/enums/roles.enum.js";
import { success } from "zod";

export const allowRoles =
  (...roles: Roles[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    next();
  };

export const denyRoles =
  (...roles: Roles[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (userRole && roles.includes(userRole)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    next();
  };
