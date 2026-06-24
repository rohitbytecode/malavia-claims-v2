import { Document, Types } from "mongoose";

export interface AllocationDocument extends Document {
  settlementId: Types.ObjectId;
  departmentId: Types.ObjectId;
  amount: number;
  remarks?: string;
  organizationId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
