import { Router } from "express";
import { validate } from "@/middleware/zod.middleware.js";
import { asyncHandler } from "@/shared/utils/asyncHandler.js";
import { PatientController } from "@/modules/patients/controller/patient.controller.js";
import {
  createPatientSchema,
  listPatientsSchema,
  patientIdParamsSchema,
  updatePatientSchema,
} from "@/modules/patients/validation/patient.validation.js";
import { authenticate } from "@/modules/auth/middleware/auth.middleware.js";

const router = Router();

router.post(
  "/",
  authenticate,
  validate(createPatientSchema),
  asyncHandler(PatientController.createPatient)
);
router.get(
  "/",
  authenticate,
  validate(listPatientsSchema),
  asyncHandler(PatientController.listPatients)
);
router.get(
  "/:patientId",
  authenticate,
  validate(patientIdParamsSchema),
  asyncHandler(PatientController.getPatient)
);
router.patch(
  "/:patientId",
  authenticate,
  validate(updatePatientSchema),
  asyncHandler(PatientController.updatePatient)
);
router.delete(
  "/:patientId",
  authenticate,
  validate(patientIdParamsSchema),
  asyncHandler(PatientController.deletePatient)
);

export default router;
