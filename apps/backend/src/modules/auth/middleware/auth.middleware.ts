import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@/modules/auth/utils/jwt.util.js";
import { AppError } from "@/core/errors/AppError.js";
import { Roles } from "@/core/enums/roles.enum.js";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authorization = req.headers["authorization"];
  const token =
    typeof authorization === "string"
      ? authorization.replace("Bearer ", "")
      : "";

  if (!token) {
    return next(new AppError("Authorization token missing", 401));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.userId,
      role: payload.role as Roles,
    };
    next();
  } catch (error) {
    return next(new AppError("Invalid or expired access token", 401));
  }
};
