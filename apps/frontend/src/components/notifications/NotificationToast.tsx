import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../../store/notification.store";

export function NotificationToast() {
  const navigate = useNavigate();
  const { toasts, dismissToast } = useNotificationStore();

  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismissToast(toast._id), 7000)
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [dismissToast, toasts]);

  return (
    <div
      className="notification-toast-stack"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <article className="notification-toast" key={toast._id}>
          <div className="notification-toast__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z" />
              <path d="m9 12 2 2 4-5" />
            </svg>
          </div>
          <div className="notification-toast__content">
            <div className="notification-toast__eyebrow">Real-time update</div>
            <h3>{toast.title}</h3>
            <p>{toast.message}</p>
            <div className="notification-toast__actions">
              {toast.entityId ? (
                <button
                  className="notification-action notification-action--primary"
                  type="button"
                  onClick={() => navigate(`/claims/${toast.entityId}`)}
                >
                  View claim
                </button>
              ) : null}
              <button
                className="notification-action notification-action--ghost"
                type="button"
                onClick={() => dismissToast(toast._id)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
