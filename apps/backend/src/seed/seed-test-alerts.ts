import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import { logger } from "../config/logger.js";
import { ClaimModel } from "../modules/claims/schema/claim.schema.js";
import { ClaimStatus } from "../modules/claims/constant/claim-status.enum.js";
import { ClaimType } from "../modules/claims/constant/claim-type.enum.js";
import { DepositModel } from "../modules/deposits/schema/deposit.schema.js";
import { RefundStatus } from "../modules/deposits/constant/refund-status.enum.js";
import { AlertModel } from "../modules/alerts/schema/alert.schema.js";
import { DepartmentModel } from "../modules/departments/schema/department.schema.js";
import { InsuranceCompanyModel } from "../modules/insurance-companies/schema/insurance-company.schema.js";
import { PatientModel } from "../modules/patients/schema/patient.schema.js";
import { DoctorModel } from "../modules/doctors/schema/doctor.schema.js";
import { UserModel } from "../modules/users/schema/user.schema.js";
import { Roles } from "../core/enums/roles.enum.js";

import {
  checkCourierDelays,
  checkPendingSettlements,
  checkPendingRefunds,
} from "../jobs/claim-check.job.js";

const seedTestAlertsData = async () => {
  try {
    await connectDatabase();
    logger.info(
      "Database connected. Cleaning existing alerts and preparing test data..."
    );

    // 1. Clear existing alerts to start clean
    await AlertModel.deleteMany({});
    logger.info("Cleared existing alerts.");

    // Get needed dependencies
    const hdfc = await InsuranceCompanyModel.findOne({ name: "HDFC Ergo" });
    const cardiology = await DepartmentModel.findOne({ name: "Cardiology" });
    const doctor = await DoctorModel.findOne({ name: "Dr. Alice Smith" });
    const patient = await PatientModel.findOne({ patientId: "PAT-001" });
    const adminUser = await UserModel.findOne({ role: Roles.ADMIN });

    if (!hdfc || !cardiology || !doctor || !patient || !adminUser) {
      logger.error(
        "Required seed data (insurers, patients, doctors, departments, users) is missing. Please run 'npm run seed' first."
      );
      process.exit(1);
    }

    // Define dates for backdating
    const now = new Date();
    const date50DaysAgo = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000);
    const date65DaysAgo = new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000);

    // 2. Clear previous test claims to prevent duplicate claimNumber errors
    await ClaimModel.deleteMany({
      claimNumber: {
        $in: [
          "TEST-CLM-50DAYS",
          "TEST-CLM-65DAYS",
          "TEST-CLM-SETTLE",
          "TEST-CLM-REFUND",
        ],
      },
    });

    // 3. Create a claim backdated by 50 days (triggers High Courier Delay alert)
    const claim50 = await ClaimModel.create({
      claimNumber: "TEST-CLM-50DAYS",
      type: ClaimType.CASHLESS,
      status: ClaimStatus.PREAUTH_PENDING,
      patientId: patient.patientId,
      insuranceCompanyId: hdfc._id,
      hospitalId: new mongoose.Types.ObjectId(),
      departmentId: cardiology._id,
      doctorId: doctor._id,
      totalClaimAmount: 120000,
      createdBy: adminUser._id,
    });
    // Set createdAt backdated field bypassing Mongoose timestamps
    await mongoose.connection
      .db!.collection("claims")
      .updateOne({ _id: claim50._id }, { $set: { createdAt: date50DaysAgo } });
    logger.info(
      "Created 50-day-old claim (TEST-CLM-50DAYS) to trigger High Courier Delay."
    );

    // 4. Create a claim backdated by 65 days (triggers Critical Courier Delay alert)
    const claim65 = await ClaimModel.create({
      claimNumber: "TEST-CLM-65DAYS",
      type: ClaimType.CASHLESS,
      status: ClaimStatus.FINAL_APPROVAL_PENDING,
      patientId: patient.patientId,
      insuranceCompanyId: hdfc._id,
      hospitalId: new mongoose.Types.ObjectId(),
      departmentId: cardiology._id,
      doctorId: doctor._id,
      totalClaimAmount: 95000,
      createdBy: adminUser._id,
    });
    // Set createdAt backdated field bypassing Mongoose timestamps
    await mongoose.connection
      .db!.collection("claims")
      .updateOne({ _id: claim65._id }, { $set: { createdAt: date65DaysAgo } });
    logger.info(
      "Created 65-day-old claim (TEST-CLM-65DAYS) to trigger Critical Courier Delay."
    );

    // 5. Create a claim in SETTLEMENT_PENDING status (triggers Settlement Pending alert)
    const claimSettle = await ClaimModel.create({
      claimNumber: "TEST-CLM-SETTLE",
      type: ClaimType.CASHLESS,
      status: ClaimStatus.SETTLEMENT_PENDING,
      patientId: patient.patientId,
      insuranceCompanyId: hdfc._id,
      hospitalId: new mongoose.Types.ObjectId(),
      departmentId: cardiology._id,
      doctorId: doctor._id,
      totalClaimAmount: 180000,
      createdBy: adminUser._id,
    });
    logger.info("Created Settlement Pending claim (TEST-CLM-SETTLE).");

    // 6. Create a claim with a deposit in PENDING refund status (triggers Deposit Mismatch / Refund alert)
    const claimRefund = await ClaimModel.create({
      claimNumber: "TEST-CLM-REFUND",
      type: ClaimType.CASHLESS,
      status: ClaimStatus.CLOSED,
      patientId: patient.patientId,
      insuranceCompanyId: hdfc._id,
      hospitalId: new mongoose.Types.ObjectId(),
      departmentId: cardiology._id,
      doctorId: doctor._id,
      totalClaimAmount: 50000,
      createdBy: adminUser._id,
    });

    // Delete any existing deposit for this claim before creating
    await DepositModel.deleteMany({ claimId: claimRefund._id });
    await DepositModel.create({
      claimId: claimRefund._id,
      collectedAmount: 15000,
      refundAmount: 0,
      refundStatus: RefundStatus.PENDING,
    });
    logger.info(
      "Created Deposit with PENDING refund status for claim TEST-CLM-REFUND."
    );

    // 7. Run the daily claim check jobs to scan database and create alerts
    logger.info("Running alert generation jobs...");
    await checkCourierDelays();
    await checkPendingSettlements();
    await checkPendingRefunds();

    // 8. Output generated alerts
    const alerts = await AlertModel.find({ resolved: false })
      .populate("claimId", "claimNumber status")
      .lean();
    logger.info(`Successfully generated ${alerts.length} active alerts!`);

    console.table(
      alerts.map((a: any) => ({
        Type: a.type,
        Severity: a.severity,
        Message: a.message,
        Claim: a.claimId?.claimNumber || "N/A",
      }))
    );

    logger.info(
      "Testing alerts setup complete. Please refresh your dashboard/alerts page."
    );
    process.exit(0);
  } catch (error) {
    logger.error(error, "Failed to seed test alerts");
    process.exit(1);
  }
};

seedTestAlertsData();
