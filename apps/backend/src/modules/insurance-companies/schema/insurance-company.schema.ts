import mongoose from "mongoose";
import { InsuranceCompanyDocument } from "@/modules/insurance-companies/types/insurance-company.types.js";

const contactPersonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    designation: { type: String },
  },
  { _id: false }
);

const escalationContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    level: { type: String, required: true },
  },
  { _id: false }
);

const insuranceCompanySchema = new mongoose.Schema<InsuranceCompanyDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    submissionMethods: {
      type: [String],
      required: true,
      default: [],
    },
    portalUrl: {
      type: String,
      trim: true,
    },
    portalUsername: {
      type: String,
      trim: true,
    },
    portalPasswordEncrypted: {
      type: String,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    courierAddress: {
      type: String,
      trim: true,
    },
    tatDays: {
      type: Number,
      min: 0,
      default: 0,
    },
    contactPersons: {
      type: [contactPersonSchema],
      default: [],
    },
    escalationMatrix: {
      type: [escalationContactSchema],
      default: [],
    },
    remarks: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
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

insuranceCompanySchema.index({ name: 1, organizationId: 1 }, { unique: true });
insuranceCompanySchema.index({ organizationId: 1, isActive: 1, name: 1 });

export const InsuranceCompanyModel =
  mongoose.models.InsuranceCompany ||
  mongoose.model<InsuranceCompanyDocument>(
    "InsuranceCompany",
    insuranceCompanySchema
  );
