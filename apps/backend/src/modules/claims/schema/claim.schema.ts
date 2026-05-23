import mongoose from "mongoose";
import { ClaimStatus } from "@/modules/claims/constant/claim-status.enum.js";
import { ClaimType } from "@/modules/claims/constant/claim-type.enum.js";
import { ClaimDocument } from "@/modules/claims/types/claim.types.js";

const claimSchema = new mongoose.Schema<ClaimDocument>(
  {
    claimNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
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
      index: true,
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
      index: true,
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

export const ClaimModel =
  mongoose.models.Claim || mongoose.model<ClaimDocument>("Claim", claimSchema);
