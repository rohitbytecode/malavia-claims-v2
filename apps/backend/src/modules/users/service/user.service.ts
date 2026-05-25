import { hashPassword } from "@/modules/auth/utils/password.util.js";
import { AppError } from "@/core/errors/AppError.js";
import { UserRepository } from "@/modules/users/repository/user.repository.js";
import { toUserResponse } from "@/modules/users/mapper/user.mapper.js";
import { Roles } from "@/core/enums/roles.enum.js";
import { UserDocument } from "@/modules/users/types/user.types.js";

interface CreateUserPayload {
  fullName: string;
  username: string;
  password: string;
  role: Roles;
  isActive?: boolean;
}

interface UpdateUserPayload {
  fullName?: string;
  username?: string;
  password?: string;
  role?: Roles;
  isActive?: boolean;
}

export class UserService {
  static generateRandomPassword() {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  static async createUser(
    payload: Omit<CreateUserPayload, "password"> & { password?: string }
  ) {
    const existingUser = await UserRepository.findByUsername(payload.username);

    if (existingUser) {
      throw new AppError("Username already in use", 409);
    }

    if (payload.role === Roles.SUPER_ADMIN) {
      throw new AppError("Creating another SUPER_ADMIN is not permitted", 400);
    }

    const autoPassword = UserService.generateRandomPassword();
    const hashedPassword = await hashPassword(autoPassword);
    const user = await UserRepository.createUser({
      fullName: payload.fullName,
      username: payload.username.toLowerCase().trim(),
      password: hashedPassword,
      role: payload.role,
      isActive: payload.isActive ?? true,
    } as any);

    return {
      ...toUserResponse(user),
      tempPassword: autoPassword,
    };
  }

  static async listUsers(
    role: Roles | undefined,
    isActive: boolean | undefined,
    page: number,
    limit: number
  ) {
    const users = await UserRepository.listUsers(
      { role, isActive },
      page,
      limit
    );

    return users.map(toUserResponse);
  }

  static async getUserById(userId: string) {
    const user = await UserRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return toUserResponse(user);
  }

  static async updateUser(userId: string, payload: UpdateUserPayload) {
    const updatePayload: Partial<UserDocument> = {};

    if (payload.fullName) {
      updatePayload.fullName = payload.fullName;
    }

    if (payload.username) {
      updatePayload.username = payload.username.toLowerCase().trim();
    }

    if (payload.password) {
      updatePayload.password = await hashPassword(payload.password);
    }

    if (payload.role) {
      const existingUser = await UserRepository.findById(userId);
      if (
        payload.role === Roles.SUPER_ADMIN &&
        existingUser?.role !== Roles.SUPER_ADMIN
      ) {
        throw new AppError(
          "Promoting user to SUPER_ADMIN is not permitted",
          400
        );
      }
      updatePayload.role = payload.role;
    }

    if (typeof payload.isActive === "boolean") {
      updatePayload.isActive = payload.isActive;
    }

    const updatedUser = await UserRepository.updateUser(userId, updatePayload);

    if (!updatedUser) {
      throw new AppError("User not found", 404);
    }

    return toUserResponse(updatedUser);
  }

  static async deactivateUser(userId: string) {
    const user = await UserRepository.updateUser(userId, { isActive: false });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return toUserResponse(user);
  }
}
