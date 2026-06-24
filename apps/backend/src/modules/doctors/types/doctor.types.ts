import { Document, Types } from "mongoose";

export interface DoctorBase {
  name: string;
  departmentId: Types.ObjectId;
  isActive: boolean;
  organizationId: Types.ObjectId;
}

export interface DoctorDocument extends DoctorBase, Document {
  createdAt: Date;
  updatedAt: Date;
}
