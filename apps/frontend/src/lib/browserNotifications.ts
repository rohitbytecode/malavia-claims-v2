import type { Notification as AppNotification } from "../types/domain";

const APP_NOTIFICATION_PERMISSION_KEY =
  "hicms-notification-permission-prompted";
const NOTIFICATION_SERVICE_WORKER_URL = "/notification-sw.js";

export type BrowserNotificationPermission =
  | NotificationPermission
  | "unsupported";

function browserNotificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

function serviceWorkerNotificationsSupported() {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof navigator.serviceWorker.register === "function"
  );
}

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (!browserNotificationsSupported()) return "unsupported";
  return globalThis.Notification.permission;
}

export function hasPromptedForBrowserNotifications() {
  if (typeof window === "undefined") return false;
  return (
    window.localStorage.getItem(APP_NOTIFICATION_PERMISSION_KEY) === "true"
  );
}

export async function requestBrowserNotificationPermission() {
  if (!browserNotificationsSupported()) return "unsupported" as const;
  if (globalThis.Notification.permission !== "default") {
    return globalThis.Notification.permission;
  }

  window.localStorage.setItem(APP_NOTIFICATION_PERMISSION_KEY, "true");
  return globalThis.Notification.requestPermission();
}

export function requestPermissionAfterLoginInteraction() {
  if (!browserNotificationsSupported()) return () => undefined;
  if (globalThis.Notification.permission !== "default") return () => undefined;

  const request = () => {
    requestBrowserNotificationPermission();
    cleanup();
  };

  const cleanup = () => {
    window.removeEventListener("pointerdown", request);
    window.removeEventListener("keydown", request);
  };

  window.addEventListener("pointerdown", request, { once: true });
  window.addEventListener("keydown", request, { once: true });

  return cleanup;
}

async function getNotificationServiceWorkerRegistration() {
  if (!serviceWorkerNotificationsSupported()) return null;

  const existingRegistration = await navigator.serviceWorker.getRegistration(
    NOTIFICATION_SERVICE_WORKER_URL
  );

  if (existingRegistration) return existingRegistration;

  return navigator.serviceWorker.register(NOTIFICATION_SERVICE_WORKER_URL, {
    scope: "/",
  });
}

export async function showBrowserNotification(notification: AppNotification) {
  if (!browserNotificationsSupported()) return;
  if (globalThis.Notification.permission !== "granted") return;

  const options: NotificationOptions & { renotify?: boolean } = {
    body: notification.message,
    tag: notification.entityId ?? notification._id,
    renotify: true,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: { entityId: notification.entityId },
  };

  const registration = await getNotificationServiceWorkerRegistration().catch(
    () => null
  );

  if (registration) {
    await registration.showNotification(notification.title, options);
    return;
  }

  const browserNotification = new globalThis.Notification(
    notification.title,
    options
  );

  browserNotification.onclick = () => {
    window.focus();
    if (notification.entityId) {
      window.location.assign(`/claims/${notification.entityId}`);
    }
    browserNotification.close();
  };
}

export function playNotificationSound() {
  const AudioContext =
    window.AudioContext ||
    (
      window as typeof window & {
        webkitAudioContext?: typeof window.AudioContext;
      }
    ).webkitAudioContext;
  if (!AudioContext) return;

  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(740, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    520,
    audioContext.currentTime + 0.16
  );

  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + 0.22
  );

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.24);

  window.setTimeout(() => audioContext.close(), 320);
}
