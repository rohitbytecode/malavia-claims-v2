import { comparePassword } from "@/modules/auth/utils/password.util.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/modules/auth/utils/jwt.util.js";
import { AuthRepository } from "@/modules/auth/repository/auth.repository.js";
import { UserRepository } from "@/modules/users/repository/user.repository.js";
import { AppError } from "@/core/errors/AppError.js";
import { hashPassword } from "@/modules/auth/utils/password.util.js";
import { toUserResponse } from "@/modules/users/mapper/user.mapper.js";
import { UserDocument } from "@/modules/users/types/user.types.js";
import { Roles } from "@/core/enums/roles.enum.js";

import mongoose from "mongoose";

interface LoginPayload {
  organizationSlug: string;
  username: string;
  password: string;
}

interface TokenResult {
  accessToken: string;
  refreshToken: string;
}

const buildTokenPayload = (
  userId: string,
  role: Roles,
  username: string,
  fullName: string,
  organizationId?: string
) => {
  return {
    userId,
    role,
    username,
    fullName,
    organizationId,
  };
};

const refreshTokenMatchesAnyHash = async (
  refreshToken: string,
  hashes: string[]
) => {
  for (const hash of hashes) {
    if (await comparePassword(refreshToken, hash)) return true;
  }
  return false;
};

export class AuthService {
  static async login(payload: LoginPayload) {
    // 1. Resolve Organization by slug
    const org = await mongoose.model("Organization").findOne({
      slug: payload.organizationSlug.toLowerCase().trim(),
    });

    if (!org) {
      throw new AppError("Invalid organization, username or password", 401);
    }

    // 2. Resolve User by username and organizationId
    const user = await mongoose.model("User").findOne({
      username: payload.username.toLowerCase().trim(),
      organizationId: org._id,
    });

    if (!user || !user.password) {
      throw new AppError("Invalid organization, username or password", 401);
    }

    if (!user.isActive) {
      throw new AppError(
        "User account is inactive, Contact Super Administrator",
        403
      );
    }

    const passwordMatches = await comparePassword(
      payload.password,
      user.password
    );

    if (!passwordMatches) {
      throw new AppError("Invalid username or password", 401);
    }

    const orgId = (user as any).organizationId?.toString();

    const accessToken = signAccessToken(
      buildTokenPayload(
        user._id.toString(),
        user.role,
        user.username,
        user.fullName,
        orgId
      )
    );
    const refreshToken = signRefreshToken(
      buildTokenPayload(
        user._id.toString(),
        user.role,
        user.username,
        user.fullName,
        orgId
      )
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

    if (!user) {
      throw new AppError("Invalid refresh token", 403);
    }

    const refreshTokenHashes = [
      ...(user.refreshTokenHashes ?? []),
      ...(user.refreshTokenHash ? [user.refreshTokenHash] : []),
    ];

    const refreshTokenMatches = await refreshTokenMatchesAnyHash(
      refreshToken,
      refreshTokenHashes
    );

    if (!refreshTokenMatches) {
      throw new AppError("Invalid refresh token", 403);
    }

    if (!user.isActive) {
      throw new AppError(
        "User account is inactive, Contact Super Administrator",
        403
      );
    }

    const orgId = (user as any).organizationId?.toString();

    const accessToken = signAccessToken(
      buildTokenPayload(
        user._id.toString(),
        user.role,
        user.username,
        user.fullName,
        orgId
      )
    );
    const newRefreshToken = signRefreshToken(
      buildTokenPayload(
        user._id.toString(),
        user.role,
        user.username,
        user.fullName,
        orgId
      )
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

  static async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ) {
    const user = await UserRepository.findByIdWithPassword(userId);

    if (!user || !user.password) {
      throw new AppError("User not found", 404);
    }

    const passwordMatches = await comparePassword(oldPassword, user.password);

    if (!passwordMatches) {
      throw new AppError("Invalid current password", 400);
    }

    const newHashedPassword = await hashPassword(newPassword);

    await UserRepository.updateUser(userId, {
      password: newHashedPassword,
    } as any);

    // Invalidate refresh token to force re-login
    await UserRepository.updateRefreshTokenHash(userId, undefined);

    return { success: true };
  }

  static async getPublicUsers() {
    return UserRepository.listActiveUsers();
  }
}

