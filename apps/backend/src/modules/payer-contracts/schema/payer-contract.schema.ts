import mongoose from "mongoose";
import { DepartmentCategory } from "../constant/department-category.enum.js";
import { PayerContractDocument } from "../types/payer-contract.types.js";

const departmentPolicySchema = new mongoose.Schema(
  {
    departmentCategory: {
      type: String,
      enum: Object.values(DepartmentCategory),
      required: true,
    },
    discountPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    maxDiscountAmount: {
      type: Number,
      min: 0,
    },
    deductionRules: {
      type: String,
      trim: true,
      default: "",
    },
    isApplicable: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const payerContractSchema = new mongoose.Schema<PayerContractDocument>(
  {
    insuranceCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InsuranceCompany",
      required: true,
    },
    effectiveFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    effectiveTo: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    departmentPolicies: {
      type: [departmentPolicySchema],
      default: [],
    },
    tdsPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    defaultHospitalDiscountPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

payerContractSchema.index(
  { insuranceCompanyId: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);
payerContractSchema.index({ insuranceCompanyId: 1, effectiveFrom: -1, effectiveTo: 1});

export const PayerContractModel =
  mongoose.models.PayerContract ||
  mongoose.model<PayerContractDocument>("PayerContract", payerContractSchema);
