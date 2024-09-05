// routers/settings.ts
import { SettingsSchemas, ProviderDefaults } from "~/server/schema/Settings";
import { publicProcedure, router } from "../trpc";
import { Settings } from "~/server/models/Settings";
import { z } from "zod";
import { ai } from "~/server/lib/ai";
import { startCloudflared, stopCloudflared } from "~/server/lib/cloudflared";
import { isUrlAlive } from "~/server/lib/urlCheck";

export const settingsRouter = router({
  general: publicProcedure.query(async () => {
    const provider = await Settings.getValue<z.infer<typeof SettingsSchemas.provider>>("provider");
    return provider || null; // Return null if no settings are found
  }),

  getProviderDefaults: publicProcedure
    .input(
      z.object({
        name: z.string().refine((value) => Object.keys(ProviderDefaults).includes(value), {
          message: "Provider not found",
        }),
      }),
    )
    .query(({ input }) => {
      const providerType = input.name as keyof typeof ProviderDefaults;
      return ProviderDefaults[providerType] || {};
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

    // Save the settings
    await Settings.setValue("provider", settingsWithDefaults);

    return settingsWithDefaults;
  }),
  getAvailbaleModels: publicProcedure
    .input(
      z.object({
        baseUrl: z.string().optional(),
        apiKey: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      let { baseUrl } = input;
      const { apiKey } = input;
      // get baseUrl from provider if not provided
      baseUrl ||= await ai.getBaseUrl();

      try {
        const response = await fetch(`${baseUrl}/models`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch models");
        }

        return ((await response.json()) as { data: { id: string }[] }).data
          .map((model) => model.id)
          .toSorted((a, b) => a.localeCompare(b));
      } catch (error) {
        console.error("Error fetching models:", error);
        throw new Error("Failed to fetch models, check if the base url is correct.");
      }
    }),
  getProviderSettings: publicProcedure.input(z.object({ providerType: z.string() })).query(async ({ input }) => {
    const allSettings = await Settings.getValue<z.infer<typeof SettingsSchemas.provider>>("provider");
    const providerDefaults = ProviderDefaults[input.providerType as keyof typeof ProviderDefaults] || {};

    if (allSettings && allSettings.type === input.providerType) {
      return allSettings;
    } else {
      return { ...providerDefaults, type: input.providerType } as z.infer<typeof SettingsSchemas.provider>;
    }
  }),

  enableRemoteAccess: publicProcedure.mutation(async () => {
    const url = await startCloudflared();
    return { url };
  }),

  getRemoteAccessUrl: publicProcedure.query(async () => {
    const url = await Settings.getValue<string>("remoteAccessUrl");
    if (url) {
      const isAlive = await isUrlAlive(url);
      if (isAlive) {
        return { url };
      } else {
        // If the URL is not alive, clear it from the database
        await Settings.setValue("remoteAccessUrl", null);
      }
    }
    return { url: null };
  }),
});
