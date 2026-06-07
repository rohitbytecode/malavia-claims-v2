import mongoose from "mongoose";
import { AllocationDocument } from "../types/allocation.types.js";

const allocationSchema = new mongoose.Schema<AllocationDocument>(
  {
    settlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Settlement",
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    remarks: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

allocationSchema.index({ settlementId: 1, departmentId: 1 }, { unique: true });

export const AllocationModel =
  mongoose.models.Allocation ||
  mongoose.model<AllocationDocument>("Allocation", allocationSchema);
