import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { notificationApi } from "../../api/services";
import { useNotificationStore } from "../../store/notification.store";

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotificationStore();

  const onRead = async (id: string) => {
    await notificationApi.markRead(id);
    markRead(id);
  };

  const onReadAll = async () => {
    await notificationApi.markAllRead();
    markAllRead();
  };

  const openClaim = async (id: string, entityId?: string) => {
    if (!entityId) return;

    try {
      await onRead(id);
    } finally {
      setOpen(false);
      navigate(`/claims/${entityId}`);
    }
  };

  return (
    <div className="notification-center">
      <button
        type="button"
        className="notification-bell"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="notification-bell__badge">{unreadCount}</span>
        ) : null}
      </button>

      {open ? (
        <section className="notification-panel">
          <header className="notification-panel__header">
            <div>
              <p className="notification-panel__eyebrow">Live event stream</p>
              <h2>Notifications</h2>
            </div>
            <button
              className="notification-panel__mark-all"
              type="button"
              onClick={onReadAll}
              disabled={unreadCount === 0}
            >
              Mark all read
            </button>
          </header>

          <div className="notification-panel__list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <span>✓</span>
                <strong>No notifications yet</strong>
                <p>Claim status changes will appear here instantly.</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((item) => (
                <article
                  className={`notification-item${item.isRead ? "" : " notification-item--unread"}`}
                  key={item._id}
                >
                  <div
                    className="notification-item__status"
                    aria-hidden="true"
                  />
                  <div className="notification-item__body">
                    <div className="notification-item__topline">
                      <h3>{item.title}</h3>
                      <time dateTime={item.createdAt}>
                        {formatNotificationTime(item.createdAt)}
                      </time>
                    </div>
                    <p>{item.message}</p>
                    <div className="notification-item__actions">
                      {!item.isRead ? (
                        <button type="button" onClick={() => onRead(item._id)}>
                          Mark read
                        </button>
                      ) : null}
                      {item.entityId ? (
                        <button
                          type="button"
                          onClick={() => openClaim(item._id, item.entityId)}
                        >
                          Open claim
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
