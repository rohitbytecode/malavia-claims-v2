import { PatientModel } from "@/modules/patients/schema/patient.schema.js";
import { PatientDocument } from "@/modules/patients/types/patient.types.js";

interface PatientFilters {
  isActive?: boolean;
}

export class PatientRepository {
  static async createPatient(payload: Partial<PatientDocument>) {
    const created = await PatientModel.create(payload);
    return created.populate("insuranceCompanyId");
  }

  static async findById(id: string) {
    return PatientModel.findById(id).populate("insuranceCompanyId").lean();
  }

  static async findByPatientId(patientId: string) {
    return PatientModel.findOne({ patientId })
      .populate("insuranceCompanyId")
      .lean();
  }

  static async listPatients(
    filters: PatientFilters,
    page: number,
    limit: number
  ) {
    const query: Record<string, unknown> = {};
    if (typeof filters.isActive === "boolean") {
      query.isActive = filters.isActive;
    }
    return PatientModel.find(query)
      .populate("insuranceCompanyId")
      .sort({ patientId: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  static async updatePatient(id: string, update: Partial<PatientDocument>) {
    return PatientModel.findByIdAndUpdate(id, update, { new: true })
      .populate("insuranceCompanyId")
      .lean();
  }

  static async deletePatient(id: string) {
    return PatientModel.findByIdAndDelete(id).lean();
  }
}
