import { AppError } from "@/core/errors/AppError.js";
import { PatientRepository } from "@/modules/patients/repository/patient.repository.js";
import { PatientDocument } from "@/modules/patients/types/patient.types.js";
import { toPatientResponse } from "@/modules/patients/mapper/patient.mapper.js";
import mongoose from "mongoose";

interface CreatePatientPayload {
  patientId: string;
  name: string;
  insurerId?: string | null;
  insuranceCompanyId?: string | null;
  isActive?: boolean;
}

export class PatientService {
  static async createPatient(payload: CreatePatientPayload) {
    const existing = await PatientRepository.findByPatientId(payload.patientId.trim());
    if (existing) {
      throw new AppError("Patient with this ID already registered", 400);
    }

    const patient = await PatientRepository.createPatient({
      patientId: payload.patientId.trim(),
      name: payload.name.trim(),
      insurerId: payload.insurerId?.trim() || undefined,
      insuranceCompanyId:
        payload.insuranceCompanyId && mongoose.Types.ObjectId.isValid(payload.insuranceCompanyId)
          ? new mongoose.Types.ObjectId(payload.insuranceCompanyId)
          : undefined,
      isActive: payload.isActive ?? true,
    } as Partial<PatientDocument>);

    return toPatientResponse(patient);
  }

  static async listPatients(isActive: boolean | undefined, page: number, limit: number) {
    const patients = await PatientRepository.listPatients({ isActive }, page, limit);
    return patients.map(toPatientResponse);
  }

  static async getPatientById(id: string) {
    const patient = await PatientRepository.findById(id);
    if (!patient) {
      throw new AppError("Patient not found", 404);
    }
    return toPatientResponse(patient);
  }

  static async getPatientByPatientId(patientId: string) {
    const patient = await PatientRepository.findByPatientId(patientId);
    if (!patient) {
      throw new AppError("Patient not found", 404);
    }
    return toPatientResponse(patient);
  }

  static async updatePatient(id: string, payload: Partial<CreatePatientPayload>) {
    const updatePayload: Partial<PatientDocument> = {};
    if (payload.patientId) updatePayload.patientId = payload.patientId.trim();
    if (payload.name) updatePayload.name = payload.name.trim();
    if (payload.insurerId !== undefined) {
      updatePayload.insurerId = payload.insurerId?.trim() || undefined;
    }
    if (payload.insuranceCompanyId !== undefined) {
      updatePayload.insuranceCompanyId =
        payload.insuranceCompanyId && mongoose.Types.ObjectId.isValid(payload.insuranceCompanyId)
          ? new mongoose.Types.ObjectId(payload.insuranceCompanyId)
          : undefined;
    }
    if (typeof payload.isActive === "boolean") updatePayload.isActive = payload.isActive;

    const patient = await PatientRepository.updatePatient(id, updatePayload);
    if (!patient) {
      throw new AppError("Patient not found", 404);
    }
    return toPatientResponse(patient);
  }

  static async deletePatient(id: string) {
    const patient = await PatientRepository.deletePatient(id);
    if (!patient) {
      throw new AppError("Patient not found", 404);
    }
    return toPatientResponse(patient);
  }
}
