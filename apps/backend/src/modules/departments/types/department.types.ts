import { Document, Types } from "mongoose";

export interface DepartmentBase {
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  organizationId: Types.ObjectId;
}

export interface DepartmentDocument extends DepartmentBase, Document {
  createdAt: Date;
  updatedAt: Date;
}
