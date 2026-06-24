import mongoose from "mongoose";
import { ClaimStatus } from "@/modules/claims/constant/claim-status.enum.js";
import { ClaimType } from "@/modules/claims/constant/claim-type.enum.js";
import { ClaimDocument } from "@/modules/claims/types/claim.types.js";
import { DepartmentCategory } from "@/modules/payer-contracts/constant/department-category.enum.js";

const billLineItemSchema = new mongoose.Schema(
  {
    departmentCategory: {
      type: String,
      enum: Object.values(DepartmentCategory),
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const claimSchema = new mongoose.Schema<ClaimDocument>(
  {
    claimNumber: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: Object.values(ClaimType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ClaimStatus),
      required: true,
      default: ClaimStatus.DRAFT,
    },
    insuranceCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InsuranceCompany",
      required: false,
    },
    insurerId: {
      type: String,
      trim: true,
      required: false,
    },
    patientId: {
      type: String,
      required: true,
      trim: true,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: false,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    totalClaimAmount: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    tdsAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    deductions: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    hospitalDiscount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    depositAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    refundAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    remarks: {
      type: [String],
      default: [],
    },
    billBreakdown: {
      type: [billLineItemSchema],
      default: [],
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

claimSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
claimSchema.index({ organizationId: 1, patientId: 1, status: 1 });
claimSchema.index({ organizationId: 1, insuranceCompanyId: 1, status: 1 });
claimSchema.index({ organizationId: 1, createdBy: 1, createdAt: -1 });
claimSchema.index({ organizationId: 1, type: 1, status: 1, createdAt: -1 });
export const ClaimModel =
  mongoose.models.Claim || mongoose.model<ClaimDocument>("Claim", claimSchema);
