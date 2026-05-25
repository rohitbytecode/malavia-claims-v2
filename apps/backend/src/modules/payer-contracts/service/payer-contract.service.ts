import { Types } from "mongoose";
import { PayerContractRepository } from "../repository/payer-contract.repository.js";
import { AppError } from "@/core/errors/AppError.js";
import { DepartmentCategory } from "../constant/department-category.enum.js";

interface CreatePayerContractParams {
  insuranceCompanyId: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  departmentPolicies?: {
    departmentCategory: DepartmentCategory;
    discountPercent: number;
    maxDiscountAmount?: number;
    deductionRules?: string;
    isApplicable?: boolean;
  }[];
  tdsPercent?: number;
  defaultHospitalDiscountPercent?: number;
  remarks?: string;
  createdBy: string;
}

interface UpdatePayerContractParams {
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
  departmentPolicies?: {
    departmentCategory: DepartmentCategory;
    discountPercent: number;
    maxDiscountAmount?: number;
    deductionRules?: string;
    isApplicable?: boolean;
  }[];
  tdsPercent?: number;
  defaultHospitalDiscountPercent?: number;
  remarks?: string;
}

export class PayerContractService {
  static async create(params: CreatePayerContractParams) {
    // Deactivate any existing active contract for this company
    await PayerContractRepository.deactivateAllForCompany(
      params.insuranceCompanyId
    );

    const payload = {
      insuranceCompanyId: new Types.ObjectId(params.insuranceCompanyId),
      effectiveFrom: params.effectiveFrom
        ? new Date(params.effectiveFrom)
        : new Date(),
      effectiveTo: params.effectiveTo
        ? new Date(params.effectiveTo)
        : undefined,
      isActive: true,
      departmentPolicies: (params.departmentPolicies ?? []).map((p) => ({
        departmentCategory: p.departmentCategory,
        discountPercent: p.discountPercent ?? 0,
        maxDiscountAmount: p.maxDiscountAmount,
        deductionRules: p.deductionRules ?? "",
        isApplicable: p.isApplicable ?? true,
      })),
      tdsPercent: params.tdsPercent ?? 0,
      defaultHospitalDiscountPercent:
        params.defaultHospitalDiscountPercent ?? 0,
      remarks: params.remarks ?? "",
      createdBy: new Types.ObjectId(params.createdBy),
    };

    return PayerContractRepository.create(payload as any);
  }

  static async getById(id: string) {
    const contract = await PayerContractRepository.findById(id);
    if (!contract) {
      throw new AppError("Payer contract not found", 404);
    }
    return contract;
  }

  static async listByCompany(insuranceCompanyId: string) {
    return PayerContractRepository.findByInsuranceCompany(insuranceCompanyId);
  }

  static async getActiveByCompany(insuranceCompanyId: string) {
    return PayerContractRepository.findActiveByInsuranceCompany(
      insuranceCompanyId
    );
  }

  static async update(id: string, params: UpdatePayerContractParams) {
    const existing = await PayerContractRepository.findById(id);
    if (!existing) {
      throw new AppError("Payer contract not found", 404);
    }

    const updates: Record<string, unknown> = {};

    if (params.effectiveFrom !== undefined) {
      updates.effectiveFrom = new Date(params.effectiveFrom);
    }
    if (params.effectiveTo !== undefined) {
      updates.effectiveTo = params.effectiveTo
        ? new Date(params.effectiveTo)
        : undefined;
    }
    if (params.isActive !== undefined) {
      // If activating, deactivate others first
      if (params.isActive && !existing.isActive) {
        await PayerContractRepository.deactivateAllForCompany(
          existing.insuranceCompanyId.toString()
        );
      }
      updates.isActive = params.isActive;
    }
    if (params.departmentPolicies !== undefined) {
      updates.departmentPolicies = params.departmentPolicies.map((p) => ({
        departmentCategory: p.departmentCategory,
        discountPercent: p.discountPercent ?? 0,
        maxDiscountAmount: p.maxDiscountAmount,
        deductionRules: p.deductionRules ?? "",
        isApplicable: p.isApplicable ?? true,
      }));
    }
    if (params.tdsPercent !== undefined) {
      updates.tdsPercent = params.tdsPercent;
    }
    if (params.defaultHospitalDiscountPercent !== undefined) {
      updates.defaultHospitalDiscountPercent =
        params.defaultHospitalDiscountPercent;
    }
    if (params.remarks !== undefined) {
      updates.remarks = params.remarks;
    }

    return PayerContractRepository.update(id, updates as any);
  }

  static async remove(id: string) {
    const existing = await PayerContractRepository.findById(id);
    if (!existing) {
      throw new AppError("Payer contract not found", 404);
    }
    return PayerContractRepository.remove(id);
  }
}
