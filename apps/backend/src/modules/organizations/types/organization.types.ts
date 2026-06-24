import { Document, Types } from "mongoose";

export interface OrganizationSettings {
  logoUrl?: string;
  primaryColor?: string;
  timezone: string;
  currency: string;
}

export interface OrganizationBilling {
  email?: string;
  planExpiresAt?: Date;
}

export type PlanTier = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";

export interface OrganizationBase {
  name: string;
  slug: string;
  plan: PlanTier;
  isActive: boolean;
  settings: OrganizationSettings;
  billing: OrganizationBilling;
  createdBy?: Types.ObjectId;
}

export interface OrganizationDocument extends OrganizationBase, Document {
  createdAt: Date;
  updatedAt: Date;
}
