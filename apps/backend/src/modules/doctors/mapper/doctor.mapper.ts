import { mapRelation } from "@/modules/claims/mapper/claim.mapper.js";

export const toDoctorResponse = (doctor: any) => {
  const dObj =
    typeof doctor.toObject === "function" ? doctor.toObject() : doctor;
  return {
    id: dObj._id?.toString() ?? null,
    name: dObj.name,
    department: mapRelation(dObj.departmentId),
    isActive: dObj.isActive,
    createdAt: dObj.createdAt,
    updatedAt: dObj.updatedAt,
  };
};
