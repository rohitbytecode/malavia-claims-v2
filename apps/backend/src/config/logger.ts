import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",

  base: {
    service: "claim-management-api",
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  serializers: {
    err: pino.stdSerializers.err,
  },

  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        singleLine: false,
        translateTime: "SYS:standard",
      },
    },
  }),
});
