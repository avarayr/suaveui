import { z } from "zod";
import { db } from "../db";
import webPushAPI from "web-push";

export const WebPushSubscriptionSchema = z.object({
  id: z.string(),
  endpoint: z.string(),
  expirationTime: z.number().nullable(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  createdAt: z.date(),
});

export type WebPushSubscription = z.infer<typeof WebPushSubscriptionSchema>;

type Notification = {
  title: string;
  message: string;
};

export const WebPush = {
  sendNotification: async (message: Notification) => {
    // Get all notifications
    const subscriptions = (await db.query("web-push-subscriptions").get<WebPushSubscription>()).getValues();

    for (const subscription of subscriptions) {
      const { expirationTime } = subscription;

      // Check expiration time
      // Expiration is a number
      if (expirationTime && expirationTime < Date.now()) {
        // Delete the subscription
        await db.ref(`web-push-subscriptions/${subscription.id}`).remove();
        continue;
      }

      if (!import.meta.env.VITE_VAPID_PUBLIC || typeof import.meta.env.VITE_VAPID_PUBLIC !== "string") {
        throw new Error("VITE_VAPID_PUBLIC environment variable not set.");
      }

      if (!process.env.VAPID_PRIVATE || typeof process.env.VAPID_PRIVATE !== "string") {
        throw new Error("VAPID_PRIVATE environment variable not set.");
      }
      try {
        webPushAPI.setVapidDetails(
          `mailto:example@example.com`,
          import.meta.env.VITE_VAPID_PUBLIC,
          process.env.VAPID_PRIVATE,
        );

        const result = await webPushAPI.sendNotification(subscription, JSON.stringify(message));

        if (result.statusCode !== 201 && result.statusCode !== 200) {
          throw new Error("Failed to send notification " + result.body);
        }
      } catch (e) {
        console.error(e);
        return false;
      }
    }
  },
};
