import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import net from "node:net";
import os from "node:os";
import https from "node:https";

//Nginx Configuration
// The DHCP-reserved IP of the host machine on the LAN.
// All client traffic routes through Nginx on this IP (port 443).
// Backend continues to run on localhost:3443 behind Nginx.
const NGINX_HOST = "192.168.1.13";
const NGINX_PORT = 443;

function readCachedNetworkFlag(): boolean {
  try {
    const flagPath = path.join(
      app.getPath("userData"),
      "network-path-flag.json"
    );
    if (fs.existsSync(flagPath)) {
      const cached = JSON.parse(fs.readFileSync(flagPath, "utf-8"));
      return cached.isNetworkPath === true;
    }
  } catch {}
  return false;
}

function isRunningFromNetworkSync(): boolean {
  const argv0 = process.argv[0] ?? "";
  if (argv0.startsWith("\\\\") || argv0.startsWith("//")) return true;

  if (readCachedNetworkFlag()) return true;

  const driveLetter = argv0.slice(0, 2);
  if (
    driveLetter.length === 2 &&
    driveLetter[1] === ":" &&
    driveLetter.toUpperCase() !== "C:"
  ) {
    try {
      execSync(`net use ${driveLetter}`, {
        encoding: "utf-8",
        stdio: "pipe",
        timeout: 500,
      });
      return true;
    } catch {}
  }
  return false;
}

function persistNetworkFlag(isNetworkPath: boolean): void {
  try {
    fs.writeFileSync(
      path.join(app.getPath("userData"), "network-path-flag.json"),
      JSON.stringify({ isNetworkPath }),
      "utf-8"
    );
  } catch {}
}

let isUncPath = isRunningFromNetworkSync();

if (isUncPath) {
  // Disable GPU hardware-acceleration — Chromium GPU process fails on network paths
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("no-sandbox");

  // Force software rendering as a fallback
  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("disable-gpu-compositing");
  app.commandLine.appendSwitch("disable-software-rasterizer");
}

async function detectIsNetworkPath(): Promise<boolean> {
  const argv0 = process.argv[0] ?? "";
  if (argv0.startsWith("\\\\") || argv0.startsWith("//")) return true;

  const driveLetter = argv0.slice(0, 2);
  if (driveLetter.length !== 2 || driveLetter[1] !== ":") return false;

  // Run both checks concurrently with a shared short timeout
  const timeout = (ms: number) =>
    new Promise<boolean>((r) => setTimeout(() => r(false), ms));

  const netUseCheck = new Promise<boolean>((resolve) => {
    const child = spawn("net", ["use", driveLetter], { stdio: "pipe" });
    child.on("exit", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });

  const wmiCheck = new Promise<boolean>((resolve) => {
    const child = spawn(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `(Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='${driveLetter}'").DriveType`,
      ],
      { stdio: "pipe" }
    );
    let out = "";
    child.stdout?.on("data", (d) => (out += d));
    child.on("exit", () => resolve(out.trim() === "4"));
    child.on("error", () => resolve(false));
  });

  // First one to return true wins; hard cap at 1.5 s total
  return Promise.race([
    Promise.any([netUseCheck, wmiCheck]),
    timeout(1500).then(() => false),
  ]).catch(() => false);
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
let loadingWindow: BrowserWindow | null = null;
let currentPort = 0;
let servingDir = "";

function getLoadingPagePath(): string {
  if (app.isPackaged) {
    return path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "assets",
      "loading.html"
    );
  }
  return path.join(__dirname, "..", "assets", "loading.html");
}

function createLoadingWindow() {
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    return loadingWindow;
  }

  loadingWindow = new BrowserWindow({
    width: 480,
    height: 380,
    frame: false,
    resizable: false,
    transparent: true,
    show: false,
    icon: getIconPath(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  loadingWindow.loadFile(getLoadingPagePath());

  loadingWindow.once("ready-to-show", () => {
    loadingWindow?.show();
  });

  loadingWindow.on("closed", () => {
    loadingWindow = null;
  });

  return loadingWindow;
}

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

function writeRuntimeConfig(distDir: string, host: string) {
  // With Nginx in place, all traffic goes through NGINX_HOST on port 443.
  // host is always an IP (NGINX_HOST or client's remoteHost).
  const config = {
    apiBaseUrl: `https://${host}/api/v1`,
    socketUrl: `https://${host}`,
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

async function copyDistToLocalAsync(srcDistDir: string): Promise<string> {
  const runId = Date.now().toString(36);
  const localDir = path.join(app.getPath("userData"), "frontend-cache", runId);
  await fs.promises.mkdir(localDir, { recursive: true });
  // fs.promises doesn't have cpSync - use a worker or spawn cp
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "-e",
        `require('fs').cpSync(${JSON.stringify(srcDistDir)}, ${JSON.stringify(localDir)}, {recursive:true})`,
      ],
      {
        stdio: "inherit",
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      }
    );
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`cpSync worker exited ${code}`))
    );
    child.on("error", reject);
  });
  return localDir;
}

async function parseDotenvAsync(
  dotenvPath: string
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  try {
    const content = await fs.promises.readFile(dotenvPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  } catch {}
  return result;
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
  servingDir = distDir;
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = (req.url ?? "/").split("?")[0];

      let filePath = path.join(
        servingDir,
        urlPath === "/" ? "index.html" : urlPath
      );

      if (!path.extname(filePath)) {
        filePath = path.join(servingDir, "index.html");
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          fs.readFile(path.join(servingDir, "index.html"), (err2, fallback) => {
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

async function resolveExeUncPath(): Promise<string | null> {
  const exePath = app.getPath("exe");

  if (exePath.startsWith("\\\\") || exePath.startsWith("//")) {
    return exePath;
  }

  const driveLetter = exePath.slice(0, 2);
  if (driveLetter.length !== 2 || driveLetter[1] !== ":") return null;

  return new Promise<string | null>((resolve) => {
    const child = spawn("net", ["use", driveLetter], { stdio: "pipe" });
    let out = "";
    child.stdout?.on("data", (d) => (out += d));
    child.on("exit", (code) => {
      if (code === 0) {
        const match = out.match(/Remote name\s+(\\\\[^\s]+)/i);
        if (match) {
          const uncRoot = match[1];
          const relativePath = exePath.slice(2);
          resolve(uncRoot + relativePath);
          return;
        }
      }
      resolve(null);
    });
    child.on("error", () => resolve(null));
  });
}

function extractHostnameFromUnc(uncPath: string): string | null {
  const match = uncPath.match(/^\\\\([^\\]+)/);
  return match ? match[1] : null;
}

async function detectConfig(
  dotenv: Record<string, string>,
  uncPath: string | null
): Promise<{
  isClient: boolean;
  remoteHost: string | null;
}> {
  let isClient = false;
  let remoteHost: string | null = null;

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

  ensureFirewallRule(3443, logPath); // Backend (localhost-only, for Nginx -> backend)
  ensureFirewallRule(NGINX_PORT, logPath); // Nginx (LAN-facing, port 443)

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
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.close();
    }
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

// Client connectivity pre-check
// Before loading the window on a client, verify that the host backend
// is actually reachable. Show a retry dialog if not.
async function waitForHostBackend(
  host: string,
  port: number,
  logPath: string
): Promise<void> {
  const singleCheck = (attempt: number) =>
    new Promise<boolean>((resolve) => {
      const req = https.get(
        `https://${host}:${port}/api/v1/health`,
        { timeout: 2000, rejectUnauthorized: false }, // 2 s
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

  // Try 3 times but with 750ms between attempts.
  // Total worst-case: 3 * 2s + 2 * 0.75s = 7.5s
  for (let i = 1; i <= 3; i++) {
    const reachable = await singleCheck(i);
    if (reachable) {
      fs.appendFileSync(
        logPath,
        `[Client] Host backend ${host}:${port} is reachable (attempt ${i})\n`
      );
      return;
    }

    fs.appendFileSync(
      logPath,
      `[Client] Host backend ${host}:${port} unreachable (attempt ${i}/3)\n`
    );

    if (i < 3) {
      await new Promise((r) => setTimeout(r, 750));
    }
  }

  // All retries failed- show user-friendly dialog
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
    throw new Error("User chose to quit - host backend unreachable");
  }
}

app.whenReady().then(async () => {
  createLoadingWindow();
  const logPath = path.join(app.getPath("userData"), "backend.log");

  try {
    const origDistDir = getFrontendDist();
    ensureFileExists(
      path.join(origDistDir, "index.html"),
      "Frontend dist/index.html"
    );

    const backendDir = path.join(getProjectRoot(), "apps", "backend");
    const dotenvPath = path.join(backendDir, ".env");

    // Phase 1: Pure local I/O in parallel
    const [dotenv, isNetworkDrive, uncPath] = await Promise.all([
      parseDotenvAsync(dotenvPath),
      detectIsNetworkPath(),
      resolveExeUncPath(),
    ]);

    isUncPath = isNetworkDrive;
    persistNetworkFlag(isNetworkDrive);

    const config = await detectConfig(dotenv, uncPath);

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
    } else {
      // Host machine: use the DHCP-reserved IP so all traffic goes through Nginx
      targetHost = NGINX_HOST;
    }

    writeRuntimeConfig(origDistDir, targetHost);

    // Phase 2: Start local server and show main window immediately
    const actualPort = await startFrontendServer(origDistDir);
    currentPort = actualPort;
    fs.appendFileSync(
      logPath,
      `[Startup] Frontend server on port ${actualPort}\n`
    );

    ipcMain.handle("get-hostname", () => os.hostname());
    createWindow(actualPort);

    // Phase 3: Background non-blocking network check and initialization
    if (config.isClient) {
      // Client checks Nginx on port 443 (not backend directly on 3443)
      waitForHostBackend(targetHost, NGINX_PORT, logPath)
        .then(() => {
          if (isNetworkDrive) {
            fs.appendFileSync(
              logPath,
              `[Client] Copying dist to local cache in the background...\n`
            );
            return copyDistToLocalAsync(origDistDir).then((localDir) => {
              servingDir = localDir;
              writeRuntimeConfig(localDir, targetHost);
              fs.appendFileSync(
                logPath,
                `[Client] Local dist ready: ${servingDir}\n`
              );
              cleanOldCacheDirs(localDir);
            });
          }
        })
        .catch((err) => {
          fs.appendFileSync(
            logPath,
            `[Client] Background connectivity error: ${err instanceof Error ? err.message : String(err)}\n`
          );
        });
    } else {
      startBackendIfNeeded(config.isClient, logPath, dotenv, dotenvPath).catch(
        (err) => {
          fs.appendFileSync(
            logPath,
            `[Backend] Startup error: ${err instanceof Error ? err.message : String(err)}\n`
          );
          dialog.showErrorBox(
            "Backend Error",
            `The backend failed to start:\n\n${err instanceof Error ? err.message : String(err)}`
          );
        }
      );
    }
  } catch (err) {
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.close();
    }
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
