import mongoose from "mongoose";
import { OrganizationDocument } from "@/modules/organizations/types/organization.types.js";

const organizationSchema = new mongoose.Schema<OrganizationDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    plan: {
      type: String,
      enum: ["FREE", "STARTER", "PRO", "ENTERPRISE"],
      default: "FREE",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      logoUrl: { type: String },
      primaryColor: { type: String, default: "#6366f1" },
      timezone: { type: String, default: "Asia/Kolkata" },
      currency: { type: String, default: "INR" },
    },
    billing: {
      email: { type: String },
      planExpiresAt: { type: Date },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

organizationSchema.index({ isActive: 1, plan: 1 });

export const OrganizationModel =
  mongoose.models.Organization ||
  mongoose.model<OrganizationDocument>("Organization", organizationSchema);
