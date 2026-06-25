import dotenv from "dotenv";
dotenv.config({ override: true });

import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import { OrganizationModel } from "../modules/organizations/schema/organization.schema.js";
import { UserModel } from "../modules/users/schema/user.schema.js";
import { PatientModel } from "../modules/patients/schema/patient.schema.js";
import { DepartmentModel } from "../modules/departments/schema/department.schema.js";
import { InsuranceCompanyModel } from "../modules/insurance-companies/schema/insurance-company.schema.js";
import { DoctorModel } from "../modules/doctors/schema/doctor.schema.js";
import { ClaimModel } from "../modules/claims/schema/claim.schema.js";
import { ClaimStatus } from "../modules/claims/constant/claim-status.enum.js";
import { ClaimType } from "../modules/claims/constant/claim-type.enum.js";

async function seed() {
  try {
    console.log("🔌 Connecting to database...");
    await connectDatabase();
    console.log("✅ Database connected.");

    // 1. Get or create Organization named "free"
    let org = await OrganizationModel.findOne({ name: "free" });
    if (!org) {
      org = await OrganizationModel.findOne({ slug: "free" });
    }
    if (!org) {
      org = await OrganizationModel.create({
        name: "free",
        slug: "free",
        plan: "FREE",
        isActive: true,
        settings: {
          timezone: "Asia/Kolkata",
          currency: "INR",
        },
      });
      console.log(`Created default organization: ${org.name}`);
    } else {
      console.log(`Using organization: ${org.name} (${org._id})`);
    }

    // 2. Get or create User for organization
    let user = await UserModel.findOne({ organizationId: org._id });
    if (!user) {
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.default.hash("FreeAdmin@123!", 10);
      user = await UserModel.create({
        fullName: "Free Org Admin",
        username: "free_admin",
        password: hashedPassword,
        role: "ADMIN",
        isActive: true,
        organizationId: org._id
      });
      console.log(`Created admin user for organization: ${user.username}`);
    } else {
      console.log(`Using creator user: ${user.username}`);
    }

    // 3. Get or create Department
    let dept = await DepartmentModel.findOne({ organizationId: org._id });
    if (!dept) {
      dept = await DepartmentModel.create({
        name: "General Medicine",
        code: "GM",
        isActive: true,
        organizationId: org._id
      });
      console.log("Created default department");
    }

    // 4. Get or create Doctor
    let doc = await DoctorModel.findOne({ organizationId: org._id });
    if (!doc) {
      doc = await DoctorModel.create({
        name: "Dr. Dave Miller",
        departmentId: dept._id,
        isActive: true,
        organizationId: org._id
      });
      console.log("Created default doctor");
    }

    // 5. Get or create Insurance Company
    let ins = await InsuranceCompanyModel.findOne({ organizationId: org._id });
    if (!ins) {
      ins = await InsuranceCompanyModel.create({
        name: "Universal Health Insurance",
        email: "contact@universalhealth.com",
        phone: "18005550199",
        isActive: true,
        organizationId: org._id
      });
      console.log("Created default insurance company");
    }

    // 6. Get or create Patient
    let patient = await PatientModel.findOne({ organizationId: org._id });
    if (!patient) {
      patient = await PatientModel.create({
        patientId: "PAT-SEED-100",
        name: "Sample Patient",
        insurerId: "INS-99999",
        insuranceCompanyId: ins._id,
        isActive: true,
        organizationId: org._id
      });
      console.log("Created default patient");
    }

    // 7. Seed 100 Claims
    console.log("🌱 Seeding 100 claims...");
    const statuses = Object.values(ClaimStatus);
    const types = Object.values(ClaimType);
    const claimDocs = [];

    for (let i = 1; i <= 100; i++) {
      const claimNumber = `CLM-SEED-${String(i).padStart(3, '0')}-${Date.now().toString().slice(-6)}`;
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const randomType = types[Math.floor(Math.random() * types.length)];
      const randomAmount = Math.floor(Math.random() * 200000) + 5000;

      claimDocs.push({
        claimNumber,
        type: randomType,
        status: randomStatus,
        patientId: patient.patientId,
        insuranceCompanyId: ins._id,
        hospitalId: new mongoose.Types.ObjectId(),
        departmentId: dept._id,
        doctorId: doc._id,
        totalClaimAmount: randomAmount,
        tdsAmount: Math.floor(randomAmount * 0.01),
        deductions: Math.floor(randomAmount * 0.05),
        hospitalDiscount: Math.floor(randomAmount * 0.02),
        depositAmount: Math.floor(randomAmount * 0.1),
        refundAmount: 0,
        remarks: ["Seeded automatically"],
        organizationId: org._id,
        createdBy: user._id,
        updatedBy: user._id,
      });
    }

    await ClaimModel.insertMany(claimDocs);
    console.log("✅ Successfully seeded 100 claims!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
