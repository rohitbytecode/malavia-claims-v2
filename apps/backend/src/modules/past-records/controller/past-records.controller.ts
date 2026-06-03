import { Request, Response, NextFunction } from "express";
import { PastRecordsService } from "@/modules/past-records/service/past-records.service.js";

export class PastRecordsController {
  static async importRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const record = req.body;

      // Basic validation
      if (!record.patientId || !record.patientName || !record.claimNumber || !record.claimType || !record.claimStatus) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: patientId, patientName, claimNumber, claimType, claimStatus",
        });
      }

      const result = await PastRecordsService.importRecord(record, userId.toString());

      return res.status(201).json({
        success: true,
        message: `Past record imported successfully for claim ${record.claimNumber}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
