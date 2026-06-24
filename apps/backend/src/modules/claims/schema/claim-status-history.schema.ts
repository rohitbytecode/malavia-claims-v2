import mongoose from "mongoose";
import { ClaimStatusHistoryDocument } from "@/modules/claims/types/claim.types.js";

const claimStatusHistorySchema =
  new mongoose.Schema<ClaimStatusHistoryDocument>(
    {
      claimId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Claim",
        required: true,
      },
      fromStatus: {
        type: String,
        required: true,
      },
      toStatus: {
        type: String,
        required: true,
      },
      remarks: {
        type: String,
        default: "",
      },
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      effectiveAt: {
        type: Date,
        required: true,
        default: () => new Date(),
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

claimStatusHistorySchema.index({ claimId: 1, effectiveAt: -1 });
claimStatusHistorySchema.index({ claimId: 1, createdAt: -1 });

export const ClaimStatusHistoryModel =
  mongoose.models.ClaimStatusHistory ||
  mongoose.model<ClaimStatusHistoryDocument>(
    "ClaimStatusHistory",
    claimStatusHistorySchema
  );
