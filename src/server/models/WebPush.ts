import { z } from "zod";
import { db } from "../db";
import webPushAPI from "web-push";
import { VapidKeys } from "./VapidKey";

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
    const vapidKeys = await VapidKeys.get();
    if (!vapidKeys) {
      throw new Error("VAPID keys not found. Please generate them first.");
    }

    const subscriptions = (await db.query("web-push-subscriptions").get<WebPushSubscription>()).getValues();

    for (const subscription of subscriptions) {
      const { expirationTime } = subscription;

      if (expirationTime && expirationTime < Date.now()) {
        await db.ref(`web-push-subscriptions/${subscription.id}`).remove();
        continue;
      }

      try {
        webPushAPI.setVapidDetails("mailto:example@example.com", vapidKeys.publicKey, vapidKeys.privateKey);

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
