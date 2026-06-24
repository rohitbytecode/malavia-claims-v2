import { env } from "./env.js";

export const APP_CONFIG = {
  ORG_NAME: env.ORG_NAME,
  APP_NAME: env.APP_NAME,
  DESCRIPTION: "Internal hospital cashless claim management system",
  VERSION: "1.0.0",
  API_VERSION: "v1",
};
