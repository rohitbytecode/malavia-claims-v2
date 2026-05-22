import { Request, Response } from "express";
import { AuthService } from "@/modules/auth/service/auth.service.js";

export class AuthController {
  static async login(req: Request, res: Response) {
    const { user, accessToken, refreshToken } = await AuthService.login(
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  }

  static async refreshToken(req: Request, res: Response) {
    const { accessToken, refreshToken } = await AuthService.refreshToken(
      req.body.refreshToken
    );

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken,
        refreshToken,
      },
    });
  }

  static async changePassword(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { oldPassword, newPassword } = req.body;
    await AuthService.changePassword(userId, oldPassword, newPassword);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  }
}
