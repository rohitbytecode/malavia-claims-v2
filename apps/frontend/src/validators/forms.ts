import { z } from "zod";
export const loginSchema = z.object({ email: z.email(), password: z.string().min(8, "Password must contain at least 8 characters") });
export const claimSchema = z.object({ type: z.enum(["CASHLESS", "REIMBURSEMENT"]), insuranceCompanyId: z.string().optional(), patientId: z.string().min(1), hospitalId: z.string().min(1), departmentId: z.string().optional(), totalClaimAmount: z.coerce.number().nonnegative(), depositAmount: z.coerce.number().nonnegative().optional(), remarks: z.string().optional() });
export const transitionSchema = z.object({ toStatus: z.string().min(1), remarks: z.string().min(5, "Audit reason is required") });
export const settlementSchema = z.object({ approvedAmount: z.coerce.number().nonnegative(), hospitalDiscount: z.coerce.number().nonnegative().default(0), deductions: z.coerce.number().nonnegative().default(0), tds: z.coerce.number().nonnegative().default(0), settlementMethod: z.enum(["PORTAL", "EMAIL", "COURIER"]), remarks: z.string().optional() });
export const refundSchema = z.object({ refundAmount: z.coerce.number().nonnegative(), refundMode: z.enum(["CASH", "ONLINE"]), remarks: z.string().optional() });
export const communicationSchema = z.object({ type: z.string().min(2), medium: z.enum(["EMAIL", "PORTAL", "COURIER", "PHONE", "IN_PERSON"]), remarks: z.string().min(2), followUpDate: z.string().optional() });
