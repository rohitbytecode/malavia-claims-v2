import multer from "multer";
import {
  documentStorage,
  documentFileFilter,
} from "@/modules/documents/utils/document-storage.util.js";

export const uploadDocumentMiddleware = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
}).single("file");
