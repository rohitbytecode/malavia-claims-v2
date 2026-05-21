import fs from "fs";
import path from "path";
import multer from "multer";

const uploadDirectory = path.resolve(process.cwd(), "uploads", "documents");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const safeFileName = (originalName: string) => {
  const timestamp = Date.now();
  const cleaned = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${timestamp}-${cleaned}`;
};

export const documentStorage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (_, file, callback) => {
    callback(null, safeFileName(file.originalname));
  },
});

export const documentFileFilter: multer.Options["fileFilter"] = (
  _: Express.Request,
  file: Express.Multer.File,
  callback
) => {
  if (!file.mimetype) {
    return callback(new Error("Unsupported file type"));
  }

  callback(null, true);
};

export const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});
