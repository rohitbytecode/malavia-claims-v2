import { Request, Response } from "express";
import { ReportService } from "../service/report.service.js";

export class ReportController {
  static async getPatientClaimSummary(req: Request, res: Response) {
    const { patientId } = req.params;
    const report = await ReportService.generatePatientClaimSummary(
      patientId as string
    );

    return res.status(200).json({
      success: true,
      message: "Patient claim summary generated successfully",
      data: report,
    });
  }

  static async getInsurancePerformance(req: Request, res: Response) {
    const report = await ReportService.generateInsurancePerformance();

    return res.status(200).json({
      success: true,
      message: "Insurance performance report generated successfully",
      data: report,
    });
  }

  static async getMonthlyReport(req: Request, res: Response) {
    const { year, month, endYear, endMonth } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: "Year and month query parameters are required",
      });
    }

    const report = await ReportService.generateMonthlyReport(
      Number(year),
      Number(month),
      endYear ? Number(endYear) : undefined,
      endMonth ? Number(endMonth) : undefined
    );

    return res.status(200).json({
      success: true,
      message: "Monthly report generated successfully",
      data: report,
    });
  }

  static async getSettlementReport(req: Request, res: Response) {
    const { year, month, endYear, endMonth } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: "Year and month query parameters are required",
      });
    }

    const report = await ReportService.generateSettlementReport(
      Number(year),
      Number(month),
      endYear ? Number(endYear) : undefined,
      endMonth ? Number(endMonth) : undefined
    );

    return res.status(200).json({
      success: true,
      message: "Settlement report generated successfully",
      data: report,
    });
  }

  static async getHospitalShareReport(req: Request, res: Response) {
    const { year, month, endYear, endMonth } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: "Year and month query parameters are required",
      });
    }

    const report = await ReportService.generateHospitalShareReport(
      Number(year),
      Number(month),
      endYear ? Number(endYear) : undefined,
      endMonth ? Number(endMonth) : undefined
    );

    return res.status(200).json({
      success: true,
      message: "Hospital Share report generated successfully",
      data: report,
    });
  }
}
