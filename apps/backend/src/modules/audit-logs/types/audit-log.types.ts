import { Document, Types } from "mongoose";
import { AuditModule } from "../constant/audit-module.enum.js";
import { AuditAction } from "../constant/audit-action.enum.js";

export interface AuditLogDocument extends Document {
  module: AuditModule;
  entityId: Types.ObjectId;
  action: AuditAction;
  performedBy: Types.ObjectId;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  organizationId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
