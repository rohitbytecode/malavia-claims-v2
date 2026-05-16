import { Document, Types } from "mongoose";

export enum NotificationType {
  ALERT = "ALERT",
  REMINDER = "REMINDER",
  SYSTEM = "SYSTEM",
}

export interface NotificationDocument extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  entityId?: Types.ObjectId;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
