import mongoose from "mongoose";
import { UserDocument } from "@/modules/users/types/user.types.js";

const userSchema = new mongoose.Schema<UserDocument>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: [
        "SUPER_ADMIN",
        "ADMIN",
        "CLAIM_MANAGER",
        "CLAIM_EXECUTIVE",
        "ACCOUNTANT",
        "PHARMACIST",
      ],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshTokenHash: {
      type: String,
    },
    refreshTokenHashes: {
      type: [String],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ isActive: 1, fullName: 1});
export const UserModel =
  mongoose.models.User || mongoose.model<UserDocument>("User", userSchema);
