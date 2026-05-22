import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(8),
    newPassword: z.string().min(8),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

