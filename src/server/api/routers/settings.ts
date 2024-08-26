import { SettingsSchemas } from "~/server/schema/Settings";
import { publicProcedure, router } from "../trpc";
import { Settings } from "~/server/models/Settings";
import { z } from "zod";

export const settingsRouter = router({
  general: publicProcedure.query(async () => {
    const provider = await Settings.getValue<z.infer<typeof SettingsSchemas.provider>>("provider");

    return provider;
  }),

  setProvider: publicProcedure.input(SettingsSchemas.provider).mutation(async ({ input }) => {
    await Settings.setValue("provider", input);
  }),
});
