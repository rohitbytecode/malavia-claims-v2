import { Types } from "mongoose";
import { OrganizationModel } from "@/modules/organizations/schema/organization.schema.js";
import { OrganizationDocument } from "@/modules/organizations/types/organization.types.js";

export class OrganizationRepository {
  static async create(payload: Partial<OrganizationDocument>) {
    return OrganizationModel.create(payload);
  }

  static async findById(orgId: string) {
    if (!Types.ObjectId.isValid(orgId)) return null;
    return OrganizationModel.findById(orgId).lean();
  }

  static async findBySlug(slug: string) {
    return OrganizationModel.findOne({
      slug: slug.toLowerCase().trim(),
    }).lean();
  }

  static async list(page = 1, limit = 50) {
    return OrganizationModel.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  static async count(filter: Record<string, unknown> = {}) {
    return OrganizationModel.countDocuments(filter);
  }

  static async update(orgId: string, update: Partial<OrganizationDocument>) {
    if (!Types.ObjectId.isValid(orgId)) return null;
    return OrganizationModel.findByIdAndUpdate(orgId, update, {
      new: true,
    }).lean();
  }

  static async slugExists(slug: string) {
    const count = await OrganizationModel.countDocuments({
      slug: slug.toLowerCase().trim(),
    });
    return count > 0;
  }
}
