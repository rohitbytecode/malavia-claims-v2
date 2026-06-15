import mongoose from "mongoose";
import { connectDatabase } from "@/config/db.js";
import { logger } from "@/config/logger.js";
import { PatientModel } from "@/modules/patients/schema/patient.schema.js";
import { ClaimModel } from "@/modules/claims/schema/claim.schema.js";
import { InsuranceCompanyModel } from "@/modules/insurance-companies/schema/insurance-company.schema.js";
import { DepartmentModel } from "@/modules/departments/schema/department.schema.js";
import { DoctorModel } from "@/modules/doctors/schema/doctor.schema.js";
import { UserModel } from "@/modules/users/schema/user.schema.js";
import { ClaimStatus } from "@/modules/claims/constant/claim-status.enum.js";
import { ClaimType } from "@/modules/claims/constant/claim-type.enum.js";
import { Roles } from "@/core/enums/roles.enum.js";
import { SettlementModel } from "@/modules/settlements/schema/settlement.schema.js";
import { SettlementMethod } from "@/modules/settlements/constant/settlement-method.enum.js";
import { ClaimStatusHistoryModel } from "@/modules/claims/schema/claim-status-history.schema.js";
import { DepartmentCategory } from "@/modules/payer-contracts/constant/department-category.enum.js";
import { DepositModel } from "@/modules/deposits/schema/deposit.schema.js";
import { RefundStatus } from "@/modules/deposits/constant/refund-status.enum.js";

// Structure of past patient & claim records for ease of editing
interface PastRecordSeed {
  // Patient details
  patientId: string;
  patientName: string;
  insurerId?: string;
  insuranceCompanyName?: string; // Resolved to insuranceCompanyId (e.g., "HDFC Ergo", "Star Health", "ICICI Lombard")

  // Claim details
  claimNumber: string;
  claimType: ClaimType;
  claimStatus: ClaimStatus;
  claimDate?: string; // The date when the claim was registered or status transitioned (e.g., "2026-03-15")
  departmentName?: string; // Resolved to departmentId (e.g., "Cardiology", "Neurology", "Orthopedics", "General Surgery")
  doctorName?: string; // Resolved to doctorId (e.g., "Dr. Alice Smith", "Dr. Bob Johnson")
  totalClaimAmount: number;
  tdsAmount?: number;
  deductions?: number;
  hospitalDiscount?: number;
  depositAmount?: number;
  refundAmount?: number;
  remarks?: string[];

  // Department Breakdown amounts
  pharmacyAmount?: number;
  laboratoryAmount?: number;
  radiologyAmount?: number;
  roomChargesAmount?: number;
  doctorFeesAmount?: number;
  otChargesAmount?: number;
  consumablesAmount?: number;
  otherAmount?: number;
}

/**
 * Past Records Data (21 records)
 * ----------------------------------------------------
 * You can modify the names, ID numbers, status values,
 * amounts, and other fields in the list below.
 */
const pastRecords: PastRecordSeed[] = [
  {
    patientId: "T-P-5",
    patientName: "Totaram Parihar",
    insurerId: "IL0910205179000",
    insuranceCompanyName: "ICICI Lombard",
    claimNumber: "AL-110202460068",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.SETTLED,
    claimDate: "2026-05-01",
    departmentName: "General Medicine",
    doctorName: "Arvind K. Malavia",
    totalClaimAmount: 43516,
    tdsAmount: 3829,
    deductions: 0,
    hospitalDiscount: 5221,
    depositAmount: 5000,
    refundAmount: 5000,
    remarks: ["Past record seed", "Status: Settled"],
    pharmacyAmount: 20000,
    laboratoryAmount: 10000,
    radiologyAmount: 8516,
    roomChargesAmount: 5000,
  },
  {
    patientId: "SRR-12",
    patientName: "Sheetal Raju Rai",
    insurerId: "100000866998",
    insuranceCompanyName: "ICICI Lombard",
    claimNumber: "126003974200",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.PREAUTH_REJECTED,
    claimDate: "2026-05-04",
    departmentName: "General Medicine",
    doctorName: "Arvind K. Malavia",
    totalClaimAmount: 0,
    tdsAmount: 0,
    deductions: 0,
    hospitalDiscount: 0,
    depositAmount: 0,
    refundAmount: 0,
    remarks: ["Past record seed", "Status: Rejection"],
  },
  {
    patientId: "AMP-35",
    patientName: "Aaryan Mayur Patel",
    insurerId: "IL971796082060",
    insuranceCompanyName: "ICICI Lombard",
    claimNumber: "110202470108",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.SETTLED,
    claimDate: "2026-05-09",
    departmentName: "Pediatrics",
    doctorName: "Vimal Jariwala",
    totalClaimAmount: 27778,
    tdsAmount: 2445,
    deductions: 0,
    hospitalDiscount: 3333,
    depositAmount: 5000,
    refundAmount: 5000,
    remarks: ["Past record seed", "Status: Settled"],
    pharmacyAmount: 12000,
    laboratoryAmount: 5000,
    radiologyAmount: 4000,
    doctorFeesAmount: 6778,
  },
  {
    patientId: "KGL-2",
    patientName: "Kusumben Lad",
    insurerId: "IL0893954932030",
    insuranceCompanyName: "ICICI Lombard",
    claimNumber: "110202484111",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.SETTLEMENT_PENDING,
    claimDate: "2026-06-01",
    departmentName: "General Medicine",
    doctorName: "Arvind K. Malavia",
    totalClaimAmount: 13354,
    tdsAmount: 0,
    deductions: 0,
    hospitalDiscount: 0,
    depositAmount: 0,
    refundAmount: 0,
    remarks: ["Past record seed", "Status: Settlement Pending"],
    pharmacyAmount: 6000,
    laboratoryAmount: 3000,
    radiologyAmount: 2000,
    consumablesAmount: 2354,
  },
  {
    patientId: "D-D-14",
    patientName: "Dhan Meher Dastur",
    insurerId: "INS-PAST-005",
    insuranceCompanyName: "Star Health",
    claimNumber: "CLM-PAST-005",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.FINAL_APPROVAL_PENDING,
    claimDate: "2026-05-20",
    departmentName: "General Surgery",
    doctorName: "Dr. Bob Johnson",
    totalClaimAmount: 180000,
    tdsAmount: 0,
    deductions: 0,
    hospitalDiscount: 3000,
    depositAmount: 20000,
    refundAmount: 0,
    remarks: [
      "Past record seed",
      "Discharge card uploaded, awaiting final approval",
    ],
    pharmacyAmount: 50000,
    laboratoryAmount: 30000,
    radiologyAmount: 20000,
    roomChargesAmount: 40000,
    doctorFeesAmount: 40000,
  },
  {
    patientId: "PAT-PAST-006",
    patientName: "Kabir Gupta",
    insurerId: "INS-PAST-006",
    insuranceCompanyName: "ICICI Lombard",
    claimNumber: "CLM-PAST-006",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.CLOSED,
    claimDate: "2026-02-15",
    departmentName: "Neurology",
    doctorName: "Dr. Bob Johnson",
    totalClaimAmount: 60000,
    tdsAmount: 600,
    deductions: 4000,
    hospitalDiscount: 1000,
    depositAmount: 5000,
    refundAmount: 5000,
    remarks: ["Past record seed", "Case completed and closed"],
  },
  {
    patientId: "PAT-PAST-007",
    patientName: "Ishaan Joshi",
    insurerId: "INS-PAST-007",
    insuranceCompanyName: "HDFC Ergo",
    claimNumber: "CLM-PAST-007",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.PREAUTH_APPROVED,
    claimDate: "2026-05-25",
    departmentName: "Cardiology",
    doctorName: "Dr. Alice Smith",
    totalClaimAmount: 130000,
    tdsAmount: 0,
    deductions: 0,
    hospitalDiscount: 0,
    depositAmount: 0,
    refundAmount: 0,
    remarks: ["Past record seed", "Pre-auth approved, patient admitted"],
  },
  {
    patientId: "PAT-PAST-008",
    patientName: "Meera Sen",
    insurerId: "INS-PAST-008",
    insuranceCompanyName: "Star Health",
    claimNumber: "CLM-PAST-008",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.SETTLEMENT_PENDING,
    claimDate: "2026-02-28", // 95 days ago - triggers Critical delay (>90 days) alert
    departmentName: "Orthopedics",
    doctorName: "Dr. Bob Johnson",
    totalClaimAmount: 110000,
    tdsAmount: 1100,
    deductions: 2500,
    hospitalDiscount: 2000,
    depositAmount: 0,
    refundAmount: 0,
    remarks: [
      "Past record seed",
      "Approved, awaiting bank settlement transfer",
    ],
  },
  {
    patientId: "PAT-PAST-009",
    patientName: "Sai Kumar",
    insurerId: "INS-PAST-009",
    insuranceCompanyName: "ICICI Lombard",
    claimNumber: "CLM-PAST-009",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.SUBMITTED,
    claimDate: "2026-05-18",
    departmentName: "General Surgery",
    doctorName: "Dr. Alice Smith",
    totalClaimAmount: 75000,
    tdsAmount: 0,
    deductions: 0,
    hospitalDiscount: 500,
    depositAmount: 5000,
    refundAmount: 0,
    remarks: ["Past record seed", "Documents uploaded and claim submitted"],
  },
  {
    patientId: "PAT-PAST-010",
    patientName: "Rohan Mehta",
    insurerId: "INS-PAST-010",
    insuranceCompanyName: "HDFC Ergo",
    claimNumber: "CLM-PAST-010",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.DRAFT,
    claimDate: "2026-06-01",
    departmentName: "Neurology",
    doctorName: "Dr. Bob Johnson",
    totalClaimAmount: 50000,
    tdsAmount: 0,
    deductions: 0,
    hospitalDiscount: 0,
    depositAmount: 0,
    refundAmount: 0,
    remarks: ["Past record seed", "Draft created"],
  },
  {
    patientId: "PAT-PAST-011",
    patientName: "Kavya Rao",
    insurerId: "INS-PAST-011",
    insuranceCompanyName: "Star Health",
    claimNumber: "CLM-PAST-011",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.PREAUTH_REJECTED,
    claimDate: "2026-04-12",
    departmentName: "Cardiology",
    doctorName: "Dr. Alice Smith",
    totalClaimAmount: 160000,
    tdsAmount: 0,
    deductions: 0,
    hospitalDiscount: 0,
    depositAmount: 0,
    refundAmount: 0,
    remarks: [
      "Past record seed",
      "Pre-auth rejected by insurer due to pre-existing condition",
    ],
  },
  {
    patientId: "PAT-PAST-012",
    patientName: "Aditya Bose",
    insurerId: "INS-PAST-012",
    insuranceCompanyName: "ICICI Lombard",
    claimNumber: "CLM-PAST-012",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.QUERY_RESPONDED,
    claimDate: "2026-05-14",
    departmentName: "Orthopedics",
    doctorName: "Dr. Bob Johnson",
    totalClaimAmount: 89000,
    tdsAmount: 0,
    deductions: 0,
    hospitalDiscount: 800,
    depositAmount: 8000,
    refundAmount: 0,
    remarks: ["Past record seed", "Response submitted to query raised"],
  },
  {
    patientId: "PAT-PAST-013",
    patientName: "Riya Das",
    insurerId: "INS-PAST-013",
    insuranceCompanyName: "HDFC Ergo",
    claimNumber: "CLM-PAST-013",
    claimType: ClaimType.REIMBURSEMENT,
    claimStatus: ClaimStatus.DRAFT,
    claimDate: "2026-05-30",
    departmentName: "General Surgery",
    doctorName: "Dr. Alice Smith",
    totalClaimAmount: 42000,
    tdsAmount: 0,
    deductions: 0,
    hospitalDiscount: 0,
    depositAmount: 0,
    refundAmount: 0,
    remarks: ["Past record seed", "Reimbursement claim draft"],
  },
  {
    patientId: "PAT-PAST-014",
    patientName: "Devendra Singh",
    insurerId: "INS-PAST-014",
    insuranceCompanyName: "Star Health",
    claimNumber: "CLM-PAST-014",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.DEPOSIT_PENDING,
    claimDate: "2026-05-22",
    departmentName: "Cardiology",
    doctorName: "Dr. Alice Smith",
    totalClaimAmount: 210000,
    tdsAmount: 0,
    deductions: 0,
    hospitalDiscount: 0,
    depositAmount: 0,
    refundAmount: 0,
    remarks: ["Past record seed", "Awaiting patient deposit payment"],
  },
  {
    patientId: "PAT-PAST-015",
    patientName: "Nisha Verma",
    insurerId: "INS-PAST-015",
    insuranceCompanyName: "ICICI Lombard",
    claimNumber: "CLM-PAST-015",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.DEPOSIT_RETURNED,
    claimDate: "2026-04-30",
    departmentName: "Neurology",
    doctorName: "Dr. Bob Johnson",
    totalClaimAmount: 115000,
    tdsAmount: 1150,
    deductions: 2000,
    hospitalDiscount: 1000,
    depositAmount: 10000,
    refundAmount: 10000,
    remarks: [
      "Past record seed",
      "Refund completed, deposit returned to patient",
    ],
  },
  {
    patientId: "PAT-PAST-016",
    patientName: "Pranav Mishra",
    insurerId: "INS-PAST-016",
    insuranceCompanyName: "HDFC Ergo",
    claimNumber: "CLM-PAST-016",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.RECONSIDERATION_PENDING,
    claimDate: "2026-05-05",
    departmentName: "Orthopedics",
    doctorName: "Dr. Alice Smith",
    totalClaimAmount: 135000,
    tdsAmount: 0,
    deductions: 0,
    hospitalDiscount: 0,
    depositAmount: 0,
    refundAmount: 0,
    remarks: [
      "Past record seed",
      "Reconsideration request filed with new documents",
    ],
  },
  {
    patientId: "PAT-PAST-017",
    patientName: "Pooja Hegde",
    insurerId: "INS-PAST-017",
    insuranceCompanyName: "Star Health",
    claimNumber: "CLM-PAST-017",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.FINAL_REJECTED,
    claimDate: "2026-04-20",
    departmentName: "General Surgery",
    doctorName: "Dr. Bob Johnson",
    totalClaimAmount: 95000,
    tdsAmount: 0,
    deductions: 0,
    hospitalDiscount: 0,
    depositAmount: 12000,
    refundAmount: 0,
    remarks: ["Past record seed", "Final approval rejected by the insurer"],
  },
  {
    patientId: "PAT-PAST-018",
    patientName: "Siddharth Malhotra",
    insurerId: "INS-PAST-018",
    insuranceCompanyName: "ICICI Lombard",
    claimNumber: "CLM-PAST-018",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.DOCUMENTS_PENDING,
    claimDate: "2026-05-12",
    departmentName: "Cardiology",
    doctorName: "Dr. Alice Smith",
    totalClaimAmount: 155000,
    tdsAmount: 0,
    deductions: 0,
    hospitalDiscount: 1500,
    depositAmount: 5000,
    refundAmount: 0,
    remarks: ["Past record seed", "Awaiting diagnostic reports from lab"],
  },
  {
    patientId: "PAT-PAST-019",
    patientName: "Kiran Deshmukh",
    insurerId: "INS-PAST-019",
    insuranceCompanyName: "HDFC Ergo",
    claimNumber: "CLM-PAST-019",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.SETTLED,
    claimDate: "2026-04-02",
    departmentName: "Neurology",
    doctorName: "Dr. Bob Johnson",
    totalClaimAmount: 92000,
    tdsAmount: 920,
    deductions: 1800,
    hospitalDiscount: 2000,
    depositAmount: 0,
    refundAmount: 0,
    remarks: ["Past record seed", "Settled completely"],
  },
  {
    patientId: "PAT-PAST-020",
    patientName: "Sneha Kulkarni",
    insurerId: "INS-PAST-020",
    insuranceCompanyName: "Star Health",
    claimNumber: "CLM-PAST-020",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.FINAL_APPROVED,
    claimDate: "2026-05-24",
    departmentName: "Orthopedics",
    doctorName: "Dr. Alice Smith",
    totalClaimAmount: 105000,
    tdsAmount: 1050,
    deductions: 3500,
    hospitalDiscount: 1200,
    depositAmount: 10000,
    refundAmount: 0,
    remarks: ["Past record seed", "Approved, awaiting discharge"],
  },
  {
    patientId: "PAT-PAST-021",
    patientName: "Amit Yadav",
    insurerId: "INS-PAST-021",
    insuranceCompanyName: "ICICI Lombard",
    claimNumber: "CLM-PAST-021",
    claimType: ClaimType.CASHLESS,
    claimStatus: ClaimStatus.SETTLEMENT_PENDING,
    claimDate: "2026-04-18", // 46 days ago - triggers High delay (>45 days) alert
    departmentName: "General Surgery",
    doctorName: "Dr. Bob Johnson",
    totalClaimAmount: 125000,
    tdsAmount: 1250,
    deductions: 4000,
    hospitalDiscount: 1000,
    depositAmount: 0,
    refundAmount: 0,
    remarks: ["Past record seed", "Awaiting bank settlement"],
  },
];

// Helper database lookup functions
const findInsuranceCompany = async (name?: string) => {
  if (!name) return undefined;
  return await InsuranceCompanyModel.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
  });
};

const findDepartment = async (name?: string) => {
  if (!name) return undefined;
  return await DepartmentModel.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
  });
};

const findDoctor = async (name?: string) => {
  if (!name) return undefined;
  return await DoctorModel.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
  });
};

const runSeeder = async () => {
  try {
    logger.info("Connecting to the database...");
    await connectDatabase();
    logger.info("Database connected. Seeding 21 past records...");

    // Find the admin user to associate with 'createdBy'
    const adminUser = await UserModel.findOne({ role: Roles.ADMIN });
    if (!adminUser) {
      logger.warn(
        "Admin user not found. Claims will be created without 'createdBy' reference."
      );
    }

    let successCount = 0;

    for (const record of pastRecords) {
      try {
        // Resolve relations
        const dbInsuranceCompany = await findInsuranceCompany(
          record.insuranceCompanyName
        );
        const dbDepartment = await findDepartment(record.departmentName);
        const dbDoctor = await findDoctor(record.doctorName);

        if (record.insuranceCompanyName && !dbInsuranceCompany) {
          logger.warn(
            `Insurance company "${record.insuranceCompanyName}" not found for patient ${record.patientName}. Proceeding without it.`
          );
        }
        if (record.departmentName && !dbDepartment) {
          logger.warn(
            `Department "${record.departmentName}" not found for claim ${record.claimNumber}. Proceeding without it.`
          );
        }
        if (record.doctorName && !dbDoctor) {
          logger.warn(
            `Doctor "${record.doctorName}" not found for claim ${record.claimNumber}. Proceeding without it.`
          );
        }

        // 1. Seed or update Patient
        let patient = await PatientModel.findOne({
          patientId: record.patientId,
        });

        const patientData = {
          patientId: record.patientId,
          name: record.patientName,
          insurerId: record.insurerId,
          insuranceCompanyId: dbInsuranceCompany?._id,
          isActive: true,
        };

        if (patient) {
          // Update existing patient record
          patient = await PatientModel.findByIdAndUpdate(
            patient._id,
            patientData,
            { new: true }
          );
          logger.info(
            `Patient ${record.patientId} (${record.patientName}) updated.`
          );
        } else {
          // Create new patient record
          patient = await PatientModel.create(patientData);
          logger.info(
            `Patient ${record.patientId} (${record.patientName}) created.`
          );
        }

        // 2. Seed or update Claim
        let claim = await ClaimModel.findOne({
          claimNumber: record.claimNumber,
        });

        const billBreakdown = [];
        if (record.pharmacyAmount) {
          billBreakdown.push({
            departmentCategory: DepartmentCategory.PHARMACY,
            amount: record.pharmacyAmount,
            description: "Pharmacy charges",
          });
        }
        if (record.laboratoryAmount) {
          billBreakdown.push({
            departmentCategory: DepartmentCategory.LABORATORY,
            amount: record.laboratoryAmount,
            description: "Laboratory charges",
          });
        }
        if (record.radiologyAmount) {
          billBreakdown.push({
            departmentCategory: DepartmentCategory.RADIOLOGY,
            amount: record.radiologyAmount,
            description: "Radiology charges",
          });
        }
        if (record.roomChargesAmount) {
          billBreakdown.push({
            departmentCategory: DepartmentCategory.ROOM_CHARGES,
            amount: record.roomChargesAmount,
            description: "Room charges",
          });
        }
        if (record.doctorFeesAmount) {
          billBreakdown.push({
            departmentCategory: DepartmentCategory.DOCTOR_FEES,
            amount: record.doctorFeesAmount,
            description: "Doctor fees",
          });
        }
        if (record.otChargesAmount) {
          billBreakdown.push({
            departmentCategory: DepartmentCategory.OT_CHARGES,
            amount: record.otChargesAmount,
            description: "OT charges",
          });
        }
        if (record.consumablesAmount) {
          billBreakdown.push({
            departmentCategory: DepartmentCategory.CONSUMABLES,
            amount: record.consumablesAmount,
            description: "Consumables charges",
          });
        }
        if (record.otherAmount) {
          billBreakdown.push({
            departmentCategory: DepartmentCategory.OTHER,
            amount: record.otherAmount,
            description: "Other charges",
          });
        }

        const claimData = {
          claimNumber: record.claimNumber,
          type: record.claimType,
          status: record.claimStatus,
          insuranceCompanyId: dbInsuranceCompany?._id,
          insurerId: record.insurerId,
          patientId: patient.patientId,
          hospitalId: new mongoose.Types.ObjectId(), // Stub or real ID if applicable
          departmentId: dbDepartment?._id,
          doctorId: dbDoctor?._id,
          totalClaimAmount: record.totalClaimAmount,
          tdsAmount: record.tdsAmount || 0,
          deductions: record.deductions || 0,
          hospitalDiscount: record.hospitalDiscount || 0,
          depositAmount: record.depositAmount || 0,
          refundAmount: record.refundAmount || 0,
          remarks: record.remarks || [],
          createdBy: adminUser?._id,
          updatedBy: adminUser?._id,
          billBreakdown,
        };

        let savedClaimId: mongoose.Types.ObjectId;
        const parsedDate = record.claimDate
          ? new Date(record.claimDate)
          : undefined;

        if (claim) {
          // Update existing claim record
          await ClaimModel.findByIdAndUpdate(claim._id, claimData);
          savedClaimId = claim._id;

          if (parsedDate) {
            await ClaimModel.findByIdAndUpdate(
              claim._id,
              { createdAt: parsedDate, updatedAt: parsedDate },
              { timestamps: false }
            );
          }
          logger.info(`Claim ${record.claimNumber} updated.`);
        } else {
          // Create new claim record
          const createdClaim = new ClaimModel(claimData);
          if (parsedDate) {
            createdClaim.createdAt = parsedDate;
            createdClaim.updatedAt = parsedDate;
          }
          await createdClaim.save({ timestamps: false });
          savedClaimId = createdClaim._id;
          logger.info(`Claim ${record.claimNumber} created.`);
        }

        // 3. Seed/Update Claim Status History to make alerts work properly
        await ClaimStatusHistoryModel.deleteMany({ claimId: savedClaimId });
        const historyDoc = new ClaimStatusHistoryModel({
          claimId: savedClaimId,
          fromStatus: ClaimStatus.DRAFT,
          toStatus: record.claimStatus,
          effectiveAt: parsedDate || new Date(),
          remarks: "Seeded past record status history",
          changedBy: adminUser?._id,
        });
        if (parsedDate) {
          historyDoc.createdAt = parsedDate;
          historyDoc.updatedAt = parsedDate;
        }
        await historyDoc.save({ timestamps: false });
        logger.info(
          `ClaimStatusHistory seeded for claim ${record.claimNumber}.`
        );

        // 4. Handle Settlement if status is SETTLED
        if (record.claimStatus === ClaimStatus.SETTLED) {
          const approvedAmount = record.totalClaimAmount;
          const hospitalDiscount = record.hospitalDiscount || 0;
          const deductions = record.deductions || 0;
          const tds = record.tdsAmount || 0;
          const netPayable = Math.max(
            0,
            approvedAmount - hospitalDiscount - deductions - tds
          );

          const departmentBreakdown = [];
          if (record.pharmacyAmount) {
            departmentBreakdown.push({
              departmentCategory: DepartmentCategory.PHARMACY,
              claimedAmount: record.pharmacyAmount,
              approvedAmount: record.pharmacyAmount,
              deduction: 0,
              discountPercent: 0,
              discountAmount: 0,
              netAmount: record.pharmacyAmount,
            });
          }
          if (record.laboratoryAmount) {
            departmentBreakdown.push({
              departmentCategory: DepartmentCategory.LABORATORY,
              claimedAmount: record.laboratoryAmount,
              approvedAmount: record.laboratoryAmount,
              deduction: 0,
              discountPercent: 0,
              discountAmount: 0,
              netAmount: record.laboratoryAmount,
            });
          }
          if (record.radiologyAmount) {
            departmentBreakdown.push({
              departmentCategory: DepartmentCategory.RADIOLOGY,
              claimedAmount: record.radiologyAmount,
              approvedAmount: record.radiologyAmount,
              deduction: 0,
              discountPercent: 0,
              discountAmount: 0,
              netAmount: record.radiologyAmount,
            });
          }
          if (record.roomChargesAmount) {
            departmentBreakdown.push({
              departmentCategory: DepartmentCategory.ROOM_CHARGES,
              claimedAmount: record.roomChargesAmount,
              approvedAmount: record.roomChargesAmount,
              deduction: 0,
              discountPercent: 0,
              discountAmount: 0,
              netAmount: record.roomChargesAmount,
            });
          }
          if (record.doctorFeesAmount) {
            departmentBreakdown.push({
              departmentCategory: DepartmentCategory.DOCTOR_FEES,
              claimedAmount: record.doctorFeesAmount,
              approvedAmount: record.doctorFeesAmount,
              deduction: 0,
              discountPercent: 0,
              discountAmount: 0,
              netAmount: record.doctorFeesAmount,
            });
          }
          if (record.otChargesAmount) {
            departmentBreakdown.push({
              departmentCategory: DepartmentCategory.OT_CHARGES,
              claimedAmount: record.otChargesAmount,
              approvedAmount: record.otChargesAmount,
              deduction: 0,
              discountPercent: 0,
              discountAmount: 0,
              netAmount: record.otChargesAmount,
            });
          }
          if (record.consumablesAmount) {
            departmentBreakdown.push({
              departmentCategory: DepartmentCategory.CONSUMABLES,
              claimedAmount: record.consumablesAmount,
              approvedAmount: record.consumablesAmount,
              deduction: 0,
              discountPercent: 0,
              discountAmount: 0,
              netAmount: record.consumablesAmount,
            });
          }
          if (record.otherAmount) {
            departmentBreakdown.push({
              departmentCategory: DepartmentCategory.OTHER,
              claimedAmount: record.otherAmount,
              approvedAmount: record.otherAmount,
              deduction: 0,
              discountPercent: 0,
              discountAmount: 0,
              netAmount: record.otherAmount,
            });
          }

          const settlementData = {
            claimId: savedClaimId,
            approvedAmount,
            hospitalDiscount,
            deductions,
            tds,
            netPayable,
            settlementMethod: SettlementMethod.PORTAL,
            settlementDate: parsedDate || new Date(),
            settledBy: adminUser?._id || new mongoose.Types.ObjectId(),
            departmentBreakdown,
          };

          const settlementDoc = await SettlementModel.findOne({
            claimId: savedClaimId,
          });
          if (settlementDoc) {
            await SettlementModel.findByIdAndUpdate(
              settlementDoc._id,
              settlementData,
              { timestamps: false }
            );
            if (parsedDate) {
              await SettlementModel.findByIdAndUpdate(
                settlementDoc._id,
                { createdAt: parsedDate, updatedAt: parsedDate },
                { timestamps: false }
              );
            }
          } else {
            const newSettlement = new SettlementModel(settlementData);
            if (parsedDate) {
              newSettlement.createdAt = parsedDate;
              newSettlement.updatedAt = parsedDate;
            }
            await newSettlement.save({ timestamps: false });
          }
          logger.info(
            `Settlement record created/updated for claim ${record.claimNumber}.`
          );
        } else {
          // If status is not SETTLED, clean up any existing settlement record
          await SettlementModel.deleteOne({ claimId: savedClaimId });
        }

        // 5. Handle Deposit if depositAmount > 0 or refundAmount > 0
        if (
          (record.depositAmount && record.depositAmount > 0) ||
          (record.refundAmount && record.refundAmount > 0)
        ) {
          const isCompleted =
            record.claimStatus === ClaimStatus.DEPOSIT_RETURNED ||
            record.claimStatus === ClaimStatus.CLOSED;
          const depositData = {
            claimId: savedClaimId,
            collectedAmount: record.depositAmount || 0,
            refundAmount: record.refundAmount || 0,
            refundStatus: isCompleted
              ? RefundStatus.COMPLETED
              : RefundStatus.PENDING,
          };

          const depositDoc = await DepositModel.findOne({
            claimId: savedClaimId,
          });
          if (depositDoc) {
            await DepositModel.findByIdAndUpdate(depositDoc._id, depositData, {
              timestamps: false,
            });
            if (parsedDate) {
              await DepositModel.findByIdAndUpdate(
                depositDoc._id,
                { createdAt: parsedDate, updatedAt: parsedDate },
                { timestamps: false }
              );
            }
          } else {
            const newDeposit = new DepositModel(depositData);
            if (parsedDate) {
              newDeposit.createdAt = parsedDate;
              newDeposit.updatedAt = parsedDate;
            }
            await newDeposit.save({ timestamps: false });
          }
          logger.info(
            `Deposit record created/updated for claim ${record.claimNumber}.`
          );
        } else {
          await DepositModel.deleteOne({ claimId: savedClaimId });
        }

        successCount++;
      } catch (innerError: any) {
        logger.error(
          `Failed to seed record for patient "${record.patientName}" / claim "${record.claimNumber}": ${innerError.message}`
        );
      }
    }

    logger.info(
      `Successfully processed ${successCount}/${pastRecords.length} records.`
    );
  } catch (error) {
    logger.error(error, "Failed to run past records seeder");
  } finally {
    await mongoose.disconnect();
    logger.info("Database disconnected.");
  }
};

runSeeder();
