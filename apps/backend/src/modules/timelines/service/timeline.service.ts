import { ClaimStatusHistoryModel } from "@/modules/claims/schema/claim-status-history.schema.js";
import { CommunicationModel } from "@/modules/communications/schema/communication.schema.js";
import { DocumentModel } from "@/modules/documents/schema/document.schema.js";
import { SettlementModel } from "@/modules/settlements/schema/settlement.schema.js";
import { AlertModel } from "@/modules/alerts/schema/alert.schema.js";
import mongoose from "mongoose";

export class TimelineService {
  static async getClaimTimeline(claimId: string) {
    const objectId = new mongoose.Types.ObjectId(claimId);

    const [statusHistory, communications, documents, settlements, alerts] =
      await Promise.all([
        ClaimStatusHistoryModel.find({ claimId: objectId }).lean(),
        CommunicationModel.find({ entityId: objectId }).lean(),
        DocumentModel.find({ claimId: objectId }).lean(),
        SettlementModel.find({ claimId: objectId }).lean(),
        AlertModel.find({ claimId: objectId }).lean(),
      ]);

    const timeline: any[] = [];

    statusHistory.forEach((item) => {
      timeline.push({
        type: "STATUS_CHANGE",
        title: `Status changed to ${item.toStatus}`,
        description: item.remarks || "No remarks provided",
        createdAt: item.effectiveAt,
        createdBy: item.changedBy,
      });
    });

    communications.forEach((item) => {
      timeline.push({
        type: "COMMUNICATION",
        title: `Communication added (${item.type})`,
        description: item.subject || "No subject",
        createdAt: item.createdAt,
        createdBy: item.senderId,
      });
    });

    documents.forEach((item) => {
      timeline.push({
        type: "DOCUMENT",
        title: `Document uploaded (${item.documentType})`,
        description: item.remarks || item.originalName || "No description",
        attachmentName: item.originalName,
        remarks: item.remarks || "No remarks provided",
        createdAt: item.createdAt,
        createdBy: item.uploadedBy,
      });
    });

    settlements.forEach((item) => {
      timeline.push({
        type: "SETTLEMENT",
        title: "Settlement Created",
        description: `Approved: ${item.approvedAmount}, Net: ${item.netPayable}`,
        createdAt: item.createdAt,
        createdBy: item.settledBy,
      });
    });

    alerts.forEach((item) => {
      timeline.push({
        type: "ALERT",
        title: `Alert: ${item.type} (${item.severity})`,
        description: item.message,
        createdAt: item.createdAt,
      });
    });

    return timeline.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }
}
