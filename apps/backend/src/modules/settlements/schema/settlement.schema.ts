import mongoose from "mongoose";
import { SettlementDocument } from "../types/settlement.types.js";
import { SettlementMethod } from "../constant/settlement-method.enum.js";
import { DepartmentCategory } from "@/modules/payer-contracts/constant/department-category.enum.js";

const departmentBreakdownSchema = new mongoose.Schema(
  {
    departmentCategory: {
      type: String,
      enum: Object.values(DepartmentCategory),
      required: true,
    },
    claimedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    approvedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    deduction: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    companyDiscountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    companyDiscountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    vendorDiscountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    vendorDiscountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    vendorPayout: {
      type: Number,
      default: 0,
      min: 0,
    },
    hospitalShare: {
      type: Number,
      default: 0,
    },
    remarks: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const settlementSchema = new mongoose.Schema<SettlementDocument>(
  {
    claimId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Claim",
      required: true,
      unique: true, // One settlement per claim
    },
    approvedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    hospitalDiscount: {
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
    tds: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    netPayable: {
      type: Number,
      required: true,
      min: 0,
    },
    totalCompanyDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalVendorPayout: {
      type: Number,
      default: 0,
      min: 0,
    },
    hospitalNetShare: {
      type: Number,
      default: 0,
    },
    departmentBreakdown: {
      type: [departmentBreakdownSchema],
      default: [],
    },
    payerContractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayerContract",
    },
    settlementMethod: {
      type: String,
      enum: Object.values(SettlementMethod),
      required: true,
    },
    settlementDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    remarks: {
      type: [String],
      default: [],
    },
    settledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

settlementSchema.index({ settlementDate: -1 });
settlementSchema.index({ settledBy: 1, settlementDate: -1 });
settlementSchema.index(
  { payerContractId: 1, settlementDate: -1 },
  { sparse: true }
);

export const SettlementModel =
  mongoose.models.Settlement ||
  mongoose.model<SettlementDocument>("Settlement", settlementSchema);
