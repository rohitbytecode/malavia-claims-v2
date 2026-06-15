import mongoose from "mongoose";
import { CommunicationDocument } from "@/modules/communications/types/communication.types.js";
import { CommunicationMedium } from "@/modules/communications/constant/communication-medium.enum.js";

const communicationSchema = new mongoose.Schema<CommunicationDocument>(
  {
    claimId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Claim",
      required: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    medium: {
      type: String,
      enum: Object.values(CommunicationMedium),
      required: true,
    },
    remarks: {
      type: String,
      default: "",
    },
    followUpDate: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

communicationSchema.index({ claimId: 1, createdAt: -1 });
communicationSchema.index({ claimId: 1, medium: 1 });
communicationSchema.index({ followUpDate: 1 }, { sparse: true });

export const CommunicationModel =
  mongoose.models.Communication ||
  mongoose.model<CommunicationDocument>("Communication", communicationSchema);
