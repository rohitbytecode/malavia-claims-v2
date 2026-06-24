import mongoose from "mongoose";
import { DepartmentDocument } from "@/modules/departments/types/department.types.js";

const departmentSchema = new mongoose.Schema<DepartmentDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
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

departmentSchema.index({ name: 1, organizationId: 1 }, { unique: true });
departmentSchema.index({ code: 1, organizationId: 1 }, { unique: true });
departmentSchema.index({ organizationId: 1, isActive: 1 });

export const DepartmentModel =
  mongoose.models.Department ||
  mongoose.model<DepartmentDocument>("Department", departmentSchema);
