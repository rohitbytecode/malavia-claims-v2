import { Router } from "express";
import { validate } from "@/middleware/zod.middleware.js";
import { asyncHandler } from "@/shared/utils/asyncHandler.js";
import { DocumentController } from "@/modules/documents/controller/document.controller.js";
import { uploadDocumentMiddleware } from "@/modules/documents/middleware/upload.middleware.js";
import { authenticate } from "@/modules/auth/middleware/auth.middleware.js";
import {
  uploadDocumentSchema,
  getDocumentsSchema,
} from "@/modules/documents/validation/document.validation.js";

const router = Router();

router.post(
  "/upload",
  authenticate,
  uploadDocumentMiddleware,
  validate(uploadDocumentSchema),
  asyncHandler(DocumentController.uploadDocument)
);
router.get(
  "/",
  authenticate,
  validate(getDocumentsSchema),
  asyncHandler(DocumentController.listDocuments)
);
router.get(
  "/download/:filename",
  authenticate,
  asyncHandler(DocumentController.downloadDocument)
);

export default router;
