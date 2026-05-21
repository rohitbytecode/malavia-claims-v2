import { AppError } from "@/core/errors/AppError.js";
import { DoctorRepository } from "@/modules/doctors/repository/doctor.repository.js";
import { DoctorDocument } from "@/modules/doctors/types/doctor.types.js";
import { toDoctorResponse } from "@/modules/doctors/mapper/doctor.mapper.js";
import mongoose from "mongoose";

interface CreateDoctorPayload {
  name: string;
  departmentId: string;
  isActive?: boolean;
}

export class DoctorService {
  static async createDoctor(payload: CreateDoctorPayload) {
    const doctor = await DoctorRepository.createDoctor({
      name: payload.name.trim(),
      departmentId: new mongoose.Types.ObjectId(payload.departmentId),
      isActive: payload.isActive ?? true,
    } as Partial<DoctorDocument>);

    return toDoctorResponse(doctor);
  }

  static async listDoctors(
    isActive: boolean | undefined,
    page: number,
    limit: number
  ) {
    const doctors = await DoctorRepository.listDoctors(
      { isActive },
      page,
      limit
    );
    return doctors.map(toDoctorResponse);
  }

  static async getDoctorById(id: string) {
    const doctor = await DoctorRepository.findById(id);
    if (!doctor) {
      throw new AppError("Doctor not found", 404);
    }
    return toDoctorResponse(doctor);
  }

  static async updateDoctor(id: string, payload: Partial<CreateDoctorPayload>) {
    const updatePayload: Partial<DoctorDocument> = {};
    if (payload.name) updatePayload.name = payload.name.trim();
    if (payload.departmentId) {
      updatePayload.departmentId = new mongoose.Types.ObjectId(
        payload.departmentId
      );
    }
    if (typeof payload.isActive === "boolean") {
      updatePayload.isActive = payload.isActive;
    }

    const doctor = await DoctorRepository.updateDoctor(id, updatePayload);
    if (!doctor) {
      throw new AppError("Doctor not found", 404);
    }
    return toDoctorResponse(doctor);
  }

  static async deleteDoctor(id: string) {
    const doctor = await DoctorRepository.deleteDoctor(id);
    if (!doctor) {
      throw new AppError("Doctor not found", 404);
    }
    return toDoctorResponse(doctor);
  }
}
