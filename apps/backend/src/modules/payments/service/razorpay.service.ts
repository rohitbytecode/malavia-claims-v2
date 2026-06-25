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
  private static dynamicPlanIds: Record<string, string> = {};

  private static async getOrCreatePlanId(planName: string): Promise<string> {
    const defaultPlanId = PLAN_IDS[planName];
    if (defaultPlanId && !defaultPlanId.includes("mock")) {
      return defaultPlanId;
    }

    if (this.dynamicPlanIds[planName]) {
      return this.dynamicPlanIds[planName];
    }

    if (!razorpay) {
      return defaultPlanId || "mock_id";
    }

    console.log(`Creating dynamic Razorpay plan for ${planName}...`);
    const planDetails: Record<string, { name: string; amount: number }> = {
      STARTER: { name: "Starter Plan", amount: 290000 },
      PRO: { name: "Pro Plan", amount: 990000 },
    };

    const details = planDetails[planName] || { name: `${planName} Plan`, amount: 10000 };

    try {
      const plan = await razorpay.plans.create({
        period: "monthly",
        interval: 1,
        item: {
          name: details.name,
          amount: details.amount,
          currency: "INR",
          description: `SaaS ${planName} tier subscription`,
        },
      });

      console.log(`Successfully created dynamic Razorpay plan: ${plan.id}`);
      this.dynamicPlanIds[planName] = plan.id;
      return plan.id;
    } catch (err: any) {
      console.error(`Failed to create dynamic plan in Razorpay for ${planName}:`, err);
      throw err;
    }
  }

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

    let planId: string;
    try {
      planId = await this.getOrCreatePlanId(planName);
    } catch (planErr: any) {
      throw new AppError(planErr.message || "Failed to initialize payment plan on Razorpay", 500);
    }

    if (!razorpay || planId.includes("mock")) {
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
        status: "active",
        key: KEY_ID || "rzp_test_mock_key",
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
        status: subscription.status,
        key: KEY_ID || "",
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

  /**
   * Verify subscription status directly with Razorpay API
   */
  static async verifySubscription(organizationId: string, subscriptionId: string) {
    const org = await OrganizationModel.findById(organizationId);
    if (!org) {
      throw new AppError("Organization not found", 404);
    }

    if (!razorpay || subscriptionId.startsWith("sub_mock_")) {
      org.isActive = true;
      await org.save();
      return {
        verified: true,
        status: "active",
      };
    }

    try {
      const subscription = (await razorpay.subscriptions.fetch(subscriptionId)) as any;
      const isActive = ["active", "authenticated", "completed", "charged"].includes(subscription.status);

      if (isActive) {
        // Map back plan ID to name
        let planName = "PRO";
        for (const [key, value] of Object.entries(PLAN_IDS)) {
          if (value === subscription.plan_id) {
            planName = key;
            break;
          }
        }
        org.plan = planName as any;
        org.isActive = true;
        org.billing = {
          email: subscription.customer_email || org.billing?.email || "",
          planExpiresAt: new Date(subscription.current_end * 1000),
        };
        await org.save();
      }

      return {
        verified: isActive,
        status: subscription.status,
      };
    } catch (err: any) {
      console.error("❌ Razorpay subscription verification failed:", err);
      throw new AppError(err.message || "Failed to verify subscription on Razorpay", 500);
    }
  }
}
