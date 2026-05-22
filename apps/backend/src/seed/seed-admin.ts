import mongoose from "mongoose";
import { UserModel } from "../modules/users/schema/user.schema.js";
import { Roles } from "../core/enums/roles.enum.js";
import { logger } from "../config/logger.js";
import { connectDatabase } from "../config/db.js";
import bcrypt from "bcrypt";

const seedAdmin = async () => {
  try {
    await connectDatabase();

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
  } catch (error) {
    logger.error(error, "Error seeding admin");
  } finally {
    await mongoose.disconnect();
    logger.info("Database disconnected.");
  }
};

seedAdmin();
