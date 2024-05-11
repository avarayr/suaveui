import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { db } from "~/server/db";
import { createId } from "@paralleldrive/cuid2";
import { WebPushSubscription } from "~/server/models/WebPushSubscription";

export const notificationRouter = router({
  /**
   * Stores web-push Push subscription data in the database
   */
  storeSubscription: publicProcedure
    .input(
      z.object({
        subscription: z.object({
          endpoint: z.string(),
          expirationTime: z.number().optional().nullable(),
          keys: z.object({
            p256dh: z.string(),
            auth: z.string(),
          }),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      const { subscription } = input;
      /**
       * Push into /web-push-subscriptions
       */
      const id = createId();
      await db.ref<WebPushSubscription>(`web-push-subscriptions/${id}`).set({
        id,
        ...subscription,
        expirationTime: subscription.expirationTime ?? null,
        createdAt: new Date(),
      } as const);

      return { id };
    }),

  /**
   * Removes web-push Push subscription data from the database
   */
  removeSubscription: publicProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { subscriptionId } = input;
      // TODO:remove
      // remove all subscriptions for this user
      await db.ref<WebPushSubscription>(`web-push-subscriptions`).remove();

      // await db.ref<WebPushSubscription>(`web-push-subscriptions/${subscriptionId}`).remove();
    }),

  /**
   * Deletes web-push Push subscription data from the database
   */
});
