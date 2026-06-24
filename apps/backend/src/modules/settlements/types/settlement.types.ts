import { Document, Types } from "mongoose";
import { SettlementMethod } from "../constant/settlement-method.enum.js";
import { DepartmentCategory } from "@/modules/payer-contracts/constant/department-category.enum.js";

export interface SettlementDepartmentBreakdown {
  departmentCategory: DepartmentCategory;
  claimedAmount: number;
  approvedAmount: number;
  deduction: number;
  discountPercent: number; // Stays for backward compatibility
  discountAmount: number; // Stays for backward compatibility
  netAmount: number; // Stays for backward compatibility
  companyDiscountPercent?: number;
  companyDiscountAmount?: number;
  vendorDiscountPercent?: number;
  vendorDiscountAmount?: number;
  vendorPayout?: number;
  hospitalShare?: number;
  remarks?: string;
}

export interface SettlementDocument extends Document {
  claimId: Types.ObjectId;
  approvedAmount: number;
  hospitalDiscount: number; // Stays as total company discount
  deductions: number;
  tds: number;
  netPayable: number; // Paid by company
  totalCompanyDiscount?: number;
  totalVendorPayout?: number;
  hospitalNetShare?: number;
  departmentBreakdown: SettlementDepartmentBreakdown[];
  payerContractId?: Types.ObjectId;
  settlementMethod: SettlementMethod;
  settlementDate: Date;
  remarks: string[];
  settledBy: Types.ObjectId;
  organizationId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
