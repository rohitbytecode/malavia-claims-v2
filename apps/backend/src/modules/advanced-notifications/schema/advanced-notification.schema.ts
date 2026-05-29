import mongoose from "mongoose";
import { AdvancedNotificationDocument } from "../types/advanced-notification.types.js";

const advancedNotificationSchema =
  new mongoose.Schema<AdvancedNotificationDocument>(
    {
      notificationEmails: [
        {
          email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
          },
          isActive: {
            type: Boolean,
            default: true,
          },
        },
      ],

      isEnabled: {
        type: Boolean,
        default: true,
        index: true,
      },

      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    {
      timestamps: true,
    }
  );

export const AdvancedNotificationModel =
  mongoose.models.AdvancedNotification ||
  mongoose.model<AdvancedNotificationDocument>(
    "AdvancedNotification",
    advancedNotificationSchema
  );
