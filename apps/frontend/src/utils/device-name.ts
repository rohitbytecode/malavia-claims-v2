export async function getDeviceName(): Promise<string> {
  if ((window as any).electronAPI?.getHostname) {
    try {
      return await (window as any).electronAPI.getHostname();
    } catch {}
  }

  let deviceName = localStorage.getItem("device_name");
  if (!deviceName) {
    const userAgent = navigator.userAgent;
    const isWindows = userAgent.includes("Windows");
    const isMac = userAgent.includes("Macintosh");
    const os = isMac ? "macOS" : isWindows ? "Windows" : "Linux";

    const rand = Math.floor(100 + Math.random() * 900);
    deviceName = `Browser (${os}-${rand})`;
    localStorage.setItem("device_name", deviceName);
  }
  return deviceName;
}
