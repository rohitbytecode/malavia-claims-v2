import { Document, Types } from "mongoose";
import { SubmissionMethod } from "@/modules/insurance-companies/constant/submission-method.enum.js";

export interface ContactPerson {
  name: string;
  email: string;
  phone: string;
  designation?: string;
}

export interface EscalationContact {
  name: string;
  email: string;
  phone: string;
  level: string;
}

export interface InsuranceCompanyBase {
  name: string;
  submissionMethods: SubmissionMethod[];
  portalUrl?: string;
  portalUsername?: string;
  portalPasswordEncrypted?: string;
  email?: string;
  courierAddress?: string;
  tatDays?: number;
  contactPersons: ContactPerson[];
  escalationMatrix: EscalationContact[];
  remarks?: string;
  isActive: boolean;
  organizationId: Types.ObjectId;
}

export interface InsuranceCompanyDocument
  extends InsuranceCompanyBase, Document {
  createdAt: Date;
  updatedAt: Date;
}
