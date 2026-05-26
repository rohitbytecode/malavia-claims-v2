import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { connectDatabase } from "@/config/db.js";
import { logger } from "@/config/logger.js";
import { UserModel } from "@/modules/users/schema/user.schema.js";
import { Roles } from "@/core/enums/roles.enum.js";
import { DepartmentModel } from "@/modules/departments/schema/department.schema.js";
import { InsuranceCompanyModel } from "@/modules/insurance-companies/schema/insurance-company.schema.js";
import { PatientModel } from "@/modules/patients/schema/patient.schema.js";
import { DoctorModel } from "@/modules/doctors/schema/doctor.schema.js";
import { ClaimModel } from "@/modules/claims/schema/claim.schema.js";
import { ClaimStatus } from "@/modules/claims/constant/claim-status.enum.js";
import { ClaimType } from "@/modules/claims/constant/claim-type.enum.js";
import { SettlementModel } from "@/modules/settlements/schema/settlement.schema.js";
import { SettlementMethod } from "@/modules/settlements/constant/settlement-method.enum.js";
import { DepositModel } from "@/modules/deposits/schema/deposit.schema.js";
import { RefundStatus } from "@/modules/deposits/constant/refund-status.enum.js";
import { AlertModel } from "@/modules/alerts/schema/alert.schema.js";
import { AlertType } from "@/modules/alerts/constant/alert-type.enum.js";
import { AlertSeverity } from "@/modules/alerts/constant/alert-severity.enum.js";

const runSeeders = async () => {
  try {
    await connectDatabase();
    logger.info("Database connected. Starting seed...");

    try {
      await UserModel.collection.dropIndex("email_1");
      logger.info("Dropped old email unique index successfully.");
    } catch (e: any) {
      if (e.codeName !== "IndexNotFound") {
        logger.warn("Could not drop email_1 index or it does not exist.");
      }
    }

    // Clear existing users to start clean with username schema
    await UserModel.deleteMany({});
    logger.info("Cleared existing users.");

    // 1. Seed Admin User
    const adminExists = await UserModel.findOne({ username: "admin" });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("Admin@123!", 10);
      await UserModel.create({
        fullName: "System Admin",
        username: "admin",
        password: hashedPassword,
        role: Roles.ADMIN,
        isActive: true,
      });
      logger.info("Default Admin User created.");
    } else {
      logger.info("Admin User already exists.");
    }

    const superAdminExists = await UserModel.findOne({
      username: "superadmin",
    });
    if (!superAdminExists) {
      const hashedPassword = await bcrypt.hash("SuperAdmin@123!", 10);
      await UserModel.create({
        fullName: "Super Admin",
        username: "superadmin",
        password: hashedPassword,
        role: Roles.SUPER_ADMIN,
        isActive: true,
      });
      logger.info("Default Super Admin User created.");
    } else {
      logger.info("Super Admin User already exists.");
    }

    const pharmacistExists = await UserModel.findOne({
      username: "pharmacist",
    });
    if (!pharmacistExists) {
      const hashedPassword = await bcrypt.hash("Pharmacist@123!", 10);
      await UserModel.create({
        fullName: "Pharmacy Vendor Admin",
        username: "pharmacist",
        password: hashedPassword,
        role: Roles.PHARMACIST,
        isActive: true,
      });
      logger.info("Default Pharmacist User created.");
    } else {
      logger.info("Pharmacist User already exists.");
    }

    // 2. Seed Departments
    const departments = [
      "Cardiology",
      "Neurology",
      "Orthopedics",
      "General Surgery",
    ];
    for (const name of departments) {
      const exists = await DepartmentModel.findOne({ name });
      if (!exists) {
        await DepartmentModel.create({
          name,
          code: name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .toUpperCase(),
          description: `Department of ${name}`,
          isActive: true,
        });
      }
    }
    logger.info("Departments seeded.");

    // 3. Seed Insurance Companies
    const insurances = ["HDFC Ergo", "Star Health", "ICICI Lombard"];
    for (const name of insurances) {
      const exists = await InsuranceCompanyModel.findOne({ name });
      if (!exists) {
        await InsuranceCompanyModel.create({
          name,
          email: `${name.toLowerCase().replace(" ", "")}@insurance.local`,
          phone: "18001234567",
          contactPerson: "Insurance Agent",
          isActive: true,
        });
      }
    }
    logger.info("Insurance Companies seeded.");

    // 4. Seed Patients
    const hdfc = await InsuranceCompanyModel.findOne({ name: "HDFC Ergo" });
    const star = await InsuranceCompanyModel.findOne({ name: "Star Health" });

    const patients = [
      {
        patientId: "PAT-001",
        name: "John Doe",
        insurerId: "INS-776655",
        insuranceCompanyId: hdfc?._id,
      },
      {
        patientId: "PAT-002",
        name: "Jane Smith",
        insurerId: "INS-443322",
        insuranceCompanyId: star?._id,
      },
      {
        patientId: "PAT-003",
        name: "Robert Johnson",
        insurerId: undefined,
        insuranceCompanyId: undefined,
      },
    ];

    for (const p of patients) {
      const exists = await PatientModel.findOne({ patientId: p.patientId });
      if (!exists) {
        await PatientModel.create({
          patientId: p.patientId,
          name: p.name,
          insurerId: p.insurerId,
          insuranceCompanyId: p.insuranceCompanyId,
          isActive: true,
        });
      }
    }
    logger.info("Patients seeded.");

    // 5. Seed Doctors
    const cardiology = await DepartmentModel.findOne({ name: "Cardiology" });
    const neurology = await DepartmentModel.findOne({ name: "Neurology" });

    let doc1: any, doc2: any;
    if (cardiology && neurology) {
      doc1 = await DoctorModel.findOne({ name: "Dr. Alice Smith" });
      if (!doc1) {
        doc1 = await DoctorModel.create({
          name: "Dr. Alice Smith",
          departmentId: cardiology._id,
          isActive: true,
        });
      }
      doc2 = await DoctorModel.findOne({ name: "Dr. Bob Johnson" });
      if (!doc2) {
        doc2 = await DoctorModel.create({
          name: "Dr. Bob Johnson",
          departmentId: neurology._id,
          isActive: true,
        });
      }
      logger.info("Doctors seeded.");
    }

    // 6. Seed Claims, Settlements, Deposits, and Alerts
    const claimsCount = await ClaimModel.countDocuments();
    if (
      claimsCount === 0 &&
      hdfc &&
      star &&
      cardiology &&
      neurology &&
      doc1 &&
      doc2
    ) {
      const pat1 = await PatientModel.findOne({ patientId: "PAT-001" });
      const pat2 = await PatientModel.findOne({ patientId: "PAT-002" });
      const pat3 = await PatientModel.findOne({ patientId: "PAT-003" });

      const adminUser = await UserModel.findOne({ role: Roles.ADMIN });

      const claim1 = await ClaimModel.create({
        claimNumber: "CLM-2026-001",
        type: ClaimType.CASHLESS,
        status: ClaimStatus.PREAUTH_PENDING,
        patientId: pat1?.patientId || "PAT-001",
        insuranceCompanyId: hdfc._id,
        hospitalId: new mongoose.Types.ObjectId(),
        departmentId: cardiology._id,
        doctorId: doc1._id,
        totalClaimAmount: 150000,
        createdBy: adminUser?._id,
      });

      const claim2 = await ClaimModel.create({
        claimNumber: "CLM-2026-002",
        type: ClaimType.CASHLESS,
        status: ClaimStatus.FINAL_APPROVAL_PENDING,
        patientId: pat2?.patientId || "PAT-002",
        insuranceCompanyId: star._id,
        hospitalId: new mongoose.Types.ObjectId(),
        departmentId: neurology._id,
        doctorId: doc2._id,
        totalClaimAmount: 75000,
        createdBy: adminUser?._id,
      });

      const claim3 = await ClaimModel.create({
        claimNumber: "CLM-2026-003",
        type: ClaimType.CASHLESS,
        status: ClaimStatus.SETTLEMENT_PENDING,
        patientId: pat1?.patientId || "PAT-001",
        insuranceCompanyId: hdfc._id,
        hospitalId: new mongoose.Types.ObjectId(),
        departmentId: cardiology._id,
        doctorId: doc1._id,
        totalClaimAmount: 120000,
        createdBy: adminUser?._id,
      });

      const claim4 = await ClaimModel.create({
        claimNumber: "CLM-2026-004",
        type: ClaimType.CASHLESS,
        status: ClaimStatus.SETTLED,
        patientId: pat2?.patientId || "PAT-002",
        insuranceCompanyId: star._id,
        hospitalId: new mongoose.Types.ObjectId(),
        departmentId: neurology._id,
        doctorId: doc2._id,
        totalClaimAmount: 95000,
        createdBy: adminUser?._id,
      });

      const claim5 = await ClaimModel.create({
        claimNumber: "CLM-2026-005",
        type: ClaimType.REIMBURSEMENT,
        status: ClaimStatus.DRAFT,
        patientId: pat3?.patientId || "PAT-003",
        hospitalId: new mongoose.Types.ObjectId(),
        departmentId: cardiology._id,
        doctorId: doc1._id,
        totalClaimAmount: 32000,
        createdBy: adminUser?._id,
      });

      // Seed settlements
      await SettlementModel.create({
        claimId: claim4._id,
        approvedAmount: 95000,
        hospitalDiscount: 5000,
        deductions: 2000,
        tds: 950,
        netPayable: 87050,
        settlementMethod: SettlementMethod.PORTAL,
        settlementDate: new Date(),
        settledBy: adminUser?._id || new mongoose.Types.ObjectId(),
      });

      // Seed deposits
      await DepositModel.create({
        claimId: claim3._id,
        collectedAmount: 10000,
        refundAmount: 0,
        refundStatus: RefundStatus.PENDING,
      });

      // Seed active alerts
      await AlertModel.create({
        claimId: claim1._id,
        type: AlertType.PREAUTH_PENDING,
        severity: AlertSeverity.MEDIUM,
        message: "Preauth has been pending response for more than 24 hours.",
        resolved: false,
      });

      await AlertModel.create({
        claimId: claim3._id,
        type: AlertType.SETTLEMENT_PENDING,
        severity: AlertSeverity.HIGH,
        message: "Settlement pending for claim CLM-2026-003.",
        resolved: false,
      });

      logger.info(
        "Claims, Settlements, Deposits, and Alerts seeded successfully."
      );
    }

    logger.info("Seeding completed successfully.");
    process.exit(0);
  } catch (error) {
    logger.error(error, "Seeding failed");
    process.exit(1);
  }
};

runSeeders();
