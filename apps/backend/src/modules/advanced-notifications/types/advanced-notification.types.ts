import { Document, Types } from "mongoose";

export interface NotificationEmail {
  email: string;
  isActive: boolean;
}

export interface AdvancedNotificationDocument extends Document {
  notificationEmails: NotificationEmail[];
  isEnabled: boolean;
  updatedBy?: Types.ObjectId;
  organizationId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdvancedNotificationResponse {
  id: string;
  notificationEmails: NotificationEmail[];
  isEnabled: boolean;
  updatedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
