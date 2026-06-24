import { Document, Types } from "mongoose";
import { AlertType } from "../constant/alert-type.enum.js";
import { AlertSeverity } from "../constant/alert-severity.enum.js";

export interface AlertDocument extends Document {
  claimId: Types.ObjectId;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  organizationId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
