import mongoose from "mongoose";
import { PatientModel } from "@/modules/patients/schema/patient.schema.js";
import { ClaimModel } from "@/modules/claims/schema/claim.schema.js";
import { InsuranceCompanyModel } from "@/modules/insurance-companies/schema/insurance-company.schema.js";
import { DepartmentModel } from "@/modules/departments/schema/department.schema.js";
import { DoctorModel } from "@/modules/doctors/schema/doctor.schema.js";
import { ClaimStatus } from "@/modules/claims/constant/claim-status.enum.js";
import { ClaimType } from "@/modules/claims/constant/claim-type.enum.js";
import { SettlementModel } from "@/modules/settlements/schema/settlement.schema.js";
import { SettlementMethod } from "@/modules/settlements/constant/settlement-method.enum.js";
import { ClaimStatusHistoryModel } from "@/modules/claims/schema/claim-status-history.schema.js";
import { DepartmentCategory } from "@/modules/payer-contracts/constant/department-category.enum.js";
import { DepositModel } from "@/modules/deposits/schema/deposit.schema.js";
import { RefundStatus } from "@/modules/deposits/constant/refund-status.enum.js";
import { AppError } from "@/core/errors/AppError.js";
import { logger } from "@/config/logger.js";

export interface PastRecordBreakdownItem {
  departmentCategory: string;
  claimedAmount: number;
  approvedAmount: number;
  deduction: number;
  companyDiscountPercent: number;
  companyDiscountAmount: number;
  vendorDiscountPercent: number;
  vendorDiscountAmount: number;
  netAmount: number;
  vendorPayout: number;
  hospitalShare: number;
  remarks?: string;
}

export interface PastRecordInput {
  // Patient
  patientId: string;
  patientName: string;
  insurerId?: string;
  insuranceCompanyName?: string;

  // Claim
  claimNumber: string;
  claimType: string; // "CASHLESS" | "REIMBURSEMENT"
  claimStatus: string;
  claimDate?: string; // ISO date "YYYY-MM-DD"
  departmentName?: string;
  doctorName?: string;
  totalClaimAmount: number;
  tdsAmount?: number;
  deductions?: number;
  hospitalDiscount?: number;
  depositAmount?: number;
  refundAmount?: number;
  remarks?: string;

  // Department breakdown amounts (backward compatibility / flat fallbacks)
  pharmacyAmount?: number;
  laboratoryAmount?: number;
  radiologyAmount?: number;
  roomChargesAmount?: number;
  doctorFeesAmount?: number;
  otChargesAmount?: number;
  consumablesAmount?: number;
  otherAmount?: number;

  // Advanced settlement fields
  settlementMethod?: string;
  settlementDate?: string;
  totalCompanyDiscount?: number;
  totalVendorPayout?: number;
  hospitalNetShare?: number;
  departmentBreakdown?: PastRecordBreakdownItem[];
  refundStatus?: string;
}

// Helper database lookup functions
const findInsuranceCompany = async (name?: string) => {
  if (!name) return undefined;
  return await InsuranceCompanyModel.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
  });
};

const findDepartment = async (name?: string) => {
  if (!name) return undefined;
  return await DepartmentModel.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
  });
};

const findDoctor = async (name?: string) => {
  if (!name) return undefined;
  return await DoctorModel.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
  });
};

function buildFlatBreakdown(record: PastRecordInput) {
  const items: { category: DepartmentCategory; amount: number }[] = [];
  if (record.pharmacyAmount)
    items.push({
      category: DepartmentCategory.PHARMACY,
      amount: record.pharmacyAmount,
    });
  if (record.laboratoryAmount)
    items.push({
      category: DepartmentCategory.LABORATORY,
      amount: record.laboratoryAmount,
    });
  if (record.radiologyAmount)
    items.push({
      category: DepartmentCategory.RADIOLOGY,
      amount: record.radiologyAmount,
    });
  if (record.roomChargesAmount)
    items.push({
      category: DepartmentCategory.ROOM_CHARGES,
      amount: record.roomChargesAmount,
    });
  if (record.doctorFeesAmount)
    items.push({
      category: DepartmentCategory.DOCTOR_FEES,
      amount: record.doctorFeesAmount,
    });
  if (record.otChargesAmount)
    items.push({
      category: DepartmentCategory.OT_CHARGES,
      amount: record.otChargesAmount,
    });
  if (record.consumablesAmount)
    items.push({
      category: DepartmentCategory.CONSUMABLES,
      amount: record.consumablesAmount,
    });
  if (record.otherAmount)
    items.push({
      category: DepartmentCategory.OTHER,
      amount: record.otherAmount,
    });
  return items;
}

export class PastRecordsService {
  static async importRecord(record: PastRecordInput, userId: string) {
    // Resolve relations
    const dbInsuranceCompany = await findInsuranceCompany(
      record.insuranceCompanyName
    );
    const dbDepartment = await findDepartment(record.departmentName);
    const dbDoctor = await findDoctor(record.doctorName);

    // Validate claim type & status
    if (!Object.values(ClaimType).includes(record.claimType as ClaimType)) {
      throw new AppError(`Invalid claim type: ${record.claimType}`, 400);
    }
    if (
      !Object.values(ClaimStatus).includes(record.claimStatus as ClaimStatus)
    ) {
      throw new AppError(`Invalid claim status: ${record.claimStatus}`, 400);
    }

    // 1. Seed or update Patient
    let patient = await PatientModel.findOne({ patientId: record.patientId });
    const patientData = {
      patientId: record.patientId,
      name: record.patientName,
      insurerId: record.insurerId,
      insuranceCompanyId: dbInsuranceCompany?._id,
      isActive: true,
    };

    if (patient) {
      patient = await PatientModel.findByIdAndUpdate(patient._id, patientData, {
        new: true,
      });
      logger.info(
        `Patient ${record.patientId} (${record.patientName}) updated.`
      );
    } else {
      patient = await PatientModel.create(patientData);
      logger.info(
        `Patient ${record.patientId} (${record.patientName}) created.`
      );
    }

    // 2. Build bill breakdown
    let billBreakdown = [];
    if (record.departmentBreakdown && record.departmentBreakdown.length > 0) {
      billBreakdown = record.departmentBreakdown.map((item) => ({
        departmentCategory: item.departmentCategory,
        amount: item.claimedAmount,
        description: `${item.departmentCategory.replace(/_/g, " ").toLowerCase()} charges`,
      }));
    } else {
      const categories = buildFlatBreakdown(record);
      billBreakdown = categories.map(({ category, amount }) => ({
        departmentCategory: category,
        amount,
        description: `${category.replace(/_/g, " ").toLowerCase()} charges`,
      }));
    }

    // 3. Seed or update Claim
    let claim = await ClaimModel.findOne({ claimNumber: record.claimNumber });
    const claimData = {
      claimNumber: record.claimNumber,
      type: record.claimType,
      status: record.claimStatus,
      insuranceCompanyId: dbInsuranceCompany?._id,
      insurerId: record.insurerId,
      patientId: patient!.patientId,
      hospitalId: new mongoose.Types.ObjectId(),
      departmentId: dbDepartment?._id,
      doctorId: dbDoctor?._id,
      totalClaimAmount: record.totalClaimAmount,
      tdsAmount: record.tdsAmount || 0,
      deductions: record.deductions || 0,
      hospitalDiscount: record.hospitalDiscount || 0,
      depositAmount: record.depositAmount || 0,
      refundAmount: record.refundAmount || 0,
      remarks: record.remarks ? [record.remarks] : [],
      createdBy: new mongoose.Types.ObjectId(userId),
      updatedBy: new mongoose.Types.ObjectId(userId),
      billBreakdown,
    };

    let savedClaimId: mongoose.Types.ObjectId;
    const parsedDate = record.claimDate
      ? new Date(record.claimDate)
      : undefined;

    if (claim) {
      await ClaimModel.findByIdAndUpdate(claim._id, claimData);
      savedClaimId = claim._id;
      if (parsedDate) {
        await ClaimModel.findByIdAndUpdate(
          claim._id,
          { createdAt: parsedDate, updatedAt: parsedDate },
          { timestamps: false }
        );
      }
      logger.info(`Claim ${record.claimNumber} updated.`);
    } else {
      const createdClaim = new ClaimModel(claimData);
      if (parsedDate) {
        createdClaim.createdAt = parsedDate;
        createdClaim.updatedAt = parsedDate;
      }
      await createdClaim.save({ timestamps: false });
      savedClaimId = createdClaim._id;
      logger.info(`Claim ${record.claimNumber} created.`);
    }

    // 4. Seed Claim Status History
    await ClaimStatusHistoryModel.deleteMany({ claimId: savedClaimId });
    const historyDoc = new ClaimStatusHistoryModel({
      claimId: savedClaimId,
      fromStatus: ClaimStatus.DRAFT,
      toStatus: record.claimStatus,
      effectiveAt: parsedDate || new Date(),
      remarks: "Past record import",
      changedBy: new mongoose.Types.ObjectId(userId),
    });
    if (parsedDate) {
      historyDoc.createdAt = parsedDate;
      historyDoc.updatedAt = parsedDate;
    }
    await historyDoc.save({ timestamps: false });

    // 5. Handle Settlement if status is SETTLED
    if (record.claimStatus === ClaimStatus.SETTLED) {
      const approvedAmount = record.totalClaimAmount;
      const hospitalDiscount = record.hospitalDiscount || 0;
      const deductions = record.deductions || 0;
      const tds = record.tdsAmount || 0;
      const netPayable = Math.max(
        0,
        approvedAmount - hospitalDiscount - deductions - tds
      );

      let finalBreakdown = [];
      if (record.departmentBreakdown && record.departmentBreakdown.length > 0) {
        finalBreakdown = record.departmentBreakdown.map((item) => ({
          departmentCategory: item.departmentCategory,
          claimedAmount: item.claimedAmount,
          approvedAmount: item.approvedAmount,
          deduction: item.deduction,
          companyDiscountPercent: item.companyDiscountPercent,
          companyDiscountAmount: item.companyDiscountAmount,
          vendorDiscountPercent: item.vendorDiscountPercent,
          vendorDiscountAmount: item.vendorDiscountAmount,
          netAmount: item.netAmount,
          vendorPayout: item.vendorPayout,
          hospitalShare: item.hospitalShare,
          remarks: item.remarks || "",
        }));
      } else {
        const categories = buildFlatBreakdown(record);
        finalBreakdown = categories.map(({ category, amount }) => ({
          departmentCategory: category,
          claimedAmount: amount,
          approvedAmount: amount,
          deduction: 0,
          companyDiscountPercent: 0,
          companyDiscountAmount: 0,
          vendorDiscountPercent: 0,
          vendorDiscountAmount: 0,
          netAmount: amount,
          vendorPayout: 0,
          hospitalShare: amount,
          remarks: "",
        }));
      }

      const method =
        (record.settlementMethod as SettlementMethod) ||
        SettlementMethod.PORTAL;
      const settlementDate = record.settlementDate
        ? new Date(record.settlementDate)
        : parsedDate || new Date();

      const settlementData = {
        claimId: savedClaimId,
        approvedAmount,
        hospitalDiscount,
        deductions,
        tds,
        netPayable,
        totalCompanyDiscount:
          record.totalCompanyDiscount !== undefined
            ? record.totalCompanyDiscount
            : hospitalDiscount,
        totalVendorPayout: record.totalVendorPayout || 0,
        hospitalNetShare:
          record.hospitalNetShare !== undefined
            ? record.hospitalNetShare
            : netPayable - (record.totalVendorPayout || 0),
        settlementMethod: method,
        settlementDate,
        settledBy: new mongoose.Types.ObjectId(userId),
        departmentBreakdown: finalBreakdown,
      };

      const settlementDoc = await SettlementModel.findOne({
        claimId: savedClaimId,
      });
      if (settlementDoc) {
        await SettlementModel.findByIdAndUpdate(
          settlementDoc._id,
          settlementData,
          { timestamps: false }
        );
        if (parsedDate) {
          await SettlementModel.findByIdAndUpdate(
            settlementDoc._id,
            { createdAt: parsedDate, updatedAt: parsedDate },
            { timestamps: false }
          );
        }
      } else {
        const newSettlement = new SettlementModel(settlementData);
        if (parsedDate) {
          newSettlement.createdAt = parsedDate;
          newSettlement.updatedAt = parsedDate;
        }
        await newSettlement.save({ timestamps: false });
      }
      logger.info(
        `Settlement created/updated for claim ${record.claimNumber}.`
      );
    } else {
      await SettlementModel.deleteOne({ claimId: savedClaimId });
    }

    // 6. Handle Deposit if depositAmount > 0 or refundAmount > 0
    if (
      (record.depositAmount && record.depositAmount > 0) ||
      (record.refundAmount && record.refundAmount > 0)
    ) {
      const isCompleted =
        record.claimStatus === ClaimStatus.DEPOSIT_RETURNED ||
        record.claimStatus === ClaimStatus.CLOSED ||
        record.refundStatus === RefundStatus.COMPLETED;

      const depositData = {
        claimId: savedClaimId,
        collectedAmount: record.depositAmount || 0,
        refundAmount: record.refundAmount || 0,
        refundStatus: isCompleted
          ? RefundStatus.COMPLETED
          : RefundStatus.PENDING,
      };

      const depositDoc = await DepositModel.findOne({ claimId: savedClaimId });
      if (depositDoc) {
        await DepositModel.findByIdAndUpdate(depositDoc._id, depositData, {
          timestamps: false,
        });
        if (parsedDate) {
          await DepositModel.findByIdAndUpdate(
            depositDoc._id,
            { createdAt: parsedDate, updatedAt: parsedDate },
            { timestamps: false }
          );
        }
      } else {
        const newDeposit = new DepositModel(depositData);
        if (parsedDate) {
          newDeposit.createdAt = parsedDate;
          newDeposit.updatedAt = parsedDate;
        }
        await newDeposit.save({ timestamps: false });
      }
      logger.info(`Deposit created/updated for claim ${record.claimNumber}.`);
    } else {
      await DepositModel.deleteOne({ claimId: savedClaimId });
    }

    // Return the created/updated claim
    const finalClaim = await ClaimModel.findById(savedClaimId)
      .populate("insuranceCompanyId")
      .populate("departmentId")
      .populate("doctorId")
      .lean();

    return finalClaim;
  }
}
