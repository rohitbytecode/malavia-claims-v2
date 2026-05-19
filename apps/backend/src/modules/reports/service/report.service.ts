import { ClaimModel } from "@/modules/claims/schema/claim.schema.js";
import mongoose, { mongo } from "mongoose";

export class ReportService {
  static async generatePatientClaimSummary(patientId: string) {
    const matchStage = mongoose.Types.ObjectId.isValid(patientId)
      ? { patientId: new mongoose.Types.ObjectId(patientId) }
      : { patientId: patientId };
    return ClaimModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalClaimAmount" },
        },
      },
    ]);
  }

  static async generateInsurancePerformance() {
    return ClaimModel.aggregate([
      { $match: { insuranceCompanyId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$insuranceCompanyId",
          totalClaims: { $sum: 1 },
          totalClaimAmount: { $sum: "$totalClaimAmount" },
          settledClaims: {
            $sum: { $cond: [{ $eq: ["$status", "SETTLED"] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "insurancecompanies",
          localField: "_id",
          foreignField: "_id",
          as: "company",
        },
      },
      { $unwind: "$company" },
      {
        $project: {
          companyName: "$company.name",
          totalClaims: 1,
          totalClaimAmount: 1,
          settledClaims: 1,
          settlementRatio: {
            $multiply: [{ $divide: ["$settledClaims", "$totalClaims"] }, 100],
          },
        },
      },
      { $sort: { totalClaims: -1 } },
    ]);
  }

  static async generateMonthlyReport(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const summary = await ClaimModel.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalClaimAmount" },
        },
      },
    ]);

    const detailedClaims = await ClaimModel.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },

      {
        $lookup: {
          from: "users",
          localField: "patientId",
          foreignField: "patientId",
          as: "patient",
        },
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          claimId: "$_id",
          claimNumber: "$claimNumber",
          patientId: "$patientId",

          patientName: {
            $concat: [
              { $ifNull: ["$patient.firstName", ""] },
              " ",
              { $ifNull: ["$patient.lastName", "$patient.name", ""] },
            ],
          },
          uhid: {
            $ifNull: [
              "$patient.uhid",
              "$patient.mrdNumber",
              "$patient.patientId",
              "$patientId",
            ],
          },
          patientPhone: { $ifNull: ["$patient.phone", "$patient.mobile"] },
          gender: "$patient.gender",
          age: "$patient.age",

          // Claim Fields
          type: "$type",
          status: "$status",
          totalClaimAmount: { $ifNull: ["$totalClaimAmount", 0] },
          depositAmount: "$depositAmount",
          approvedAmount: "$approvedAmount",
          settledAmount: "$settledAmount",
          tdsAmount: "$tdsAmount",
          hospitalDiscount: "$hospitalDiscount",

          insuranceCompanyId: "$insuranceCompanyId", // if exists
          createdAt: "$createdAt",
          updatedAt: "$updatedAt",
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return {
      summary,
      detailedClaims,
      totalClaims: detailedClaims.length,
      totalAmount: detailedClaims.reduce(
        (sum, c) => sum + (c.totalClaimAmount || 0),
        0
      ),
    };
  }
}
