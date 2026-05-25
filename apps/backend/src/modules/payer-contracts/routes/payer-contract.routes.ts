import { Router } from "express";
import { validate } from "@/middleware/zod.middleware.js";
import { PayerContractController } from "../controller/payer-contract.controller.js";
import {
  createPayerContractSchema,
  updatePayerContractSchema,
  getByCompanySchema,
  getByIdSchema,
} from "../validation/payer-contract.validation.js";

const router = Router();

router.post(
  "/",
  validate(createPayerContractSchema),
  PayerContractController.create
);

router.get(
  "/company/:insuranceCompanyId",
  validate(getByCompanySchema),
  PayerContractController.listByCompany
);

router.get(
  "/active/:insuranceCompanyId",
  validate(getByCompanySchema),
  PayerContractController.getActiveByCompany
);

router.get("/:id", validate(getByIdSchema), PayerContractController.getById);

router.patch(
  "/:id",
  validate(updatePayerContractSchema),
  PayerContractController.update
);

router.delete(
  "/:id",
  validate(getByIdSchema),
  PayerContractController.remove
);

export default router;
