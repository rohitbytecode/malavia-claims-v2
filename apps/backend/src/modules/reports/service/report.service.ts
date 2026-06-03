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
        $lookup: {
          from: "settlements",
          localField: "_id",
          foreignField: "claimId",
          as: "settlement",
        },
      },
      { $unwind: { path: "$settlement", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "SETTLED"] },
                { $ifNull: ["$settlement.netPayable", "$totalClaimAmount"] },
                "$totalClaimAmount",
              ],
            },
          },
        },
      },
    ]);
  }

  static async generateInsurancePerformance() {
    return ClaimModel.aggregate([
      { $match: { insuranceCompanyId: { $exists: true, $ne: null } } },
      {
        $lookup: {
          from: "settlements",
          localField: "_id",
          foreignField: "claimId",
          as: "settlement",
        },
      },
      {
        $group: {
          _id: "$insuranceCompanyId",
          totalClaims: { $sum: 1 },
          totalClaimAmount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "SETTLED"] },
                { $ifNull: [{ $arrayElemAt: ["$settlement.netPayable", 0] }, "$totalClaimAmount"] },
                "$totalClaimAmount",
              ],
            },
          },
          settledClaims: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$status", "SETTLED"] },
                    { $gt: [{ $size: "$settlement" }, 0] },
                  ],
                },
                1,
                0,
              ],
            },
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
            $multiply: [
              {
                $divide: [
                  "$settledClaims",
                  { $cond: [{ $eq: ["$totalClaims", 0] }, 1, "$totalClaims"] },
                ],
              },
              100,
            ],
          },
        },
      },
      { $sort: { totalClaims: -1 } },
    ]);
  }

  static async generateMonthlyReport(
    year: number,
    month: number,
    endYear?: number,
    endMonth?: number
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate =
      endYear && endMonth
        ? new Date(endYear, endMonth, 0, 23, 59, 59, 999)
        : new Date(year, month, 0, 23, 59, 59, 999);

    const summary = await ClaimModel.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $lookup: {
          from: "settlements",
          localField: "_id",
          foreignField: "claimId",
          as: "settlement",
        },
      },
      { $unwind: { path: "$settlement", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "SETTLED"] },
                { $ifNull: ["$settlement.netPayable", "$totalClaimAmount"] },
                "$totalClaimAmount",
              ],
            },
          },
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
        $lookup: {
          from: "settlements",
          localField: "_id",
          foreignField: "claimId",
          as: "settlement",
        },
      },
      { $unwind: { path: "$settlement", preserveNullAndEmptyArrays: true } },

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
          doctorId: "$doctorId",
          departmentId: "$departmentId",
          totalClaimAmount: { $ifNull: ["$totalClaimAmount", 0] },
          depositAmount: "$depositAmount",
          approvedAmount: "$approvedAmount",
          settledAmount: { $ifNull: ["$settlement.netPayable", null] },
          tdsAmount: "$tdsAmount",
          hospitalDiscount: "$hospitalDiscount",
          billBreakdown: { $ifNull: ["$billBreakdown", []] },

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
        (sum, c) => sum + (c.status === "SETTLED" && c.settledAmount !== null ? c.settledAmount : (c.totalClaimAmount || 0)),
        0
      ),
    };
  }

  static async generateSettlementReport(
    year: number,
    month: number,
    endYear?: number,
    endMonth?: number
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate =
      endYear && endMonth
        ? new Date(endYear, endMonth, 0, 23, 59, 59, 999)
        : new Date(year, month, 0, 23, 59, 59, 999);

    const settlements = await mongoose.model("Settlement").aggregate([
      { $match: { settlementDate: { $gte: startDate, $lte: endDate } } },
      {
        $lookup: {
          from: "claims",
          localField: "claimId",
          foreignField: "_id",
          as: "claim",
        },
      },
      { $unwind: { path: "$claim", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "insurancecompanies",
          localField: "claim.insuranceCompanyId",
          foreignField: "_id",
          as: "insurance",
        },
      },
      {
        $unwind: { path: "$insurance", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          claimNumber: "$claim.claimNumber",
          claimId: "$claimId",
          patientId: "$claim.patientId",
          insuranceCompany: "$insurance.name",
          approvedAmount: { $ifNull: ["$approvedAmount", 0] },
          deductions: { $ifNull: ["$deductions", 0] },
          tds: { $ifNull: ["$tds", 0] },
          hospitalDiscount: { $ifNull: ["$hospitalDiscount", 0] },
          netPayable: { $ifNull: ["$netPayable", 0] },
          settlementMethod: "$settlementMethod",
          settlementDate: "$settlementDate",
          totalClaimAmount: { $ifNull: ["$claim.totalClaimAmount", 0] },
          departmentId: "$claim.departmentId",
          departmentBreakdown: { $ifNull: ["$departmentBreakdown", []] },
        },
      },
      { $sort: { settlementDate: -1 } },
    ]);

    const totals = settlements.reduce(
      (acc, s) => {
        acc.totalApproved += s.approvedAmount;
        acc.totalDeductions += s.deductions;
        acc.totalTds += s.tds;
        acc.totalHospitalDiscount += s.hospitalDiscount;
        acc.totalNetPayable += s.netPayable;
        acc.totalClaimAmount += s.totalClaimAmount;
        return acc;
      },
      {
        totalApproved: 0,
        totalDeductions: 0,
        totalTds: 0,
        totalHospitalDiscount: 0,
        totalNetPayable: 0,
        totalClaimAmount: 0,
      }
    );

    return {
      settlements,
      count: settlements.length,
      totals,
    };
  }

  static async generateHospitalShareReport(
    year: number,
    month: number,
    endYear?: number,
    endMonth?: number
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate =
      endYear && endMonth
        ? new Date(endYear, endMonth, 0, 23, 59, 59, 999)
        : new Date(year, month, 0, 23, 59, 59, 999);

    const settlements = await mongoose.model("Settlement").aggregate([
      { $match: { settlementDate: { $gte: startDate, $lte: endDate } } },
      {
        $lookup: {
          from: "claims",
          localField: "claimId",
          foreignField: "_id",
          as: "claim",
        },
      },
      { $unwind: { path: "$claim", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "insurancecompanies",
          localField: "claim.insuranceCompanyId",
          foreignField: "_id",
          as: "insurance",
        },
      },
      {
        $unwind: { path: "$insurance", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          claimNumber: "$claim.claimNumber",
          claimId: "$claimId",
          insuranceCompany: "$insurance.name",
          approvedAmount: { $ifNull: ["$approvedAmount", 0] },
          netPayable: { $ifNull: ["$netPayable", 0] },
          tds: { $ifNull: ["$tds", 0] },
          totalVendorPayout: { $ifNull: ["$totalVendorPayout", undefined] },
          hospitalNetShare: { $ifNull: ["$hospitalNetShare", undefined] },
          settlementDate: "$settlementDate",
          departmentBreakdown: { $ifNull: ["$departmentBreakdown", []] },
        },
      },
      { $sort: { settlementDate: -1 } },
    ]);

    const rows = settlements.map((s) => {
      let pharmacyShare = 0;
      let labShare = 0;
      let radiologyShare = 0;

      for (const item of s.departmentBreakdown || []) {
        const payoutVal =
          item.vendorPayout !== undefined
            ? item.vendorPayout
            : (item.netAmount ?? 0);
        if (item.departmentCategory === "PHARMACY") {
          pharmacyShare = payoutVal;
        } else if (item.departmentCategory === "LABORATORY") {
          labShare = payoutVal;
        } else if (item.departmentCategory === "RADIOLOGY") {
          radiologyShare = payoutVal;
        }
      }

      const vendorPayout =
        s.totalVendorPayout !== undefined && s.totalVendorPayout !== null
          ? s.totalVendorPayout
          : pharmacyShare + labShare + radiologyShare;

      const hospitalShare =
        s.hospitalNetShare !== undefined && s.hospitalNetShare !== null
          ? s.hospitalNetShare
          : Math.max(0, s.netPayable - vendorPayout);

      return {
        _id: s._id,
        claimNumber: s.claimNumber,
        claimId: s.claimId,
        insuranceCompany: s.insuranceCompany,
        settlementDate: s.settlementDate,
        approvedAmount: s.approvedAmount,
        netPayable: s.netPayable,
        tds: s.tds || 0,
        pharmacyShare,
        labShare,
        radiologyShare,
        vendorPayout,
        hospitalShare,
      };
    });

    const totals = rows.reduce(
      (acc, r) => {
        acc.totalApproved += r.approvedAmount;
        acc.totalNetPayable += r.netPayable;
        acc.totalTds += r.tds;
        acc.totalPharmacyShare += r.pharmacyShare;
        acc.totalLabShare += r.labShare;
        acc.totalRadiologyShare += r.radiologyShare;
        acc.totalVendorPayout += r.vendorPayout;
        acc.totalHospitalShare += r.hospitalShare;
        return acc;
      },
      {
        totalApproved: 0,
        totalNetPayable: 0,
        totalTds: 0,
        totalPharmacyShare: 0,
        totalLabShare: 0,
        totalRadiologyShare: 0,
        totalVendorPayout: 0,
        totalHospitalShare: 0,
      }
    );

    return {
      rows,
      totals,
      count: rows.length,
    };
  }
}
