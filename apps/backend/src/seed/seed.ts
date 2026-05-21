import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { connectDatabase } from "@/config/db.js";
import { logger } from "@/config/logger.js";
import { UserModel } from "@/modules/users/schema/user.schema.js";
import { Roles } from "@/core/enums/roles.enum.js";
import { DepartmentModel } from "@/modules/departments/schema/department.schema.js";
import { InsuranceCompanyModel } from "@/modules/insurance-companies/schema/insurance-company.schema.js";
import { PatientModel } from "@/modules/patients/schema/patient.schema.js";

const runSeeders = async () => {
  try {
    await connectDatabase();
    logger.info("Database connected. Starting seed...");

    // 1. Seed Admin User
    const adminExists = await UserModel.findOne({ email: "admin@hicms.local" });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("Admin@123!", 10);
      await UserModel.create({
        fullName: "System Admin",
        email: "admin@hicms.local",
        password: hashedPassword,
        role: Roles.ADMIN,
        isActive: true,
      });
      logger.info("Default Admin User created.");
    } else {
      logger.info("Admin User already exists.");
    }

    const superAdminExists = await UserModel.findOne({
      email: "superadmin@hicms.local",
    });
    if (!superAdminExists) {
      const hashedPassword = await bcrypt.hash("SuperAdmin@123!", 10);
      await UserModel.create({
        fullName: "Super Admin",
        email: "superadmin@hicms.local",
        password: hashedPassword,
        role: Roles.SUPER_ADMIN,
        isActive: true,
      });
      logger.info("Default Super Admin User created.");
    } else {
      logger.info("Super Admin User already exists.");
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

    logger.info("Seeding completed successfully.");
    process.exit(0);
  } catch (error) {
    logger.error(error, "Seeding failed");
    process.exit(1);
  }
};

runSeeders();
