import { Document, Types } from "mongoose";
import { RefundMode } from "../constant/refund-mode.enum.js";
import { RefundStatus } from "../constant/refund-status.enum.js";

export interface DepositDocument extends Document {
  claimId: Types.ObjectId;
  collectedAmount: number;
  refundAmount: number;
  refundMode?: RefundMode;
  refundStatus: RefundStatus;
  refundDate?: Date;
  remarks?: string;
  organizationId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
