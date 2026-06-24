import dotenv from "dotenv";
import { z } from "zod";
import { logger } from "./logger.js";

dotenv.config({ override: true });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.string().default("5000"),

  MONGO_URI: z.string(),

  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  PORTAL_PASSWORD_SECRET: z.string(),

  ACCESS_TOKEN_EXPIRES_IN: z.string().default("1d"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),

  CORS_ORIGIN: z.string().default("*"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.preprocess(
    (value) => value === "true" || value === true,
    z.boolean().default(false)
  ),
  SMTP_STARTTLS: z.preprocess(
    (value) => value === "true" || value === true,
    z.boolean().default(false)
  ),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_HELO_HOST: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  
  APP_NAME: z.string().default("Claims Management Platform"),
  ORG_NAME: z.string().default("Claims Platform Organization"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error("Invalid environment variables");
  logger.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
