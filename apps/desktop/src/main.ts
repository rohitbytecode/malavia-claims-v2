import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import net from "node:net";
import os from "node:os";



app.on(
  "certificate-error",
  (event, _webContents, _url, _error, _cert, callback) => {
    event.preventDefault();
    callback(true);
  }
);

function getIconPath(): string {
  if (app.isPackaged) {
    return path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "assets",
      "logo.ico"
    );
  }
  return path.join(__dirname, "..", "assets", "logo.ico");
}


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
    "server.bundle.cjs"
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

function getLanIp(): string {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === "IPv4" && !addr.internal) {
        return addr.address;
      }
    }
  }
  return "127.0.0.1";
}

function writeRuntimeConfig(distDir: string, ip: string) {
  const config = {
    apiBaseUrl: `https://${ip}:3443/api/v1`,
    socketUrl: `https://${ip}:3443`,
  };
  fs.writeFileSync(
    path.join(distDir, "config.json"),
    JSON.stringify(config, null, 2)
  );
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

    server.listen(port, "0.0.0.0", () => {
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

function resolveExeUncPath(): string | null {
  const exePath = app.getPath("exe");

  if (exePath.startsWith("\\\\")) {
    return exePath;
  }

  const driveLetter = exePath.slice(0, 2);
  try {
    const output = execSync(`net use ${driveLetter}`, { encoding: "utf-8" });
    const match = output.match(/Remote name\s+(\\\\[^\s]+)/i);
    if (match) {
      const uncRoot = match[1];
      const relativePath = exePath.slice(2);
      return uncRoot + relativePath;
    }
  } catch {
  }

  return null;
}

function extractHostnameFromUnc(uncPath: string): string | null {
  const match = uncPath.match(/^\\\\([^\\]+)/);
  return match ? match[1] : null;
}

function detectConfig(dotenv: Record<string, string>): { isClient: boolean; remoteHost: string | null } {
  let isClient = false;
  let remoteHost: string | null = null;

  const uncPath = resolveExeUncPath();
  if (uncPath) {
    const hostFromPath = extractHostnameFromUnc(uncPath);
    if (hostFromPath) {
      isClient = true;
      remoteHost = hostFromPath;
      return { isClient, remoteHost };
    }
  }

  if (process.env.IS_CLIENT === "true" || process.env.REMOTE_HOST || process.env.HOST_IP) {
    isClient = true;
    remoteHost = process.env.REMOTE_HOST || process.env.HOST_IP || null;
  }

  if (dotenv.IS_CLIENT === "true" || dotenv.REMOTE_HOST || dotenv.HOST_IP) {
    isClient = true;
    if (!remoteHost) {
      remoteHost = dotenv.REMOTE_HOST || dotenv.HOST_IP || null;
    }
  }

  try {
    const userDataPath = path.join(app.getPath("userData"), "desktop-config.json");
    if (fs.existsSync(userDataPath)) {
      const config = JSON.parse(fs.readFileSync(userDataPath, "utf-8"));
      if (config.isClient === true || config.isClient === "true") {
        isClient = true;
      }
      if (config.remoteHost || config.hostIp) {
        remoteHost = config.remoteHost || config.hostIp;
        isClient = true;
      }
    }
  } catch (err) {
  }

  try {
    const exeDir = path.dirname(app.getPath("exe"));
    const exeConfigPath = path.join(exeDir, "desktop-config.json");
    if (fs.existsSync(exeConfigPath)) {
      const config = JSON.parse(fs.readFileSync(exeConfigPath, "utf-8"));
      if (config.isClient === true || config.isClient === "true") {
        isClient = true;
      }
      if (config.remoteHost || config.hostIp) {
        remoteHost = config.remoteHost || config.hostIp;
        isClient = true;
      }
    }
  } catch (err) {
  }

  return { isClient, remoteHost };
}

async function startBackendIfNeeded(
  isClient: boolean,
  logPath: string,
  dotenv: Record<string, string>,
  dotenvPath: string
): Promise<void> {
  if (isClient) {
    fs.appendFileSync(
      logPath,
      `\n[Backend] Skipping local backend startup (Client Mode active)\n`
    );
    return;
  }

  const backendEntry = getBackendEntry();
  ensureFileExists(backendEntry, "Backend dist/server.js");

  const backendDir = path.join(getProjectRoot(), "apps", "backend");

  fs.appendFileSync(
    logPath,
    `\nbackendDir: ${backendDir}\ndotenvPath: ${dotenvPath}\nexists: ${fs.existsSync(dotenvPath)}\nbackendEntry: ${backendEntry}\n`
  );

  const env = {
    ...dotenv,
    ...process.env,
    PORT: "3443",
    MONGO_URI: dotenv.MONGO_URI ?? "mongodb://localhost:27017/hicms-prod",
  };

  try {
    const { execFileSync } = await import("node:child_process");
    const result = execFileSync("netstat", ["-ano"]).toString();
    const lines = result
      .split("\n")
      .filter((l) => l.includes(":3443") && l.includes("LISTENING"));
    for (const line of lines) {
      const pid = line.trim().split(/\s+/).pop();
      if (pid && pid !== "0") {
        execFileSync("taskkill", ["/PID", pid, "/F"]);
        fs.appendFileSync(logPath, `\nKilled PID ${pid} on port 3443\n`);
      }
    }
  } catch {
    // ignore
  }

  backendProc = spawn(process.execPath, [backendEntry], {
    cwd: path.join(getProjectRoot(), "apps", "backend"),
    env: {
      ...env,
      ELECTRON_RUN_AS_NODE: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const logStream = fs.createWriteStream(logPath, { flags: "a" });

  backendProc.stdout?.pipe(logStream);
  backendProc.stderr?.pipe(logStream);

  backendProc.on("exit", (code) => {
    fs.appendFileSync(logPath, `\nBackend exited with code: ${code}\n`);
  });

  const backendPort = 3443;

  const requestOnce = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      socket.on("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.on("error", () => resolve(false));
      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(backendPort, "127.0.0.1");
    });
  };

  const timeoutMs = 60_000;
  const start = Date.now();

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
    icon: getIconPath(),
    webPreferences: {
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

    const backendDir = path.join(getProjectRoot(), "apps", "backend");
    const dotenvPath = path.join(backendDir, ".env");
    const logPath = path.join(app.getPath("userData"), "backend.log");

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

    const config = detectConfig(dotenv);

    const uncPath = resolveExeUncPath();
    fs.appendFileSync(
      logPath,
      `\n[Startup] Detected configuration: isClient=${config.isClient}, remoteHost=${config.remoteHost}, hostname=${os.hostname()}, lanIp=${getLanIp()}, exePath=${app.getPath("exe")}, uncPath=${uncPath ?? "(local)"}\n`
    );

    let targetHost: string;
    if (config.isClient) {
      if (!config.remoteHost) {
        throw new Error(
          "Client mode is detected, but could not determine the host.\n\n" +
          "This can happen if the app is not running from a network shared folder.\n" +
          "Please ensure the app is accessed via a network path (e.g. \\\\HOSTNAME\\share).\n\n" +
          "Alternatively, create a 'desktop-config.json' next to the .exe with:\n" +
          "{\n" +
          '  "isClient": true,\n' +
          '  "remoteHost": "HOSTNAME"\n' +
          "}"
        );
      }
      targetHost = config.remoteHost;
    } else {
      targetHost = os.hostname();
    }

    writeRuntimeConfig(distDir, targetHost);

    const actualPort = await startFrontendServer(distDir, 49200);
    currentPort = actualPort;
    await startBackendIfNeeded(config.isClient, logPath, dotenv, dotenvPath);
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
