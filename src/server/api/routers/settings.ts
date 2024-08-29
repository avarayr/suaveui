import { SettingsSchemas } from "~/server/schema/Settings";
import { publicProcedure, router } from "../trpc";
import { Settings } from "~/server/models/Settings";
import { z } from "zod";
import { ProviderDefaults } from "~/server/schema/Settings";

export const settingsRouter = router({
  general: publicProcedure.query(async () => {
    const provider = await Settings.getValue<z.infer<typeof SettingsSchemas.provider>>("provider");

    return provider;
  }),

  setProvider: publicProcedure.input(SettingsSchemas.provider).mutation(async ({ input }) => {
    const providerType = input.type;
    const defaults = ProviderDefaults[providerType] || {};

    // Apply defaults for undefined values
    const settingsWithDefaults = Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        value === undefined ? defaults[key as keyof typeof defaults] : value,
      ]),
    );

    // Save the settings (replace this with your actual save logic)
    await Settings.setValue("provider", settingsWithDefaults);

    return settingsWithDefaults;
  }),
});
