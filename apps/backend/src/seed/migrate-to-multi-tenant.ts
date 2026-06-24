/**
 * Migration Script: Backfill organizationId on all existing documents
 *
 * This script:
 *  1. Creates a default Organization for the existing single-tenant data
 *  2. Backfills organizationId on ALL collections
 *  3. Is idempotent — safe to run multiple times
 *
 * Usage:
 *   pnpm -C apps/backend tsx -r tsconfig-paths/register src/seed/migrate-to-multi-tenant.ts
 */

import dotenv from "dotenv";
dotenv.config({ override: true });

import mongoose from "mongoose";

// Import all models to ensure they are registered
import { OrganizationModel } from "@/modules/organizations/schema/organization.schema.js";
import { UserModel } from "@/modules/users/schema/user.schema.js";
import { ClaimModel } from "@/modules/claims/schema/claim.schema.js";
import { ClaimStatusHistoryModel } from "@/modules/claims/schema/claim-status-history.schema.js";
import { PatientModel } from "@/modules/patients/schema/patient.schema.js";
import { DepartmentModel } from "@/modules/departments/schema/department.schema.js";
import { InsuranceCompanyModel } from "@/modules/insurance-companies/schema/insurance-company.schema.js";
import { SettlementModel } from "@/modules/settlements/schema/settlement.schema.js";
import { DepositModel } from "@/modules/deposits/schema/deposit.schema.js";
import { AlertModel } from "@/modules/alerts/schema/alert.schema.js";
import { DocumentModel } from "@/modules/documents/schema/document.schema.js";
import { CommunicationModel } from "@/modules/communications/schema/communication.schema.js";
import { AllocationModel } from "@/modules/department-allocations/schema/allocation.schema.js";
import { AuditLogModel } from "@/modules/audit-logs/schema/audit-log.schema.js";
import { NotificationModel } from "@/modules/notifications/schema/notification.schema.js";
import { PayerContractModel } from "@/modules/payer-contracts/schema/payer-contract.schema.js";
import { AdvancedNotificationModel } from "@/modules/advanced-notifications/schema/advanced-notification.schema.js";
import { DoctorModel } from "@/modules/doctors/schema/doctor.schema.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/hicms";

async function migrate() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected\n");

  // Step 1: Create or find the default organization
  let defaultOrg = await OrganizationModel.findOne({ slug: "default" });

  if (!defaultOrg) {
    console.log("📦 Creating default organization...");
    defaultOrg = await OrganizationModel.create({
      name: "Malavia Hospital",
      slug: "default",
      plan: "ENTERPRISE",
      isActive: true,
      settings: {
        timezone: "Asia/Kolkata",
        currency: "INR",
      },
    });
    console.log(`   Created org: ${defaultOrg._id} (${defaultOrg.name})\n`);
  } else {
    console.log(`   Using existing org: ${defaultOrg._id} (${defaultOrg.name})\n`);
  }

  const orgId = defaultOrg._id;

  // Step 2: Backfill organizationId on all collections
  const collections = [
    { name: "User", model: UserModel },
    { name: "Claim", model: ClaimModel },
    { name: "ClaimStatusHistory", model: ClaimStatusHistoryModel },
    { name: "Patient", model: PatientModel },
    { name: "Department", model: DepartmentModel },
    { name: "Doctor", model: DoctorModel },
    { name: "InsuranceCompany", model: InsuranceCompanyModel },
    { name: "Settlement", model: SettlementModel },
    { name: "Deposit", model: DepositModel },
    { name: "Alert", model: AlertModel },
    { name: "Document", model: DocumentModel },
    { name: "Communication", model: CommunicationModel },
    { name: "Allocation", model: AllocationModel },
    { name: "AuditLog", model: AuditLogModel },
    { name: "Notification", model: NotificationModel },
    { name: "PayerContract", model: PayerContractModel },
    { name: "AdvancedNotification", model: AdvancedNotificationModel },
  ];

  for (const { name, model } of collections) {
    const filter = {
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null },
      ],
    };

    const count = await (model as any).countDocuments(filter);

    if (count === 0) {
      console.log(`   ✅ ${name}: already migrated (0 docs without orgId)`);
      continue;
    }

    const result = await (model as any).updateMany(filter, {
      $set: { organizationId: orgId },
    });

    console.log(`   🔄 ${name}: backfilled ${result.modifiedCount}/${count} documents`);
  }

  // Step 3: Drop old unique indexes that are no longer valid
  console.log("\n🗑️  Dropping old simple unique indexes (if they exist)...");

  const indexDrops = [
    { model: UserModel, index: "username_1" },
    { model: PatientModel, index: "patientId_1" },
    { model: DepartmentModel, index: "name_1" },
    { model: DepartmentModel, index: "code_1" },
    { model: InsuranceCompanyModel, index: "name_1" },
  ];

  for (const { model, index } of indexDrops) {
    try {
      await model.collection.dropIndex(index);
      console.log(`   Dropped index: ${model.modelName}.${index}`);
    } catch (err: any) {
      if (err.code === 27 || err.codeName === "IndexNotFound") {
        console.log(`   Index already gone: ${model.modelName}.${index}`);
      } else {
        console.warn(`   ⚠️  Could not drop ${model.modelName}.${index}:`, err.message);
      }
    }
  }

  console.log("\n🏗️  Ensuring new compound indexes...");
  await UserModel.ensureIndexes();
  await PatientModel.ensureIndexes();
  await DepartmentModel.ensureIndexes();
  await InsuranceCompanyModel.ensureIndexes();
  await ClaimModel.ensureIndexes();

  console.log("\n🎉 Migration complete!");
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
