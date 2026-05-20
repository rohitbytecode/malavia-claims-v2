import { comparePassword } from "@/modules/auth/utils/password.util.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/modules/auth/utils/jwt.util.js";
import { AuthRepository } from "@/modules/auth/repository/auth.repository.js";
import { AppError } from "@/core/errors/AppError.js";
import { hashPassword } from "@/modules/auth/utils/password.util.js";
import { toUserResponse } from "@/modules/users/mapper/user.mapper.js";
import { UserDocument } from "@/modules/users/types/user.types.js";
import { Roles } from "@/core/enums/roles.enum.js";

interface LoginPayload {
  email: string;
  password: string;
}

interface TokenResult {
  accessToken: string;
  refreshToken: string;
}

const buildTokenPayload = (userId: string, role: Roles) => ({
  userId,
  role,
});

export class AuthService {
  static async login(payload: LoginPayload) {
    const user = await AuthRepository.findUserByEmail(payload.email);

    if (!user || !user.password) {
      throw new AppError("Invalid email or password", 401);
    }

    if (!user.isActive) {
      throw new AppError("User account is inactive, Contact Super Administrator", 403);
    }

    const passwordMatches = await comparePassword(
      payload.password,
      user.password
    );

    if (!passwordMatches) {
      throw new AppError("Invalid email or password", 401);
    }

    const accessToken = signAccessToken(
      buildTokenPayload(user._id.toString(), user.role)
    );
    const refreshToken = signRefreshToken(
      buildTokenPayload(user._id.toString(), user.role)
    );
    const refreshTokenHash = await hashPassword(refreshToken);

    await AuthRepository.saveRefreshTokenHash(
      user._id.toString(),
      refreshTokenHash
    );

    return {
      user: toUserResponse(user),
      accessToken,
      refreshToken,
    };
  }

  static async refreshToken(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    const user = await AuthRepository.findUserById(payload.userId);

    if (!user || !user.refreshTokenHash) {
      throw new AppError("Invalid refresh token", 403);
    }

    const refreshTokenMatches = await comparePassword(
      refreshToken,
      user.refreshTokenHash
    );

    if (!refreshTokenMatches) {
      throw new AppError("Invalid refresh token", 403);
    }

    if (!user.isActive) {
      throw new AppError("User account is inactive, Contact Super Administrator", 403);
    }

    const accessToken = signAccessToken(
      buildTokenPayload(user._id.toString(), user.role)
    );
    const newRefreshToken = signRefreshToken(
      buildTokenPayload(user._id.toString(), user.role)
    );
    const newRefreshTokenHash = await hashPassword(newRefreshToken);

    await AuthRepository.saveRefreshTokenHash(
      user._id.toString(),
      newRefreshTokenHash
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }
}
