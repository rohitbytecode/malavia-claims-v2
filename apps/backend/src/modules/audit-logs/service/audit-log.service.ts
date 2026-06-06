import { AuditLogRepository } from "../repository/audit-log.repository.js";
import { AuditModule } from "../constant/audit-module.enum.js";
import { AuditAction } from "../constant/audit-action.enum.js";
import { AppError } from "@/core/errors/AppError.js";

interface LogActionParams {
  module: AuditModule;
  entityId: string;
  action: AuditAction;
  performedBy: string;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
}

export class AuditLogService {
  static async logAction(params: LogActionParams) {
    try {
      await AuditLogRepository.createLog(params);
    } catch (error) {
      // We don't want audit logging failure to crash the main transaction
      console.error("[AuditLogService] Failed to create audit log:", error);
    }
  }

  static async fetchEntityHistory(
    entityId: string,
    page: number = 1,
    limit: number = 20
  ) {
    if (!entityId) {
      throw new AppError("Entity ID is required", 400);
    }

    const logs = await AuditLogRepository.getLogsByEntity(
      entityId,
      page,
      limit
    );
    return logs;
  }

  static async fetchModuleHistory(
    module: AuditModule,
    page: number = 1,
    limit: number = 20
  ) {
    const logs = await AuditLogRepository.getLogsByModule(module, page, limit);
    return logs;
  }

  static async fetchAllLogs(
    filters: {
      module?: AuditModule;
      action?: AuditAction;
      performedBy?: string;
      search?: string;
    },
    page: number = 1,
    limit: number = 20
  ) {
    return AuditLogRepository.getAllLogs(filters, page, limit);
  }
}
