import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import { Application } from "express";
import helmet from "helmet";
import { env } from "@/config/env.js";

// Rate limiting middleware
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.RATE_LIMIT_MAX, // Limit each IP to configured max requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
});

export const setupSecurityMiddleware = (app: Application) => {
  // Set security HTTP headers
  app.use(helmet());

  // Data sanitization against NoSQL query injection
  app.use(mongoSanitize());
};
