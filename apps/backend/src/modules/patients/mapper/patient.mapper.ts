import { PatientDocument } from "@/modules/patients/types/patient.types.js";
import { mapRelation } from "@/modules/claims/mapper/claim.mapper.js";

export const toPatientResponse = (patient: any) => {
  const pObj = typeof patient.toObject === "function" ? patient.toObject() : patient;
  return {
    id: pObj._id?.toString() ?? null,
    patientId: pObj.patientId,
    name: pObj.name,
    insurerId: pObj.insurerId,
    insuranceCompany: mapRelation(pObj.insuranceCompanyId),
    isActive: pObj.isActive,
    createdAt: pObj.createdAt,
    updatedAt: pObj.updatedAt,
  };
};
