import mongoose from "mongoose";
import { PatientDocument } from "@/modules/patients/types/patient.types.js";

const patientSchema = new mongoose.Schema<PatientDocument>(
  {
    patientId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    insurerId: {
      type: String,
      trim: true,
      required: false,
    },
    insuranceCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InsuranceCompany",
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

patientSchema.index({ name: 1 });
patientSchema.index({ insuranceCompanyId: 1, isActive: 1 }, { sparse: true });

export const PatientModel =
  mongoose.models.Patient ||
  mongoose.model<PatientDocument>("Patient", patientSchema);
