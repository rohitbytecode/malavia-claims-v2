import { Types } from "mongoose";
import { PayerContractModel } from "../schema/payer-contract.schema.js";
import { PayerContractDocument } from "../types/payer-contract.types.js";

export class PayerContractRepository {
  static async create(payload: Partial<PayerContractDocument>) {
    return PayerContractModel.create(payload);
  }

  static async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return PayerContractModel.findById(id);
  }

  static async findByInsuranceCompany(insuranceCompanyId: string) {
    if (!Types.ObjectId.isValid(insuranceCompanyId)) return [];
    return PayerContractModel.find({
      insuranceCompanyId: new Types.ObjectId(insuranceCompanyId),
    }).sort({ createdAt: -1 });
  }

  static async findActiveByInsuranceCompany(insuranceCompanyId: string) {
    if (!Types.ObjectId.isValid(insuranceCompanyId)) return null;
    return PayerContractModel.findOne({
      insuranceCompanyId: new Types.ObjectId(insuranceCompanyId),
      isActive: true,
    });
  }

  static async update(id: string, updates: Partial<PayerContractDocument>) {
    if (!Types.ObjectId.isValid(id)) return null;
    return PayerContractModel.findByIdAndUpdate(id, updates, { new: true });
  }

  static async deactivateAllForCompany(insuranceCompanyId: string) {
    return PayerContractModel.updateMany(
      {
        insuranceCompanyId: new Types.ObjectId(insuranceCompanyId),
        isActive: true,
      },
      { isActive: false }
    );
  }

  static async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return PayerContractModel.findByIdAndDelete(id);
  }
}
