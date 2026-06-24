import crypto from "crypto";
import Razorpay from "razorpay";
import { OrganizationModel } from "@/modules/organizations/schema/organization.schema.js";
import { AppError } from "@/core/errors/AppError.js";

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "default_webhook_secret";

let razorpay: Razorpay | null = null;

if (KEY_ID && KEY_SECRET) {
  console.log("💳 Initializing Razorpay Payment Gateway...");
  razorpay = new Razorpay({
    key_id: KEY_ID,
    key_secret: KEY_SECRET,
  });
} else {
  console.log("🎫 Dry-run/Mock Razorpay mode active (Keys missing from environment).");
}

// Razorpay Plan IDs (replace with your dashboard plan IDs)
const PLAN_IDS: Record<string, string> = {
  STARTER: process.env.RAZORPAY_PLAN_STARTER || "plan_starter_mock",
  PRO: process.env.RAZORPAY_PLAN_PRO || "plan_pro_mock",
};

export class RazorpayService {
  /**
   * Generates a new subscription link for an organization
   */
  static async createSubscription(organizationId: string, planName: string) {
    const org = await OrganizationModel.findById(organizationId);
    if (!org) {
      throw new AppError("Organization not found", 404);
    }

    if (planName === "FREE") {
      // Free plan requires no payment gateway subscription
      org.plan = "FREE";
      org.billing = {
        email: org.billing?.email || "",
        planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year free
      };
      await org.save();
      return {
        subscriptionId: "free_tier",
        shortUrl: "/dashboard",
        status: "active",
      };
    }

    const planId = PLAN_IDS[planName];
    if (!planId) {
      throw new AppError(`Invalid plan name: ${planName}`, 400);
    }

    if (!razorpay) {
      // Mock mode
      console.log(`[MOCK] Creating mock Razorpay subscription for ${org.name} on plan ${planName}`);
      org.plan = planName as any;
      org.billing = {
        email: org.billing?.email || "mock@hospital.com",
        planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      };
      await org.save();

      return {
        subscriptionId: `sub_mock_${Math.random().toString(36).substring(7)}`,
        shortUrl: `/dashboard?payment=mock_success&plan=${planName}`,
        status: "active",
      };
    }

    try {
      const subscription = await razorpay.subscriptions.create({
        plan_id: planId,
        total_count: 12, // 1 year monthly
        quantity: 1,
        customer_notify: 1,
        notes: {
          organizationId: organizationId,
        },
      });

      return {
        subscriptionId: subscription.id,
        shortUrl: subscription.short_url,
        status: subscription.status,
      };
    } catch (err: any) {
      console.error("❌ Razorpay subscription creation failed:", err);
      throw new AppError(err.message || "Payment gateway subscription failed", 500);
    }
  }

  /**
   * Verify Webhook Signature from Razorpay
   */
  static verifyWebhookSignature(body: string, signature: string): boolean {
    if (!signature) return false;
    
    const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
    hmac.update(body);
    const generated = hmac.digest("hex");

    return generated === signature;
  }

  /**
   * Process incoming Webhook events
   */
  static async handleWebhookEvent(event: any) {
    const eventName = event.event;
    console.log(`💳 Webhook Event received: ${eventName}`);

    if (
      eventName === "subscription.charged" ||
      eventName === "subscription.activated" ||
      eventName === "subscription.completed"
    ) {
      const subscription = event.payload.subscription.entity;
      const notes = subscription.notes || {};
      const orgId = notes.organizationId;

      if (!orgId) {
        console.warn("⚠️ Received subscription webhook without organizationId in notes");
        return;
      }

      const org = await OrganizationModel.findById(orgId);
      if (!org) {
        console.error(`❌ Webhook error: Organization ${orgId} not found`);
        return;
      }

      // Map back plan ID to name
      let planName = "PRO";
      for (const [key, value] of Object.entries(PLAN_IDS)) {
        if (value === subscription.plan_id) {
          planName = key;
          break;
        }
      }

      // Activate plan and extend expiry (30 days from charge date)
      org.plan = planName as any;
      org.isActive = true;
      org.billing = {
        email: subscription.customer_email || org.billing?.email || "",
        planExpiresAt: new Date(subscription.current_end * 1000),
      };

      await org.save();
      console.log(`✅ Subscription successfully updated for organization: ${org.name} (Plan: ${planName})`);
    } else if (eventName === "subscription.cancelled" || eventName === "subscription.halted") {
      const subscription = event.payload.subscription.entity;
      const orgId = subscription.notes?.organizationId;

      if (orgId) {
        const org = await OrganizationModel.findById(orgId);
        if (org) {
          org.isActive = false; // suspend access due to cancellation
          await org.save();
          console.warn(`🛑 Subscription cancelled for organization: ${org.name}`);
        }
      }
    }
  }
}
