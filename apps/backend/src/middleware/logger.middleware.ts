import pinoHttp from "pino-http";
import { logger } from "@/config/logger.js";
import { randomUUID } from "crypto";
import { IncomingMessage, ServerResponse } from "http";

export const requestLogger = (pinoHttp as any)({
  logger,
  genReqId: function (req: IncomingMessage, res: ServerResponse) {
    const existingID = req.id ?? req.headers["x-request-id"];
    if (existingID) return existingID;
    const id = randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customLogLevel: function (req: IncomingMessage, res: ServerResponse, err: Error) {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return "warn";
    } else if (res.statusCode >= 500 || err) {
      return "error";
    }
    return "info";
  },
  serializers: {
    req(req: any) {
      return {
        method: req.method,
        url: req.url,
        query: req.query,
        headers: {
          "user-agent": req.headers["user-agent"],
          "x-forwarded-for": req.headers["x-forwarded-for"],
        },
      };
    },
    res(res: any) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});
