import mongoose from "mongoose";
import { DepositDocument } from "../types/deposit.types.js";
import { RefundMode } from "../constant/refund-mode.enum.js";
import { RefundStatus } from "../constant/refund-status.enum.js";

const depositSchema = new mongoose.Schema<DepositDocument>(
  {
    claimId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Claim",
      required: true,
      unique: true, // One deposit record per claim
    },
    collectedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    refundAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    refundMode: {
      type: String,
      enum: Object.values(RefundMode),
    },
    refundStatus: {
      type: String,
      enum: Object.values(RefundStatus),
      required: true,
      default: RefundStatus.PENDING,
    },
    refundDate: {
      type: Date,
    },
    remarks: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

depositSchema.index({ refundStatus: 1, refundDate: 1 }, { sparse: true });

export const DepositModel =
  mongoose.models.Deposit ||
  mongoose.model<DepositDocument>("Deposit", depositSchema);
