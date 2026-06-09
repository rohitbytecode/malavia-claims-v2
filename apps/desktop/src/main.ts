import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import net from "node:net";
import os from "node:os";
import https from "node:https";

function isRunningFromNetwork(): boolean {
  const argv0 = process.argv[0] ?? "";

  if (argv0.startsWith("\\\\") || argv0.startsWith("//")) return true;

  const driveLetter = argv0.slice(0, 2);
  if (driveLetter.length === 2 && driveLetter[1] === ":") {
    try {
      execSync(`net use ${driveLetter}`, {
        encoding: "utf-8",
        stdio: "pipe",
        timeout: 3000,
      });
      return true; 
    } catch {
    }

    try {
      const result = execSync(
        `powershell -NoProfile -Command "(Get-WmiObject Win32_LogicalDisk -Filter \"DeviceID='${driveLetter}'\").DriveType"`,
        { encoding: "utf-8", stdio: "pipe", timeout: 5000 }
      ).trim();
      if (result === "4") return true; // DriveType 4 = Network Drive
    } catch {
      // WMI check failed — not critical
    }
  }

  return false;
}

const isUncPath = isRunningFromNetwork();

if (isUncPath) {
  // Disable GPU hardware-acceleration — Chromium GPU process fails on network paths
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("no-sandbox");

  // Force software rendering as a fallback
  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("disable-gpu-compositing");
  app.commandLine.appendSwitch("disable-software-rasterizer");
}

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

const machineId = `claim-mgmt-${os.hostname()}-${os.userInfo().username}`;
const gotLock = app.requestSingleInstanceLock({ key: machineId });

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      createWindow(currentPort);
    }
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let backendProc: ChildProcess | null = null;
let backendAlreadyRunning = false;
let frontendServer: http.Server | null = null;
let mainWindow: BrowserWindow | null = null;
let currentPort = 0;
let servingDir = "";

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
  try {
    fs.writeFileSync(
      path.join(distDir, "config.json"),
      JSON.stringify(config, null, 2)
    );
  } catch (err) {
    console.warn("Could not write config.json to distDir:", err);
  }
}

function copyDistToLocal(srcDistDir: string): string {
  const runId = Date.now().toString(36);
  const localDir = path.join(app.getPath("userData"), "frontend-cache", runId);

  fs.mkdirSync(localDir, { recursive: true });
  fs.cpSync(srcDistDir, localDir, { recursive: true });

  return localDir;
}

function cleanOldCacheDirs(keepDir: string) {
  try {
    const cacheRoot = path.join(app.getPath("userData"), "frontend-cache");
    if (!fs.existsSync(cacheRoot)) return;
    for (const entry of fs.readdirSync(cacheRoot)) {
      const full = path.join(cacheRoot, entry);
      if (full === keepDir) continue;

      fs.rm(full, { recursive: true, force: true }, () => {});
    }
  } catch {}
}

function startFrontendServer(distDir: string): Promise<number> {
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

    server.listen(0, "0.0.0.0", () => {
      frontendServer = server;
      const addr = server.address() as net.AddressInfo;
      resolve(addr.port);
    });

    server.on("error", reject);
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
  } catch {}

  return null;
}

function extractHostnameFromUnc(uncPath: string): string | null {
  const match = uncPath.match(/^\\\\([^\\]+)/);
  return match ? match[1] : null;
}

function detectConfig(dotenv: Record<string, string>): {
  isClient: boolean;
  remoteHost: string | null;
} {
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

  if (
    process.env.IS_CLIENT === "true" ||
    process.env.REMOTE_HOST ||
    process.env.HOST_IP
  ) {
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
    const userDataPath = path.join(
      app.getPath("userData"),
      "desktop-config.json"
    );
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
  } catch (err) {}

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
  } catch (err) {}

  return { isClient, remoteHost };
}

function ensureFirewallRule(port: number, logPath: string) {
  const ruleName = `ClaimManagement-Backend-${port}`;
  try {
    // Check if the rule already exists
    execSync(`netsh advfirewall firewall show rule name="${ruleName}"`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    fs.appendFileSync(
      logPath,
      `[Firewall] Rule "${ruleName}" already exists\n`
    );
  } catch {
    // If doesn't exist - create it
    try {
      execSync(
        `netsh advfirewall firewall add rule name="${ruleName}" ` +
          `dir=in action=allow protocol=TCP localport=${port} ` +
          `profile=private,domain`,
        { encoding: "utf-8", stdio: "pipe" }
      );
      fs.appendFileSync(
        logPath,
        `[Firewall] Created rule "${ruleName}" for port ${port}\n`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      fs.appendFileSync(
        logPath,
        `[Firewall] WARNING: Could not create firewall rule. ` +
          `Clients on the LAN may not be able to connect. ` +
          `Run the app as Administrator once, or manually allow TCP port ${port}.\n` +
          `  Error: ${msg}\n`
      );
    }
  }
}

// function isPortListening(port: number): Promise<boolean> {
//   return new Promise((resolve) => {
//     const socket = new net.Socket();
//     socket.setTimeout(2000);
//     socket.on("connect", () => {
//       socket.destroy();
//       resolve(true);
//     });
//     socket.on("error", () => resolve(false));
//     socket.on("timeout", () => {
//       socket.destroy();
//       resolve(false);
//     });
//     socket.connect(port, "127.0.0.1");
//   });
// }

async function isBackendHealthy(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = https.get(
      `https://127.0.0.1:${port}/api/v1/health`,
      {
        timeout: 2000,
        rejectUnauthorized: false,
      },
      (res: any) => {
        res.resume();
        resolve(res.statusCode === 200);
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function registerBackendAutoStart(
  electronExe: string,
  backendEntry: string,
  backendCwd: string,
  env: Record<string, string>,
  logPath: string
) {
  try {
    const launcherDir = path.join(app.getPath("userData"), "backend-launcher");
    fs.mkdirSync(launcherDir, { recursive: true });

    const batPath = path.join(launcherDir, "start-backend.bat");
    const envLines = Object.entries(env)
      .filter(([k]) =>
        [
          "PORT",
          "MONGO_URI",
          "JWT_SECRET",
          "ELECTRON_RUN_AS_NODE",
          "NODE_ENV",
        ].includes(k)
      )
      .map(([k, v]) => `set "${k}=${v}"`)
      .join("\r\n");

    const batContent =
      `@echo off\r\n` +
      `cd /d "${backendCwd}"\r\n` +
      `${envLines}\r\n` +
      `set "ELECTRON_RUN_AS_NODE=1"\r\n` +
      `"${electronExe}" "${backendEntry}"\r\n`;
    fs.writeFileSync(batPath, batContent, "utf-8");

    const vbsPath = path.join(launcherDir, "start-backend.vbs");
    const vbsContent =
      `Set WshShell = CreateObject("WScript.Shell")\r\n` +
      `WshShell.Run """${batPath}""", 0, False\r\n`;
    fs.writeFileSync(vbsPath, vbsContent, "utf-8");

    execSync(
      `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" ` +
        `/v "ClaimManagement-Backend" /t REG_SZ ` +
        `/d "wscript.exe \\"${vbsPath}\\"" /f`,
      { encoding: "utf-8", stdio: "pipe" }
    );

    fs.appendFileSync(
      logPath,
      `[AutoStart] Registered backend for Windows startup\n`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    fs.appendFileSync(
      logPath,
      `[AutoStart] WARNING: Could not register auto-start: ${msg}\n`
    );
  }
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

  ensureFirewallRule(3443, logPath);

  const backendPort = 3443;

  const alreadyUp = await isBackendHealthy(backendPort);
  if (alreadyUp) {
    backendAlreadyRunning = true;
    fs.appendFileSync(
      logPath,
      `\n[Backend] Port ${backendPort} already listening — reusing existing backend\n`
    );
    return;
  }

  const backendEntry = getBackendEntry();
  ensureFileExists(backendEntry, "Backend dist/server.js");

  const backendCwd = path.join(getProjectRoot(), "apps", "backend");

  fs.appendFileSync(
    logPath,
    `\nbackendDir: ${backendCwd}\ndotenvPath: ${dotenvPath}\nexists: ${fs.existsSync(dotenvPath)}\nbackendEntry: ${backendEntry}\n`
  );

  const env: Record<string, string> = {
    ...dotenv,
    ...(process.env as Record<string, string>),
    PORT: "3443",
    MONGO_URI: dotenv.MONGO_URI ?? "mongodb://localhost:27017/hicms-prod",
  };

  // Spawn backend as a DETACHED process so it survives the Electron app closing.
  const outLog = fs.openSync(logPath, "a");
  const errLog = fs.openSync(logPath, "a");

  backendProc = spawn(process.execPath, [backendEntry], {
    cwd: backendCwd,
    env: {
      ...env,
      ELECTRON_RUN_AS_NODE: "1",
    },
    detached: true,
    stdio: ["ignore", outLog, errLog],
  });

  backendProc.unref();

  backendProc.on("exit", (code) => {
    fs.appendFileSync(logPath, `\nBackend exited with code: ${code}\n`);
  });

  registerBackendAutoStart(
    process.execPath,
    backendEntry,
    backendCwd,
    env,
    logPath
  );

  const timeoutMs = 60_000;
  const start = Date.now();

  while (true) {
    const ok = await isBackendHealthy(backendPort);
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

  const logPath = path.join(app.getPath("userData"), "backend.log");

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: getIconPath(),
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: isUncPath ? false : undefined,
      preload: app.isPackaged
        ? path.join(process.resourcesPath, "app.asar.unpacked", "preload.cjs")
        : path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow = win;

  win.once("ready-to-show", () => {
    win.show();
    setTimeout(() => cleanOldCacheDirs(servingDir), 5000);
  });

  win.on("closed", () => {
    mainWindow = null;
  });

  win.webContents.on("render-process-gone", (_event, details) => {
    const msg = `Renderer crashed: reason=${details.reason}, exitCode=${details.exitCode}`;
    console.error(msg);
    try {
      fs.appendFileSync(logPath, `\n[RENDERER CRASH] ${msg}\n`);
    } catch {
      /* ignore */
    }

    dialog.showErrorBox(
      "Display Error",
      `The display process crashed (${details.reason}).\n\n` +
        `If you are running from a network share, this may be a graphics ` +
        `driver compatibility issue.\n\nThe app will now close.`
    );
    app.quit();
  });

  win.webContents.on("did-fail-load", (_event, errorCode, errorDesc, url) => {
    const msg = `Failed to load: code=${errorCode}, desc=${errorDesc}, url=${url}`;
    console.error(msg);
    try {
      fs.appendFileSync(logPath, `\n[LOAD FAIL] ${msg}\n`);
    } catch {}
  });

  setTimeout(() => {
    if (!win.isDestroyed() && !win.isVisible()) {
      win.show();
    }
  }, 15_000);

  win.loadURL(`http://127.0.0.1:${port}`);
  return win;
}

// ── Client connectivity pre-check ────────────────────────────────────
// Before loading the window on a client, verify that the host backend
// is actually reachable. Show a retry dialog if not.
async function waitForHostBackend(
  host: string,
  port: number,
  logPath: string
): Promise<void> {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const reachable = await new Promise<boolean>((resolve) => {
      const req = https.get(
        `https://${host}:${port}/api/v1/health`,
        { timeout: 5000, rejectUnauthorized: false },
        (res: any) => {
          res.resume();
          resolve(res.statusCode === 200);
        }
      );
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
    });

    if (reachable) {
      fs.appendFileSync(
        logPath,
        `[Client] Host backend ${host}:${port} is reachable (attempt ${attempt})\n`
      );
      return;
    }

    fs.appendFileSync(
      logPath,
      `[Client] Host backend ${host}:${port} unreachable (attempt ${attempt}/${maxRetries})\n`
    );

    if (attempt < maxRetries) {
      // Wait 2 seconds between retries
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // All retries failed — show user-friendly dialog
  const response = dialog.showMessageBoxSync({
    type: "warning",
    title: "Cannot Connect to Server",
    message:
      `Unable to connect to the server at ${host}:${port}.\n\n` +
      `Possible reasons:\n` +
      `• The host computer is turned off or not on the network\n` +
      `• The application is not running on the host computer\n` +
      `• Windows Firewall is blocking the connection\n\n` +
      `Would you like to continue anyway?`,
    buttons: ["Continue Anyway", "Quit"],
    defaultId: 0,
    cancelId: 1,
  });

  if (response === 1) {
    app.quit();
    throw new Error("User chose to quit — host backend unreachable");
  }
}

app.whenReady().then(async () => {
  const logPath = path.join(app.getPath("userData"), "backend.log");

  try {
    const origDistDir = getFrontendDist();
    ensureFileExists(
      path.join(origDistDir, "index.html"),
      "Frontend dist/index.html"
    );

    const backendDir = path.join(getProjectRoot(), "apps", "backend");
    const dotenvPath = path.join(backendDir, ".env");

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
      `\n[Startup ${new Date().toISOString()}] isClient=${config.isClient}, ` +
        `remoteHost=${config.remoteHost}, hostname=${os.hostname()}, ` +
        `lanIp=${getLanIp()}, exePath=${app.getPath("exe")}, ` +
        `uncPath=${uncPath ?? "(local)"}, isUncPath=${isUncPath}\n`
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

      // Pre-check: verify host backend is reachable before loading the UI
      await waitForHostBackend(targetHost, 3443, logPath);
    } else {
      targetHost = os.hostname();
    }

    let servingDir: string;
    if (config.isClient) {
      fs.appendFileSync(logPath, `[Client] Copying dist to local cache...\n`);
      servingDir = copyDistToLocal(origDistDir);
      fs.appendFileSync(logPath, `[Client] Local dist: ${servingDir}\n`);
    } else {
      servingDir = origDistDir;
    }

    writeRuntimeConfig(servingDir, targetHost);

    const actualPort = await startFrontendServer(servingDir);
    currentPort = actualPort;
    fs.appendFileSync(
      logPath,
      `[Startup] Frontend server on port ${actualPort}\n`
    );

    await startBackendIfNeeded(config.isClient, logPath, dotenv, dotenvPath);
    ipcMain.handle("get-hostname", () => os.hostname());
    createWindow(actualPort);
  } catch (err) {
    console.error(err);
    try {
      fs.appendFileSync(
        logPath,
        `\n[FATAL ERROR] ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`
      );
    } catch {}
    dialog.showErrorBox(
      "Startup Error",
      err instanceof Error ? (err.stack ?? err.message) : String(err)
    );
    app.quit();
  }
});

app.on("before-quit", () => {
  // Do NOT kill the backend - it must keep running for LAN clients
  // even after the Electron UI is closed.
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
