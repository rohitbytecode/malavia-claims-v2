import { z } from "zod";
export const loginSchema = z.object({
  organizationSlug: z.string().min(2, "Organization code must be at least 2 characters"),
  username: z.string().min(3, "Username must contain at least 3 characters"),
  password: z.string().min(8, "Password must contain at least 8 characters"),
});
export const claimSchema = z.object({
  type: z.enum(["CASHLESS", "REIMBURSEMENT"]),
  insuranceCompanyId: z.string().optional(),
  insurerId: z.string().optional(),
  patientId: z.string().min(1),
  hospitalId: z.string().optional(),
  departmentId: z.string().optional(),
  doctorId: z.string().optional(),
  totalClaimAmount: z.coerce.number().nonnegative().optional().default(0),
  depositAmount: z.coerce.number().nonnegative().optional(),
  remarks: z.string().optional(),
});
export const transitionSchema = z.object({
  toStatus: z.string().min(1),
  remarks: z.string().min(5, "Audit reason is required"),
});
export const settlementSchema = z.object({
  approvedAmount: z.coerce.number().nonnegative(),
  hospitalDiscount: z.coerce.number().nonnegative().default(0),
  deductions: z.coerce.number().nonnegative().default(0),
  tds: z.coerce.number().nonnegative().default(0),
  settlementMethod: z.enum(["PORTAL", "EMAIL", "COURIER"]),
  remarks: z.string().optional(),
});
export const refundSchema = z.object({
  refundAmount: z.coerce.number().nonnegative(),
  refundMode: z.enum(["CASH", "ONLINE"]),
  remarks: z.string().optional(),
});
export const communicationSchema = z.object({
  type: z.string().min(2),
  medium: z.enum(["EMAIL", "PORTAL", "COURIER", "PHONE", "IN_PERSON"]),
  remarks: z.string().min(2),
  followUpDate: z.string().optional(),
});
export const doctorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Doctor name is required")
    .refine(
      (val) => {
        const normalized = val.toLowerCase();
        return !(normalized.startsWith("dr.") || normalized.startsWith("dr "));
      },
      {
        message: "Doctor name should not start with 'Dr.' or 'dr.' prefix",
      }
    ),
  departmentId: z.string().min(1, "Department is required"),
});

export const registerSchema = z.object({
  organizationName: z.string().min(3, "Organization name must be at least 3 characters"),
  adminFullName: z.string().min(3, "Admin full name must be at least 3 characters"),
  adminUsername: z.string().min(3, "Admin username must be at least 3 characters"),
  adminPassword: z.string().min(8, "Admin password must be at least 8 characters"),
  adminEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
  plan: z.enum(["FREE", "STARTER", "PRO", "ENTERPRISE"]),
});
