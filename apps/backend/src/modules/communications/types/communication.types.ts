import { Document, Types } from "mongoose";
import { CommunicationMedium } from "@/modules/communications/constant/communication-medium.enum.js";

export interface CommunicationBase {
  claimId: Types.ObjectId;
  type: string;
  medium: CommunicationMedium;
  remarks?: string;
  followUpDate?: Date;
  createdBy?: Types.ObjectId;
  organizationId: Types.ObjectId;
}

export interface CommunicationDocument extends CommunicationBase, Document {
  createdAt: Date;
  updatedAt: Date;
}
