interface RuntimeConfig {
  apiBaseUrl: string;
  socketUrl: string;
}

let _config: RuntimeConfig | null = null;

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (_config) return _config;

  try {
    const res = await fetch("/config.json");
    if (res.ok) {
      _config = await res.json();
      return _config!;
    }
  } catch {}

  _config = {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
    socketUrl: import.meta.env.VITE_SOCKET_URL ?? window.location.origin,
  };
  return _config;
}

export function getRuntimeConfig(): RuntimeConfig {
  if (!_config) throw new Error("Runtime config not loaded yet");
  return _config;
}
