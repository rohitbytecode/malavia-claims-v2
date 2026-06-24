import { z } from "zod";

export const registerOrganizationSchema = z.object({
  body: z.object({
    organizationName: z
      .string()
      .min(2, "Organization name must be at least 2 characters")
      .max(100),
    adminFullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(100),
    adminUsername: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50)
      .regex(
        /^[a-z0-9._-]+$/,
        "Username must be lowercase alphanumeric with dots, underscores, or hyphens"
      ),
    adminPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128),
    adminEmail: z.string().email().optional(),
    plan: z.enum(["FREE", "STARTER", "PRO", "ENTERPRISE"]).optional(),
  }),
});

export const updateOrganizationSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    settings: z
      .object({
        logoUrl: z.string().url().optional(),
        primaryColor: z.string().optional(),
        timezone: z.string().optional(),
        currency: z.string().optional(),
      })
      .optional(),
    billing: z
      .object({
        email: z.string().email().optional(),
      })
      .optional(),
  }),
});
