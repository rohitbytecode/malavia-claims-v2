import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import { DocumentService } from "@/modules/documents/service/document.service.js";
import { StorageService } from "@/core/storage/storage.service.js";
import { DocumentModel } from "@/modules/documents/schema/document.schema.js";

export class DocumentController {
  static async downloadDocument(req: Request, res: Response) {
    const filename = (
      Array.isArray(req.params.filename)
        ? req.params.filename[0]
        : req.params.filename
    ) as string;

    // Find document in database to extract mimeType and filepath
    const doc = await DocumentModel.findOne({
      $or: [{ fileName: filename }, { filePath: filename }],
    }).lean();

    if (!doc) {
      // Fallback: check if it exists in local uploads directory
      const localFilePath = path.resolve(
        process.cwd(),
        "uploads",
        "documents",
        filename
      );

      if (!fs.existsSync(localFilePath)) {
        return res.status(404).json({
          success: false,
          message: "File not found",
        });
      }
      return res.sendFile(localFilePath);
    }

    try {
      const { stream, fromCloud } = await StorageService.getFileStream(doc.filePath);
      
      res.setHeader("Content-Type", doc.mimeType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(doc.originalName)}"`
      );

      // Handle stream errors
      stream.on("error", (err) => {
        console.error("Stream pipe error:", err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: "Error downloading file" });
        }
      });

      return stream.pipe(res);
    } catch (error: any) {
      console.error("❌ Document stream retrieval failed:", error);
      
      // Fallback local check
      const localFilePath = path.resolve(doc.filePath);
      if (fs.existsSync(localFilePath)) {
        return res.sendFile(localFilePath);
      }

      return res.status(404).json({
        success: false,
        message: "File could not be retrieved from storage",
      });
    }
  }

  static async uploadDocument(req: Request, res: Response) {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Document file is required",
      });
    }

    try {
      // Stream file to S3 if configured, or keep local
      const storedPath = await StorageService.uploadFile(
        file.path,
        file.originalname,
        file.mimetype
      );

      const payload = {
        claimId: req.body.claimId,
        documentType: req.body.documentType,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        filePath: storedPath,
        uploadedBy: req.body.uploadedBy,
        remarks: req.body.remarks,
      };

      const document = await DocumentService.uploadDocument(payload);

      return res.status(201).json({
        success: true,
        message: "Document uploaded successfully",
        data: document,
      });
    } catch (err: any) {
      console.error("❌ Document upload controller failed:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to upload document",
      });
    }
  }

  static async listDocuments(req: Request, res: Response) {
    const { claimId } = req.query as { claimId: string };

    const documents = await DocumentService.listDocumentsByClaim(claimId);

    return res.status(200).json({
      success: true,
      message: "Documents listed successfully",
      data: documents,
    });
  }
}
