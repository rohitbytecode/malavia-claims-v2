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

  static async findByIdWithAuthSecrets(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }

    return UserModel.findById(userId).select("+refreshTokenHashes");
  }

  static async findByUsername(username: string) {
    return UserModel.findOne({ username: username.toLowerCase().trim() });
  }

  static async listActiveUsers() {
    return UserModel.find({ isActive: true })
      .select("username fullName role")
      .sort({ fullName: 1 })
      .lean();
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

    if (!refreshTokenHash) {
      return UserModel.findByIdAndUpdate(
        userId,
        { refreshTokenHash: undefined, refreshTokenHashes: [] },
        { new: true }
      );
    }

    return UserModel.findByIdAndUpdate(
      userId,
      {
        refreshTokenHash,
        $push: {
          refreshTokenHashes: {
            $each: [refreshTokenHash],
            $slice: -10,
          },
        },
      },
      { new: true }
    );
  }
}
