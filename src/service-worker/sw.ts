import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

self.addEventListener("message", (event) => {
  if ((event?.data as { type?: string })?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

/**
 * On push notification, show the notification ONLY if the clients.visibilityState is hidden
 */
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const data = JSON.parse(
        event?.data?.text() || `{ "title": "SuaveUI", "message": "You have a new notification" }`,
      ) as { title?: string; message?: string; silent?: boolean };

      if (!data.title || !data.message) {
        return;
      }

      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const anyVisibleClients = allClients.some((c) => c.visibilityState === "visible");

      if (anyVisibleClients) {
        return;
      }

      await self.registration.showNotification(data.title, {
        body: data.message,
        icon: "/assets/pwa/android-chrome-192x192.png",
        silent: data.silent ?? false,
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event?.notification.close();
  event?.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList.find((c) => !c.focused)?.focus();
      }
      return self.clients.openWindow("/");
    }),
  );
});

// self.__WB_MANIFEST is default injection point
precacheAndRoute(self.__WB_MANIFEST);

// clean old assets
cleanupOutdatedCaches();

// to allow work offline
// registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));
