import { Document, Types } from "mongoose";
import { DepartmentCategory } from "../constant/department-category.enum.js";

export interface DepartmentPolicyItem {
  departmentCategory: DepartmentCategory;
  discountPercent: number;
  maxDiscountAmount?: number;
  deductionRules?: string;
  isApplicable: boolean;
}

export interface PayerContractBase {
  insuranceCompanyId: Types.ObjectId;
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  departmentPolicies: DepartmentPolicyItem[];
  tdsPercent: number;
  defaultHospitalDiscountPercent: number;
  remarks: string;
  createdBy: Types.ObjectId;
}

export interface PayerContractDocument extends PayerContractBase, Document {
  createdAt: Date;
  updatedAt: Date;
}
