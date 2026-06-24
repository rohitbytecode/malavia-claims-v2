import { Document, Types } from "mongoose";
import { DocumentType } from "@/modules/documents/constant/document-type.enum.js";

export interface DocumentBase {
  claimId: Types.ObjectId;
  documentType: DocumentType;
  fileName: string;
  originalName: string;
  mimeType: string;
  filePath: string;
  uploadedBy?: Types.ObjectId;
  remarks?: string;
  version: number;
  organizationId: Types.ObjectId;
}

export interface DocumentDocument extends DocumentBase, Document {
  createdAt: Date;
  updatedAt: Date;
}
