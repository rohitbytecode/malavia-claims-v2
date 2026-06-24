import { Document, Types } from "mongoose";

export enum NotificationType {
  ALERT = "ALERT",
  REMINDER = "REMINDER",
  SYSTEM = "SYSTEM",
  CLAIM_STATUS = "CLAIM_STATUS",
}

export interface NotificationDocument extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  entityId?: Types.ObjectId;
  isRead: boolean;
  readAt?: Date;
  organizationId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
