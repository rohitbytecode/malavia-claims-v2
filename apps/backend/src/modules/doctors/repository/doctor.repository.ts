import { DoctorModel } from "@/modules/doctors/schema/doctor.schema.js";
import { DoctorDocument } from "@/modules/doctors/types/doctor.types.js";

interface DoctorFilters {
  isActive?: boolean;
}

export class DoctorRepository {
  static async createDoctor(payload: Partial<DoctorDocument>) {
    const created = await DoctorModel.create(payload);
    return created.populate("departmentId");
  }

  static async findById(id: string) {
    return DoctorModel.findById(id).populate("departmentId").lean();
  }

  static async listDoctors(
    filters: DoctorFilters,
    page: number,
    limit: number
  ) {
    const query: Record<string, unknown> = {};
    if (typeof filters.isActive === "boolean") {
      query.isActive = filters.isActive;
    }
    return DoctorModel.find(query)
      .populate("departmentId")
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  static async updateDoctor(id: string, update: Partial<DoctorDocument>) {
    return DoctorModel.findByIdAndUpdate(id, update, { new: true })
      .populate("departmentId")
      .lean();
  }

  static async deleteDoctor(id: string) {
    return DoctorModel.findByIdAndDelete(id).lean();
  }
}
