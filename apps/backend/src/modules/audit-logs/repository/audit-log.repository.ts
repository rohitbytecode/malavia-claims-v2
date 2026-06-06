import { Types } from "mongoose";
import { AuditLogModel } from "../schema/audit-log.schema.js";
import { AuditModule } from "../constant/audit-module.enum.js";
import { AuditAction } from "../constant/audit-action.enum.js";

interface CreateLogPayload {
  module: AuditModule;
  entityId: string | Types.ObjectId;
  action: AuditAction;
  performedBy: string | Types.ObjectId;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
}

export class AuditLogRepository {
  static async createLog(payload: CreateLogPayload) {
    return AuditLogModel.create({
      ...payload,
      entityId: new Types.ObjectId(payload.entityId),
      performedBy: new Types.ObjectId(payload.performedBy),
    });
  }

  static async getLogsByEntity(entityId: string, page: number, limit: number) {
    if (!Types.ObjectId.isValid(entityId)) {
      return [];
    }

    return AuditLogModel.find({ entityId: new Types.ObjectId(entityId) })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("performedBy", "username fullName")
      .lean();
  }

  static async getAllLogs(
    filters: {
      module?: AuditModule;
      action?: AuditAction;
      performedBy?: string;
      search?: string;
    },
    page: number,
    limit: number
  ) {
    const query: Record<string, any> = {};

    if (filters.module) query.module = filters.module;
    if (filters.action) query.action = filters.action;
    if (filters.performedBy && Types.ObjectId.isValid(filters.performedBy)) {
      query.performedBy = new Types.ObjectId(filters.performedBy);
    }
    if (filters.search) {
      query.entityId = Types.ObjectId.isValid(filters.search)
        ? new Types.ObjectId(filters.search)
        : undefined;
    }

    const [items, total] = await Promise.all([
      AuditLogModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("performedBy", "username fullName")
        .lean(),
      AuditLogModel.countDocuments(query),
    ]);

    return {
      items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  static async getLogsByModule(
    module: AuditModule,
    page: number,
    limit: number
  ) {
    return AuditLogModel.find({ module })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("performedBy", "firstName lastName email")
      .lean();
  }
}
