# 🚀 HICMS Scalability Hardening Plan

## Target Benchmarks

| Metric | Target |
|---|---|
| Total Claims | 50,000 |
| Concurrent Users | 100 |
| Notifications | 500,000 |
| API Requests | 2,000,000 |

---

## Current State — What's Already in Place ✅

| Capability | Status | File |
|---|---|---|
| PM2 cluster mode (all CPU cores) | ✅ | [ecosystem.config.cjs](file:///d:/Rohit%202.0/Programing%20projects/Malavia-claim/apps/backend/ecosystem.config.cjs) |
| Rate limiting (`express-rate-limit`) | ✅ | [security.middleware.ts](file:///d:/Rohit%202.0/Programing%20projects/Malavia-claim/apps/backend/src/middleware/security.middleware.ts) |
| Graceful shutdown (SIGINT/SIGTERM) | ✅ | [server.ts](file:///d:/Rohit%202.0/Programing%20projects/Malavia-claim/apps/backend/src/server.ts) |
| Prometheus metrics + OpenTelemetry | ✅ | [prometheus.middleware.ts](file:///d:/Rohit%202.0/Programing%20projects/Malavia-claim/apps/backend/src/middleware/prometheus.middleware.ts), [tracing.ts](file:///d:/Rohit%202.0/Programing%20projects/Malavia-claim/apps/backend/src/tracing.ts) |
| `uncaughtException` / `unhandledRejection` handlers | ✅ | [app.ts](file:///d:/Rohit%202.0/Programing%20projects/Malavia-claim/apps/backend/src/app.ts) |
| Helmet + Mongo Sanitization | ✅ | [security.middleware.ts](file:///d:/Rohit%202.0/Programing%20projects/Malavia-claim/apps/backend/src/middleware/security.middleware.ts) |
| Memory-based auto-restart (1 GB) | ✅ | [ecosystem.config.cjs](file:///d:/Rohit%202.0/Programing%20projects/Malavia-claim/apps/backend/ecosystem.config.cjs) |
| Health / Liveness / Readiness probes | ✅ | [app.ts](file:///d:/Rohit%202.0/Programing%20projects/Malavia-claim/apps/backend/src/app.ts) |

---

## Area 1 — Database Layer (50K Claims)

> [!IMPORTANT]
> The database is the #1 bottleneck. Without indexes and connection pooling, 50K claims will grind queries to a halt.

### 1.1 Add MongoDB Indexes

Add compound indexes on high-traffic query patterns:

```typescript
// In each Mongoose model schema definition
// Claims model
ClaimSchema.index({ status: 1, createdAt: -1 });
ClaimSchema.index({ patientId: 1 });
ClaimSchema.index({ insuranceCompanyId: 1, status: 1 });
ClaimSchema.index({ assignedTo: 1, status: 1 });
ClaimSchema.index({ claimNumber: 1 }, { unique: true });

// Notifications model
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90-day TTL

// Audit Logs model
AuditLogSchema.index({ entityId: 1, entityType: 1 });
AuditLogSchema.index({ createdAt: -1 });
```

**Files to modify:** All model files under `src/modules/*/models/`

### 1.2 Add Connection Pool Configuration

```diff
// src/config/db.ts
- await mongoose.connect(env.MONGO_URI);
+ await mongoose.connect(env.MONGO_URI, {
+   maxPoolSize: 50,          // Handle 100 concurrent users
+   minPoolSize: 10,          // Keep warm connections
+   maxIdleTimeMS: 30000,     // Close idle connections after 30s
+   serverSelectionTimeoutMS: 5000,
+   socketTimeoutMS: 45000,
+ });
```

**File:** [db.ts](file:///d:/Rohit%202.0/Programing%20projects/Malavia-claim/apps/backend/src/config/db.ts)

### 1.3 Use `.lean()` on Read-Heavy Queries

Add `.lean()` to all find/aggregate queries that don't need Mongoose document methods:

```typescript
// Before
const claims = await Claim.find({ status: 'PENDING' });

// After — 3-5x faster, returns plain JS objects
const claims = await Claim.find({ status: 'PENDING' }).lean();
```

**Files to modify:** All `*.repository.ts` files under `src/modules/`

### 1.4 Cursor-Based Pagination

Replace offset pagination (`skip/limit`) with cursor-based for large collections:

```typescript
// Instead of: .skip((page - 1) * limit).limit(limit)
// Use cursor-based:
const query = lastId
  ? { _id: { $gt: lastId }, ...filters }
  : { ...filters };

const results = await Claim.find(query).sort({ _id: 1 }).limit(limit).lean();
```

---

## Area 2 — API Resilience (2M Requests)

### 2.1 Response Compression

```bash
pnpm add compression @types/compression
```

```diff
// src/app.ts
+ import compression from 'compression';

  setupSecurityMiddleware(app);
+ app.use(compression());     // gzip responses — cuts payload ~70%
  app.use(prometheusMiddleware);
```

**File:** [app.ts](file:///d:/Rohit%202.0/Programing%20projects/Malavia-claim/apps/backend/src/app.ts)

### 2.2 Request Timeout Middleware

Prevent slow queries from holding connections open forever:

```typescript
// src/middleware/timeout.middleware.ts
import { Request, Response, NextFunction } from 'express';

export const requestTimeout = (ms: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setTimeout(ms, () => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timed out',
        });
      }
    });
    next();
  };
};
```

```diff
// src/app.ts
+ import { requestTimeout } from './middleware/timeout.middleware.js';
  app.use("/api", apiLimiter);
+ app.use("/api", requestTimeout(30000));
```

### 2.3 Tune Rate Limiter for Scale

```diff
// src/middleware/security.middleware.ts
  export const apiLimiter = rateLimit({
-   windowMs: 15 * 60 * 1000,
-   max: env.RATE_LIMIT_MAX,
+   windowMs: 1 * 60 * 1000,        // 1-minute windows for finer control
+   max: env.RATE_LIMIT_MAX || 300,  // 300 req/min per IP (= 5 req/sec)
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.NODE_ENV === "development",
  });
```

### 2.4 HTTP Keep-Alive Tuning

```diff
// src/server.ts
  const httpsServer = https.createServer(sslOptions, app);
+ httpsServer.keepAliveTimeout = 65000;    // Slightly > nginx's 60s default
+ httpsServer.headersTimeout = 66000;      // Must be > keepAliveTimeout
```

**File:** [server.ts](file:///d:/Rohit%202.0/Programing%20projects/Malavia-claim/apps/backend/src/server.ts)

---

## Area 3 — Notifications (500K)

> [!WARNING]
> Inserting 500K notifications one-by-one will kill performance. Bulk operations and TTL cleanup are mandatory.

### 3.1 Bulk Notification Inserts

```typescript
// In notification service — fan-out to multiple users
await Notification.insertMany(
  userIds.map(userId => ({
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: new Date(),
  })),
  { ordered: false }  // Continue on individual failures
);
```

### 3.2 TTL Index for Auto-Cleanup

```typescript
// Notification model — auto-delete after 90 days
NotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);
```

### 3.3 Job Queue for Heavy Fan-Outs (Optional — High Impact)

```bash
pnpm add bullmq ioredis
```

```typescript
// src/config/queue.ts
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({ maxRetriesPerRequest: null });

export const notificationQueue = new Queue('notifications', { connection });

// Worker processes bulk inserts off the main thread
new Worker('notifications', async (job) => {
  const { userIds, payload } = job.data;
  await Notification.insertMany(
    userIds.map(id => ({ userId: id, ...payload })),
    { ordered: false }
  );
}, { connection, concurrency: 5 });
```

> [!NOTE]
> This requires a Redis instance. If Redis isn't available, skip this and rely on bulk `insertMany()` directly.

---

## Area 4 — Concurrent Users (100 Users)

> [!CAUTION]
> **Critical Bug:** PM2 cluster mode + Socket.io + in-memory lock manager = **BROKEN**. Each PM2 instance has its own memory. A user connected to instance 1 cannot see locks from instance 2.

### 4.1 Socket.io Redis Adapter (MUST DO)

```bash
pnpm add @socket.io/redis-adapter ioredis
```

```diff
// src/config/socket.ts
+ import { createAdapter } from '@socket.io/redis-adapter';
+ import { Redis } from 'ioredis';

  export function initSocketServer(httpServer: HttpServer): SocketServer {
+   const pubClient = new Redis(env.REDIS_URL);
+   const subClient = pubClient.duplicate();

    io = new SocketServer(httpServer, { ... });
+   io.adapter(createAdapter(pubClient, subClient));
```

### 4.2 Redis-Backed Lock Manager

Replace the in-memory `lockManager` with Redis-backed distributed locks:

```typescript
// src/config/lock-manager.ts — refactor to use Redis
import { Redis } from 'ioredis';

const redis = new Redis(env.REDIS_URL);
const LOCK_TTL = 300; // 5 minutes

export const lockManager = {
  async acquireLock(claimId: string, user: UserInfo, device: string, socketId: string) {
    const key = `claim:lock:${claimId}`;
    const existing = await redis.get(key);
    
    if (existing) {
      const lock = JSON.parse(existing);
      if (lock.userId !== user.id) {
        return { success: false, lockedBy: lock };
      }
    }
    
    await redis.setex(key, LOCK_TTL, JSON.stringify({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      device,
      socketId,
      lockedAt: Date.now(),
    }));
    
    return { success: true };
  },

  async releaseLock(claimId: string, socketId: string) {
    const key = `claim:lock:${claimId}`;
    const existing = await redis.get(key);
    if (existing) {
      const lock = JSON.parse(existing);
      if (lock.socketId === socketId) {
        await redis.del(key);
      }
    }
  },
};
```

**File:** [lock-manager.ts](file:///d:/Rohit%202.0/Programing%20projects/Malavia-claim/apps/backend/src/config/lock-manager.ts)

---

## Area 5 — Crash Prevention

### 5.1 MongoDB Reconnection Retry

```diff
// src/config/db.ts
+ const MAX_RETRIES = 5;
+ const RETRY_DELAY = 3000;

  export const connectDatabase = async () => {
+   for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
-       await mongoose.connect(env.MONGO_URI);
+       await mongoose.connect(env.MONGO_URI, {
+         maxPoolSize: 50,
+         minPoolSize: 10,
+         serverSelectionTimeoutMS: 5000,
+       });
        logger.info("MongoDB connected");
+       return;
      } catch (error) {
-       logger.error(error);
-       process.exit(1);
+       logger.error(error, `MongoDB connect attempt ${attempt}/${MAX_RETRIES} failed`);
+       if (attempt === MAX_RETRIES) {
+         logger.fatal("All MongoDB connection attempts exhausted. Exiting.");
+         process.exit(1);
+       }
+       await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
      }
+   }
  };
```

### 5.2 Enhanced Health Check

```diff
// src/app.ts — /health endpoint
  app.get("/health", (_, res) => {
+   const memUsage = process.memoryUsage();
+   const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
+   const isHealthy = mongoose.connection.readyState === 1 && heapUsedMB < 900;
+
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      message: "Claim Management API Running",
      uptime: process.uptime(),
-     memory: process.memoryUsage(),
+     memory: {
+       heapUsedMB,
+       rsseMB: Math.round(memUsage.rss / 1024 / 1024),
+     },
+     database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  });
```

### 5.3 Circuit Breaker for External Calls (Optional)

```bash
pnpm add cockatiel
```

```typescript
// src/config/circuit-breaker.ts
import { circuitBreaker, ConsecutiveBreaker, handleAll, SamplingBreaker } from 'cockatiel';

export const externalServiceBreaker = circuitBreaker(handleAll, {
  halfOpenAfter: 10_000,
  breaker: new ConsecutiveBreaker(5), // Open after 5 consecutive failures
});

// Usage in any service calling external APIs:
const result = await externalServiceBreaker.execute(() =>
  axios.get('https://insurance-api.example.com/verify')
);
```

---

## Area 6 — Load Testing (Validation)

### k6 Test Script

```javascript
// load-test/stress-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },   // Hold at 100 concurrent
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% failures
  },
};

export default function () {
  const res = http.get('https://localhost:5000/api/v1/claims?page=1&limit=20', {
    headers: { Authorization: `Bearer ${__ENV.TOKEN}` },
  });
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

```bash
# Run it
k6 run --env TOKEN=<jwt_token> load-test/stress-test.js
```

---

## Priority Matrix

| Priority | Task | Area | Impact | Effort | isDone?
|---|---|---|---|---|---|
| **P0** 🔴 | MongoDB indexes + connection pool | Database | 🔥 Critical | Low | Yes
| **P0** 🔴 | Redis adapter for Socket.io | Concurrency | 🔥 Critical | Medium | Pending
| **P0** 🔴 | Redis-backed lock manager | Concurrency | 🔥 Critical | Medium | Pending
| **P1** 🟠 | Bulk notification inserts + TTL | Notifications | High | Low | Pending
| **P1** 🟠 | Response compression | API | High | Low | Pending
| **P1** 🟠 | Request timeout middleware | API | High | Low | Pending
| **P1** 🟠 | `.lean()` on read queries | Database | High | Medium | Pending
| **P2** 🟡 | DB reconnection retry | Crash Prev. | Medium | Low | Pending
| **P2** 🟡 | Enhanced health check | Crash Prev. | Medium | Low | Pending
| **P2** 🟡 | Keep-alive tuning | API | Medium | Low | Pending
| **P2** 🟡 | Job queue (BullMQ) | Notifications | Medium | High | Pending
| **P3** 🟢 | Load test scripts (k6) | Validation | Medium | Medium | Pending
| **P3** 🟢 | Circuit breaker | Crash Prev. | Low | Medium | Pending
| **P3** 🟢 | Cursor-based pagination | Database | Low | High | Pending

---

## New Dependencies Required

```bash
# Required (P0-P1)
pnpm add compression @types/compression ioredis @socket.io/redis-adapter

# Optional (P2-P3)
pnpm add bullmq cockatiel
```

> [!IMPORTANT]
> **Redis is required** for P0 tasks (Socket.io adapter + lock manager). You'll need a Redis instance running — either local (`redis-server`) or via Docker (`docker run -d -p 6379:6379 redis:alpine`).

---

## Estimated Timeline

| Phase | Tasks | Time |
|---|---|---|
| Phase 1 (P0) | Indexes, Pool, Redis adapter, Lock manager | ~3-4 hours |
| Phase 2 (P1) | Compression, timeout, bulk inserts, `.lean()` | ~2-3 hours |
| Phase 3 (P2) | Retry logic, health check, keep-alive, queue | ~2-3 hours |
| Phase 4 (P3) | Load tests, circuit breaker, cursor pagination | ~2-3 hours |
| **Total** | | **~10-13 hours** |
