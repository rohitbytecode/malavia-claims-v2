import { Server as HttpServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import { logger } from "./logger.js";
import { verifyAccessToken } from "@/modules/auth/utils/jwt.util.js";
import { resolveCorsOrigin } from "./cors.js";

let io: SocketServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: resolveCorsOrigin,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use((socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token;
      const header = socket.handshake.headers.authorization;
      const headerToken =
        typeof header === "string" ? header.replace("Bearer ", "") : "";
      const token = typeof authToken === "string" ? authToken : headerToken;

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const payload = verifyAccessToken(token);
      socket.data.user = { id: payload.userId, role: payload.role };
      return next();
    } catch (error) {
      logger.warn("Socket auth failed");
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on("disconnect", (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  logger.info("Socket.io server initialized");
  return io;
}

export function getIO(): SocketServer {
  if (!io) {
    throw new Error("Socket.io has not been initialized. Call initSocketServer first.");
  }
  return io;
}
