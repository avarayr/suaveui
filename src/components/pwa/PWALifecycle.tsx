"use client";
import { useEffect } from "react";
import type { Workbox } from "workbox-window";

declare global {
  interface Window {
    workbox: Workbox;
  }
}

export function PWALifeCycle() {
  // This hook only run once in browser after the component is rendered for the first time.
  // It has same effect as the old componentDidMount lifecycle callback.
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.workbox !== undefined
    ) {
      const wb = window.workbox;
      // add event listeners to handle PWA lifecycle events
      wb.addEventListener("installed", (event) => {
        console.log(`Event ${event.type} is triggered.`);
        console.log(event);
      });

      wb.addEventListener("waiting", () => {
        // Send a message to the waiting service worker, instructing it to activate.
        wb.messageSkipWaiting();
        wb.addEventListener("controlling", () => {
          window.location.reload();
        });
      });

      wb.addEventListener("controlling", (event) => {
        console.log(`Event ${event.type} is triggered.`);
        console.log(event);
      });

      wb.addEventListener("activated", (event) => {
        console.log(`Event ${event.type} is triggered.`);
        console.log(event);
      });

      // Don't forget to call register as automatic registration is disabled.
      void wb.register();
    }
  }, []);

  return null;
}
