import { z } from "zod";
import { DepartmentCategory } from "../constant/department-category.enum.js";

const departmentPolicyItemSchema = z.object({
  departmentCategory: z.nativeEnum(DepartmentCategory),
  discountPercent: z.number().min(0).max(100).default(0),
  maxDiscountAmount: z.number().min(0).optional(),
  deductionRules: z.string().trim().optional().default(""),
  isApplicable: z.boolean().optional().default(true),
});

export const createPayerContractSchema = z.object({
  body: z.object({
    insuranceCompanyId: z.string().trim().min(1),
    effectiveFrom: z.string().trim().optional(),
    effectiveTo: z.string().trim().optional(),
    departmentPolicies: z
      .array(departmentPolicyItemSchema)
      .optional()
      .default([]),
    tdsPercent: z.number().min(0).max(100).optional().default(0),
    defaultHospitalDiscountPercent: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .default(0),
    remarks: z.string().trim().optional().default(""),
    createdBy: z.string().trim().min(1),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updatePayerContractSchema = z.object({
  body: z.object({
    effectiveFrom: z.string().trim().optional(),
    effectiveTo: z.string().trim().nullable().optional(),
    isActive: z.boolean().optional(),
    departmentPolicies: z.array(departmentPolicyItemSchema).optional(),
    tdsPercent: z.number().min(0).max(100).optional(),
    defaultHospitalDiscountPercent: z.number().min(0).max(100).optional(),
    remarks: z.string().trim().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const getByCompanySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    insuranceCompanyId: z.string().trim().min(1),
  }),
});

export const getByIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().trim().min(1),
  }),
});
