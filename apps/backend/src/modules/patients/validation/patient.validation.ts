import { z } from "zod";

const createPatientBodySchema = z.object({
  patientId: z.string().trim().min(1, "Patient ID is required"),
  name: z.string().trim().min(1, "Name is required"),
  insurerId: z.string().trim().optional().nullable(),
  insuranceCompanyId: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const createPatientSchema = z.object({
  body: createPatientBodySchema,
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const listPatientsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    isActive: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(100),
  }),
  params: z.object({}).optional(),
});

export const patientIdParamsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    patientId: z.string().trim().min(1),
  }),
});

export const updatePatientSchema = z.object({
  body: createPatientBodySchema.partial(),
  query: z.object({}).optional(),
  params: z.object({
    patientId: z.string().trim().min(1),
  }),
});
