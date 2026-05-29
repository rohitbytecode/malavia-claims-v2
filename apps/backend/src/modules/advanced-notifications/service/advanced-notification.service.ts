import { ClaimStatus } from "@/modules/claims/constant/claim-status.enum.js";
import { logger } from "@/config/logger.js";
import { AdvancedNotificationRepository } from "../repository/advanced-notification.repository.js";
import { AdvancedNotificationResponse } from "../types/advanced-notification.types.js";
import { SmtpMailService } from "./smtp-mail.service.js";

interface SaveSettingsPayload {
  notificationEmails: {
    email: string;
    isActive: boolean;
  }[];
  isEnabled?: boolean;
  updatedBy?: string;
}

export interface NotificationEmail {
  email: string;
  isActive: boolean;
}

interface ClaimTransitionMailPayload {
  claimId: string;
  claimNumber?: string;
  patientName?: string;
  companyName?: string;
  toStatus: ClaimStatus;
  performedByName?: string;
  remarks?: string;
}

const ADVANCED_NOTIFICATION_STATUSES = new Set<ClaimStatus>([
  ClaimStatus.PREAUTH_APPROVED,
  ClaimStatus.FINAL_APPROVED,
  ClaimStatus.SETTLED,
]);

const STATUS_LABEL: Record<ClaimStatus, string> = {
  [ClaimStatus.DRAFT]: "Draft",
  [ClaimStatus.PREAUTH_PENDING]: "Pre-Auth Pending",
  [ClaimStatus.PREAUTH_APPROVED]: "Pre-Auth Approved",
  [ClaimStatus.PREAUTH_REJECTED]: "Pre-Auth Rejected",
  [ClaimStatus.RECONSIDERATION_PENDING]: "Reconsideration Pending",
  [ClaimStatus.FINAL_APPROVAL_PENDING]: "Final Approval Pending",
  [ClaimStatus.FINAL_APPROVED]: "Final Approved",
  [ClaimStatus.FINAL_REJECTED]: "Final Rejected",
  [ClaimStatus.DOCUMENTS_PENDING]: "Documents Pending",
  [ClaimStatus.SUBMITTED]: "Submitted",
  [ClaimStatus.QUERY_RAISED]: "Query Raised",
  [ClaimStatus.QUERY_RESPONDED]: "Query Responded",
  [ClaimStatus.SETTLEMENT_PENDING]: "Settlement Pending",
  [ClaimStatus.SETTLED]: "Settled",
  [ClaimStatus.DEPOSIT_PENDING]: "Deposit Pending",
  [ClaimStatus.DEPOSIT_RETURNED]: "Deposit Returned",
  [ClaimStatus.CLOSED]: "Closed",
};

function toResponse(settings: any): AdvancedNotificationResponse | null {
  if (!settings) return null;

  return {
    id: settings._id.toString(),
    notificationEmails: settings.notificationEmails ?? [],
    isEnabled: settings.isEnabled,
    updatedBy: settings.updatedBy?.toString() ?? null,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildClaimTransitionEmail(payload: ClaimTransitionMailPayload) {
  const displayClaim = payload.claimNumber ?? payload.claimId;
  const statusLabel = STATUS_LABEL[payload.toStatus] ?? payload.toStatus;
  const safePatientName = payload.patientName
    ? escapeHtml(payload.patientName)
    : "";
  const safeCompanyName = payload.companyName
    ? escapeHtml(payload.companyName)
    : "";
  const safeDisplayClaim = escapeHtml(displayClaim);
  const safeStatusLabel = escapeHtml(statusLabel);
  const safePerformedByName = escapeHtml(payload.performedByName ?? "System");
  const safeRemarks = payload.remarks ? escapeHtml(payload.remarks) : "";
  const actorLine = payload.performedByName
    ? `Updated by: ${payload.performedByName}`
    : "Updated by: System";
  const remarksLine = payload.remarks ? `Remarks: ${payload.remarks}` : "";
  const subject = `Claim ${displayClaim} is ${statusLabel}`;
  const text = [
    "Malavia Claims advanced notification",
    "",
    `Claim: ${displayClaim}`,
    payload.patientName ? `Patient: ${payload.patientName}` : "",
    payload.companyName ? `Company: ${payload.companyName}` : "",
    `Status: ${statusLabel}`,
    actorLine,
    remarksLine,
    `Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
  <h2 style="margin:0 0 12px">Claim ${safeDisplayClaim} is ${safeStatusLabel}</h2>
  <p>The claim has reached one of the advanced notification milestones.</p>
  <table style="border-collapse:collapse;margin-top:12px">
    <tr><td style="padding:6px 12px;border:1px solid #e5e7eb"><strong>Claim</strong></td><td style="padding:6px 12px;border:1px solid #e5e7eb">${safeDisplayClaim}</td></tr>
    ${safePatientName ? `<tr><td style="padding:6px 12px;border:1px solid #e5e7eb"><strong>Patient</strong></td><td style="padding:6px 12px;border:1px solid #e5e7eb">${safePatientName}</td></tr>` : ""}
    ${safeCompanyName ? `<tr><td style="padding:6px 12px;border:1px solid #e5e7eb"><strong>Company</strong></td><td style="padding:6px 12px;border:1px solid #e5e7eb">${safeCompanyName}</td></tr>` : ""}
    <tr><td style="padding:6px 12px;border:1px solid #e5e7eb"><strong>Status</strong></td><td style="padding:6px 12px;border:1px solid #e5e7eb">${safeStatusLabel}</td></tr>
    <tr><td style="padding:6px 12px;border:1px solid #e5e7eb"><strong>Updated by</strong></td><td style="padding:6px 12px;border:1px solid #e5e7eb">${safePerformedByName}</td></tr>
    ${safeRemarks ? `<tr><td style="padding:6px 12px;border:1px solid #e5e7eb"><strong>Remarks</strong></td><td style="padding:6px 12px;border:1px solid #e5e7eb">${safeRemarks}</td></tr>` : ""}
  </table>
</div>`;

  return { subject, text, html };
}

export class AdvancedNotificationService {
  static shouldNotifyStatus(status: ClaimStatus) {
    return ADVANCED_NOTIFICATION_STATUSES.has(status);
  }

  static async getSettings() {
    return toResponse(await AdvancedNotificationRepository.getSettings());
  }

  static async saveSettings(payload: SaveSettingsPayload) {
    const settings = await AdvancedNotificationRepository.upsertSettings({
      notificationEmails: payload.notificationEmails.map((item) => ({
        email: item.email.trim().toLowerCase(),
        isActive: item.isActive,
      })),
      isEnabled: payload.isEnabled ?? true,
      updatedBy: payload.updatedBy,
    });

    return toResponse(settings);
  }

  static async sendClaimTransitionEmail(payload: ClaimTransitionMailPayload) {
    try {
      if (!this.shouldNotifyStatus(payload.toStatus)) return;

      const settings = await AdvancedNotificationRepository.getSettings();
      if (!settings?.isEnabled) return;

      const activeEmails =
        settings.notificationEmails?.filter(
          (emailConfig: NotificationEmail) => emailConfig.isActive
        ) ?? [];

      if (activeEmails.length === 0) return;

      const message = buildClaimTransitionEmail(payload);

      await Promise.all(
        activeEmails.map(({ email }: NotificationEmail) =>
          SmtpMailService.send({
            to: email,
            subject: message.subject,
            text: message.text,
            html: message.html,
          })
        )
      );
    } catch (error) {
      logger.error(error, "Failed to send advanced notification email");
    }
  }
}
