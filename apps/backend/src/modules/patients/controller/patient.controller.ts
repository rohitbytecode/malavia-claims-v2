import { Request, Response } from "express";
import { PatientService } from "@/modules/patients/service/patient.service.js";

export class PatientController {
  static async createPatient(req: Request, res: Response) {
    const patient = await PatientService.createPatient(req.body);
    return res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      data: patient,
    });
  }

  static async listPatients(req: Request, res: Response) {
    const { isActive, page, limit } = req.query as {
      isActive?: string;
      page?: string;
      limit?: string;
    };
    const patients = await PatientService.listPatients(
      isActive === undefined ? undefined : isActive === "true",
      Number(page ?? 1),
      Number(limit ?? 100)
    );
    return res.status(200).json({
      success: true,
      message: "Patients listed successfully",
      data: patients,
    });
  }

  static async getPatient(req: Request, res: Response) {
    const { patientId } = req.params as { patientId: string };
    const patient = await PatientService.getPatientById(patientId);
    return res.status(200).json({
      success: true,
      message: "Patient fetched successfully",
      data: patient,
    });
  }

  static async updatePatient(req: Request, res: Response) {
    const { patientId } = req.params as { patientId: string };
    const patient = await PatientService.updatePatient(patientId, req.body);
    return res.status(200).json({
      success: true,
      message: "Patient updated successfully",
      data: patient,
    });
  }

  static async deletePatient(req: Request, res: Response) {
    const { patientId } = req.params as { patientId: string };
    const patient = await PatientService.deletePatient(patientId);
    return res.status(200).json({
      success: true,
      message: "Patient deleted successfully",
      data: patient,
    });
  }
}
