import { z } from "zod";
import { ClaimStatus } from "@/modules/claims/constant/claim-status.enum.js";
import { ClaimType } from "@/modules/claims/constant/claim-type.enum.js";

const createClaimBodySchema = z.object({
  type: z.nativeEnum(ClaimType),
  insuranceCompanyId: z.string().trim().optional(),
  insurerId: z.string().trim().optional(),
  patientId: z.string().trim(),
  hospitalId: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
  doctorId: z.string().trim().optional(),
  totalClaimAmount: z.number().nonnegative().optional().default(0),
  tdsAmount: z.number().nonnegative().optional().default(0),
  deductions: z.number().nonnegative().optional().default(0),
  hospitalDiscount: z.number().nonnegative().optional().default(0),
  depositAmount: z.number().nonnegative().optional().default(0),
  refundAmount: z.number().nonnegative().optional().default(0),
  remarks: z.string().trim().optional(),
  createdBy: z.string().trim().optional(),
});

export const createClaimSchema = z.object({
  body: createClaimBodySchema,
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const listClaimsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    status: z.nativeEnum(ClaimStatus).optional(),
    type: z.nativeEnum(ClaimType).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(1000).default(20),
  }),
  params: z.object({}).optional(),
});

export const getClaimParamsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    claimId: z.string().trim().min(1),
  }),
});

export const transitionClaimStatusSchema = z.object({
  body: z.object({
    toStatus: z.nativeEnum(ClaimStatus),
    remarks: z.string().trim().optional(),
    performedBy: z.string().trim().optional(),
    claimNumber: z.string().trim().min(1).optional(),
    totalClaimAmount: z.number().nonnegative().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    claimId: z.string().trim().min(1),
  }),
});
