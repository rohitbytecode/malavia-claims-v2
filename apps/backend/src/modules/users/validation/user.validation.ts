import { z } from "zod";
import { Roles } from "@/core/enums/roles.enum.js";

const createUserBody = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.nativeEnum(Roles),
  isActive: z.boolean().optional().default(true),
});

const updateUserBody = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.nativeEnum(Roles).optional(),
  isActive: z.boolean().optional(),
});

export const createUserSchema = z.object({
  body: createUserBody,
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const listUsersSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    role: z.nativeEnum(Roles).optional(),
    isActive: z.preprocess((value) => {
      if (value === "true") return true;
      if (value === "false") return false;
      return undefined;
    }, z.boolean().optional()),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
  params: z.object({}).optional(),
});

export const getUserParamsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    userId: z.string().trim().min(1),
  }),
});

export const updateUserSchema = z.object({
  body: updateUserBody,
  query: z.object({}).optional(),
  params: z.object({
    userId: z.string().trim().min(1),
  }),
});
