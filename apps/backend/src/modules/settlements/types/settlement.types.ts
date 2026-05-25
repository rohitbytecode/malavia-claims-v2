import { Document, Types } from "mongoose";
import { SettlementMethod } from "../constant/settlement-method.enum.js";
import { DepartmentCategory } from "@/modules/payer-contracts/constant/department-category.enum.js";

export interface SettlementDepartmentBreakdown {
  departmentCategory: DepartmentCategory;
  claimedAmount: number;
  approvedAmount: number;
  deduction: number;
  discountPercent: number;
  discountAmount: number;
  netAmount: number;
  remarks?: string;
}

export interface SettlementDocument extends Document {
  claimId: Types.ObjectId;
  approvedAmount: number;
  hospitalDiscount: number;
  deductions: number;
  tds: number;
  netPayable: number;
  departmentBreakdown: SettlementDepartmentBreakdown[];
  payerContractId?: Types.ObjectId;
  settlementMethod: SettlementMethod;
  settlementDate: Date;
  remarks: string[];
  settledBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
