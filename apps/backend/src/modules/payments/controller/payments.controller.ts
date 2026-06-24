import { Request, Response } from "express";
import { RazorpayService } from "../service/razorpay.service.js";
import { OrganizationModel } from "@/modules/organizations/schema/organization.schema.js";

export class PaymentsController {
  /**
   * Create Subscription Link
   */
  static async createSubscription(req: Request, res: Response) {
    const { planName } = req.body;
    const user = (req as any).user;

    if (!user || !user.organizationId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Active organization session is required.",
      });
    }

    if (!planName) {
      return res.status(400).json({
        success: false,
        message: "planName is required.",
      });
    }

    try {
      const data = await RazorpayService.createSubscription(user.organizationId, planName);
      return res.status(200).json({
        success: true,
        message: "Subscription created successfully",
        data,
      });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to generate subscription link",
      });
    }
  }

  /**
   * Handle Razorpay Webhook Event
   */
  static async handleWebhook(req: Request, res: Response) {
    const signature = req.headers["x-razorpay-signature"] as string;
    
    // We need the raw body to check signature validation.
    // If Express is parsed with body-parser json, we can stringify it or read it.
    // In our verification helper, we compare. Let's make sure it matches.
    const rawBody = JSON.stringify(req.body);

    const isValid = RazorpayService.verifyWebhookSignature(rawBody, signature);

    if (!isValid && process.env.NODE_ENV === "production") {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    try {
      await RazorpayService.handleWebhookEvent(req.body);
      return res.status(200).json({
        success: true,
        message: "Webhook processed successfully",
      });
    } catch (err: any) {
      console.error("❌ Webhook processing error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to process webhook event",
      });
    }
  }

  /**
   * Get Subscription details for current user's Organization
   */
  static async getSubscriptionStatus(req: Request, res: Response) {
    const user = (req as any).user;

    if (!user || !user.organizationId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    try {
      const org = await OrganizationModel.findById(user.organizationId).lean();
      if (!org) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          plan: org.plan,
          isActive: org.isActive,
          expiresAt: org.billing?.planExpiresAt || null,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve subscription details",
      });
    }
  }
}
