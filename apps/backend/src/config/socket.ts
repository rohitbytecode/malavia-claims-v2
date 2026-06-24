import { Server as HttpServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import { logger } from "./logger.js";
import { verifyAccessToken } from "@/modules/auth/utils/jwt.util.js";
import { resolveCorsOrigin } from "./cors.js";
import { lockManager } from "@/config/lock-manager.js";
import { success } from "zod";

import { UserRepository } from "@/modules/users/repository/user.repository.js";

let io: SocketServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: resolveCorsOrigin,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
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

      let username = payload.username;
      let fullName = payload.fullName;

      if (!username || !fullName) {
        try {
          const userDoc = await UserRepository.findById(payload.userId);
          if (userDoc) {
            username = username || userDoc.username;
            fullName = fullName || userDoc.fullName;
          }
        } catch (dbError) {
          logger.warn(
            { error: dbError },
            "Socket auth user database fallback failed"
          );
        }
      }

      socket.data.user = {
        id: payload.userId,
        role: payload.role,
        username: username,
        fullName: fullName,
        organizationId: payload.organizationId,
      };
      return next();
    } catch (error) {
      logger.warn("Socket auth failed");
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as
      | { id?: string; role?: string; fullName?: string; username?: string; organizationId?: string }
      | undefined;

    if (user?.id) {
      socket.join(`user:${user.id}`);
    }

    if (user?.role) {
      socket.join(`role:${user.role}`);
    }

    // Join org-specific room for tenant-scoped events
    if (user?.organizationId) {
      socket.join(`org:${user.organizationId}`);
      if (user?.role) {
        socket.join(`org:${user.organizationId}:role:${user.role}`);
      }
    }

    logger.info(
      { socketId: socket.id, userId: user?.id, role: user?.role },
      "Socket connected"
    );

    socket.on(
      "claim:lock:acquire",
      (
        { claimId, deviceName }: { claimId: string; deviceName: string },
        ack
      ) => {
        if (user?.role === "PHARMACIST") {
          return ack({ success: true });
        }
        if (!claimId || !user?.id) {
          return ack({ success: false, message: "Invalid request." });
        }
        const result = lockManager.acquireLock(
          claimId,
          {
            id: user.id,
            username: user.username ?? "Unknown",
            fullName: user.fullName ?? user.username ?? "Unknown",
          },
          deviceName ?? "Unknown Device",
          socket.id
        );
        ack(result);
      }
    );

    socket.on("claim:lock:release", ({ claimId }: { claimId: string }) => {
      if (claimId) lockManager.releaseLockByClaim(claimId, socket.id);
    });

    socket.on("disconnect", (reason) => {
      const claimId = socket.data.claimId;
      lockManager.releaseLockByClaim(claimId, socket.id);
      logger.info(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  logger.info("Socket.io server initialized");
  return io;
}

export function getIO(): SocketServer {
  if (!io) {
    throw new Error(
      "Socket.io has not been initialized. Call initSocketServer first."
    );
  }
  return io;
}
