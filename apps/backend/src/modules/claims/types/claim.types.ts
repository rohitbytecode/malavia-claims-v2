import { Document, Types } from "mongoose";
import { ClaimStatus } from "@/modules/claims/constant/claim-status.enum.js";
import { ClaimType } from "@/modules/claims/constant/claim-type.enum.js";
import { DepartmentCategory } from "@/modules/payer-contracts/constant/department-category.enum.js";

export interface BillLineItem {
  departmentCategory: DepartmentCategory;
  amount: number;
  description?: string;
}

export interface ClaimBase {
  claimNumber: string;
  type: ClaimType;
  status: ClaimStatus;
  insuranceCompanyId?: Types.ObjectId;
  insurerId?: string;
  patientId: string;
  hospitalId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  doctorId?: Types.ObjectId;
  totalClaimAmount: number;
  tdsAmount: number;
  deductions: number;
  hospitalDiscount: number;
  depositAmount: number;
  refundAmount: number;
  remarks: string[];
  billBreakdown: BillLineItem[];
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

export interface ClaimDocument extends ClaimBase, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface ClaimStatusHistoryBase {
  claimId: Types.ObjectId;
  fromStatus: ClaimStatus;
  toStatus: ClaimStatus;
  remarks?: string;
  changedBy?: Types.ObjectId;
  effectiveAt: Date;
}

export interface ClaimStatusHistoryDocument
  extends ClaimStatusHistoryBase, Document {
  createdAt: Date;
  updatedAt: Date;
}
