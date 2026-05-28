import { useEffect, useState } from "react";
import {
  getBrowserNotificationPermission,
  hasPromptedForBrowserNotifications,
  requestBrowserNotificationPermission,
  type BrowserNotificationPermission,
} from "../../lib/browserNotifications";

function permissionLabel(permission: BrowserNotificationPermission) {
  if (permission === "granted") return "Desktop alerts enabled";
  if (permission === "denied") return "Notifications blocked";
  if (permission === "unsupported") return "Desktop alerts unavailable";
  return "Enable desktop alerts";
}

export function NotificationPermissionPrompt() {
  const [permission, setPermission] = useState<BrowserNotificationPermission>(
    () => getBrowserNotificationPermission()
  );
  const [requesting, setRequesting] = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    hasPromptedForBrowserNotifications()
  );

  useEffect(() => {
    const updatePermission = () =>
      setPermission(getBrowserNotificationPermission());

    window.addEventListener("focus", updatePermission);
    document.addEventListener("visibilitychange", updatePermission);

    return () => {
      window.removeEventListener("focus", updatePermission);
      document.removeEventListener("visibilitychange", updatePermission);
    };
  }, []);

  const requestPermission = async () => {
    setRequesting(true);
    const nextPermission = await requestBrowserNotificationPermission();
    setPermission(nextPermission);
    setDismissed(nextPermission === "granted");
    setRequesting(false);
  };

  if (permission === "granted" || permission === "unsupported") return null;
  if (dismissed && permission === "default") return null;

  return (
    <div
      className={`notification-permission notification-permission--${permission}`}
      role="status"
    >
      <span className="notification-permission__dot" aria-hidden="true" />
      <div className="notification-permission__copy">
        <strong>{permissionLabel(permission)}</strong>
        <span>
          {permission === "denied"
            ? "Allow notifications in browser site settings to receive inactive-tab alerts."
            : "Required for alerts while this tab is inactive or minimized."}
        </span>
      </div>
      {permission === "default" ? (
        <button type="button" onClick={requestPermission} disabled={requesting}>
          {requesting ? "Requesting…" : "Allow"}
        </button>
      ) : null}
      {permission === "default" ? (
        <button
          className="notification-permission__dismiss"
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss notification permission prompt"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
