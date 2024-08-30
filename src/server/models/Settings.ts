import { z } from "zod";
import { db } from "~/server/db";
import { createId } from "@paralleldrive/cuid2";

export const Settings = {
  async getValue<T>(key: string): Promise<T | null> {
    const ref = await db.ref(`settings/${key}`).get<T>();
    return ref.val();
  },

  async setValue<T>(key: string, value: T) {
    const ref = await db.ref(`settings/${key}`).set(value);
    return (await ref.get())?.val() as T;
  },
};
