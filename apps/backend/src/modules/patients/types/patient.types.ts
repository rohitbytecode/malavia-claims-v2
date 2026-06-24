import { Document, Types } from "mongoose";

export interface PatientBase {
  patientId: string;
  name: string;
  insurerId?: string;
  insuranceCompanyId?: Types.ObjectId;
  isActive: boolean;
  organizationId: Types.ObjectId;
}

export interface PatientDocument extends PatientBase, Document {
  createdAt: Date;
  updatedAt: Date;
}
