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
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: [
        "PLATFORM_ADMIN",
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
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: false, // Optional for PLATFORM_ADMIN who are cross-org
      index: true,
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

// Compound unique: same username allowed across different orgs
userSchema.index({ username: 1, organizationId: 1 }, { unique: true });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ isActive: 1, fullName: 1 });
userSchema.index({ organizationId: 1, role: 1, isActive: 1 });

export const UserModel =
  mongoose.models.User || mongoose.model<UserDocument>("User", userSchema);

