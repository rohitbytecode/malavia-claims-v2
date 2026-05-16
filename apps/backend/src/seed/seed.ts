import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { connectDatabase } from "@/config/db.js";
import { logger } from "@/config/logger.js";
import { UserModel } from "@/modules/users/schema/user.schema.js";
import { Roles } from "@/core/enums/roles.enum.js";
import { DepartmentModel } from "@/modules/departments/schema/department.schema.js";
import { InsuranceCompanyModel } from "@/modules/insurance-companies/schema/insurance-company.schema.js";

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

    // 2. Seed Departments
    const departments = ["Cardiology", "Neurology", "Orthopedics", "General Surgery"];
    for (const name of departments) {
      const exists = await DepartmentModel.findOne({ name });
      if (!exists) {
        await DepartmentModel.create({
          name,
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

    logger.info("Seeding completed successfully.");
    process.exit(0);
  } catch (error) {
    logger.error(error, "Seeding failed");
    process.exit(1);
  }
};

runSeeders();
