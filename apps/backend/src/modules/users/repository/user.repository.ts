import { Types } from "mongoose";
import { UserModel } from "@/modules/users/schema/user.schema.js";
import { UserDocument } from "@/modules/users/types/user.types.js";

interface UserFilters {
  role?: string;
  isActive?: boolean;
}

export class UserRepository {
  static async createUser(payload: Partial<UserDocument>) {
    return UserModel.create(payload);
  }

  static async findById(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }

    return UserModel.findById(userId)
      .select("-password -refreshTokenHash")
      .lean();
  }

  static async findByIdWithPassword(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }

    return UserModel.findById(userId);
  }

  static async findByEmail(email: string) {
    return UserModel.findOne({ email: email.toLowerCase().trim() });
  }

  static async listUsers(filters: UserFilters, page: number, limit: number) {
    const query: Record<string, unknown> = {};

    if (filters.role) {
      query.role = filters.role;
    }

    if (typeof filters.isActive === "boolean") {
      query.isActive = filters.isActive;
    }

    return UserModel.find(query)
      .select("-password -refreshTokenHash")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  static async updateUser(userId: string, update: Partial<UserDocument>) {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }

    return UserModel.findByIdAndUpdate(userId, update, {
      new: true,
      select: "-password -refreshTokenHash",
    }).lean();
  }

  static async updateRefreshTokenHash(
    userId: string,
    refreshTokenHash?: string
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }

    return UserModel.findByIdAndUpdate(
      userId,
      { refreshTokenHash },
      { new: true }
    );
  }
}
