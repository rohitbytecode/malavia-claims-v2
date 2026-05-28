import { env } from "./env.js";

const configuredOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const resolveCorsOrigin = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  if (env.NODE_ENV === "development" || configuredOrigins.includes("*")) {
    callback(null, true);
    return;
  }

  if (!origin || configuredOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS origin not allowed: ${origin}`));
};
