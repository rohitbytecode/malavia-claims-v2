import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let backendProc: ChildProcess | null = null;
let frontendServer: http.Server | null = null;
let mainWindow: BrowserWindow | null = null;
let currentPort = 49200;

function getProjectRoot(): string {
  if (app.isPackaged) return process.resourcesPath;
  return path.resolve(__dirname, "..", "..");
}

function getBackendEntry(): string {
  return path.join(
    getProjectRoot(),
    "apps",
    "backend",
    "dist",
    "server.bundle.js"
  );
}

function getFrontendDist(): string {
  return path.join(getProjectRoot(), "apps", "frontend", "dist");
}

function ensureFileExists(filePath: string, label: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found at: ${filePath}`);
  }
}

function startFrontendServer(distDir: string, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = (req.url ?? "/").split("?")[0];

      let filePath = path.join(
        distDir,
        urlPath === "/" ? "index.html" : urlPath
      );

      if (!path.extname(filePath)) {
        filePath = path.join(distDir, "index.html");
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          fs.readFile(path.join(distDir, "index.html"), (err2, fallback) => {
            if (err2) {
              res.writeHead(404);
              res.end("Not found");
            } else {
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(fallback);
            }
          });
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
          ".html": "text/html",
          ".js": "application/javascript",
          ".css": "text/css",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".svg": "image/svg+xml",
          ".ico": "image/x-icon",
          ".json": "application/json",
          ".woff": "font/woff",
          ".woff2": "font/woff2",
          ".ttf": "font/ttf",
        };

        res.writeHead(200, {
          "Content-Type": mimeTypes[ext] ?? "application/octet-stream",
        });
        res.end(data);
      });
    });

    // Replace with:
    server.listen(port, "127.0.0.1", () => {
      frontendServer = server;
      resolve(port);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        server.close();
        startFrontendServer(distDir, port + 1)
          .then(resolve)
          .catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

async function startBackendIfNeeded(): Promise<void> {
  const backendEntry = getBackendEntry();
  ensureFileExists(backendEntry, "Backend dist/server.js");

  const backendDir = path.join(getProjectRoot(), "apps", "backend");
  const dotenvPath = path.join(backendDir, ".env");

  fs.appendFileSync(
    path.join(app.getPath("userData"), "backend.log"),
    `\nbackendDir: ${backendDir}\ndotenvPath: ${dotenvPath}\nexists: ${fs.existsSync(dotenvPath)}\nbackendEntry: ${backendEntry}\n`
  );

  const dotenv: Record<string, string> = {};
  if (fs.existsSync(dotenvPath)) {
    const lines = fs.readFileSync(dotenvPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      dotenv[key] = val;
    }
  }

  const env = {
    ...dotenv,
    ...process.env,
    PORT: "3443",
    MONGO_URI: dotenv.MONGO_URI ?? "mongodb://localhost:27017/hicms-prod",
  };

  backendProc = spawn(process.execPath, [backendEntry], {
    cwd: path.join(getProjectRoot(), "apps", "backend"),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const logPath = path.join(app.getPath("userData"), "backend.log");
  const logSteam = fs.createWriteStream(logPath, { flags: "a" });

  backendProc.stdout?.pipe(logSteam);
  backendProc.stderr?.pipe(logSteam);

  backendProc.on("exit", (code) => {
    fs.appendFileSync(logPath, `\nBackend exited with code: ${code}\n`);
  });

  const backendPort = parseInt(process.env.PORT ?? "3443", 10);

  const https = await import("node:https");

  const requestOnce = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const req = https.request(
        {
          method: "GET",
          hostname: "127.0.0.1",
          port: backendPort,
          path: "/health",
          rejectUnauthorized: false,
          timeout: 2000,
        },
        (res) => {
          const ok =
            typeof res.statusCode === "number" &&
            res.statusCode >= 200 &&
            res.statusCode < 400;
          resolve(ok);
          res.resume();
        }
      );

      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  };

  const timeoutMs = 60_000;
  const start = Date.now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const ok = await requestOnce();
    if (ok) return;

    if (Date.now() - start > timeoutMs) {
      throw new Error(
        `Backend did not become ready on port ${backendPort} within ${timeoutMs}ms`
      );
    }

    await new Promise((r) => setTimeout(r, 750));
  }
}

function createWindow(port: number) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow = win;

  win.on("closed", () => {
    mainWindow = null;
  });

  win.loadURL(`http://127.0.0.1:${port}`);
  return win;
}

app.whenReady().then(async () => {
  try {
    const distDir = getFrontendDist();
    ensureFileExists(
      path.join(distDir, "index.html"),
      "Frontend dist/index.html"
    );

    const actualPort = await startFrontendServer(distDir, 49200);
    currentPort = actualPort;
    await startBackendIfNeeded();
    createWindow(actualPort);
  } catch (err) {
    console.error(err);
    dialog.showErrorBox(
      "Startup Error",
      err instanceof Error ? (err.stack ?? err.message) : String(err)
    );
    app.quit();
  }
});

app.on("before-quit", () => {
  backendProc?.kill();
  frontendServer?.close();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow(currentPort);
  }
});
