import { db } from "~/server/db";
import webpush from "web-push";

export type VapidKey = {
  publicKey: string;
  privateKey: string;
};

export const VapidKeys = {
  async get() {
    const ref = await db.ref("vapidKeys").get<VapidKey>();
    return ref.val();
  },

  async generate() {
    const vapidKeys = webpush.generateVAPIDKeys();
    await db.ref("vapidKeys").set({
      publicKey: vapidKeys.publicKey,
      privateKey: vapidKeys.privateKey,
    });
    return vapidKeys;
  },
};
