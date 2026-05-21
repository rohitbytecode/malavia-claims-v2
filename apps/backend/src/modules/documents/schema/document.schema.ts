import mongoose from "mongoose";
import { DocumentDocument } from "@/modules/documents/types/document.types.js";
import { DocumentType } from "@/modules/documents/constant/document-type.enum.js";

const documentSchema = new mongoose.Schema<DocumentDocument>(
  {
    claimId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Claim",
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: Object.values(DocumentType),
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    remarks: {
      type: String,
      default: "",
    },
    version: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

export const DocumentModel =
  (mongoose.models.Document as mongoose.Model<DocumentDocument>) ??
  mongoose.model<DocumentDocument>("Document", documentSchema);
