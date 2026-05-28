self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const entityId = event.notification.data?.entityId;
  const targetUrl = entityId ? `/claims/${entityId}` : "/dashboard";
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existingClient = clients.find((client) => {
          const clientUrl = new URL(client.url);
          return clientUrl.origin === self.location.origin;
        });

        if (existingClient) {
          existingClient.navigate(absoluteUrl);
          return existingClient.focus();
        }

        return self.clients.openWindow(absoluteUrl);
      })
  );
});
