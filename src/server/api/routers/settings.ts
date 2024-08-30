// routers/settings.ts
import { SettingsSchemas } from "~/server/schema/Settings";
import { publicProcedure, router } from "../trpc";
import { Settings } from "~/server/models/Settings";
import { z } from "zod";
import { ProviderDefaults } from "~/server/schema/Settings";
import { ai } from "~/server/lib/ai";

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

        return ((await response.json()) as { data: { id: string }[] }).data.map((model) => model.id);
      } catch (error) {
        console.error("Error fetching models:", error);
        throw new Error("Failed to fetch models, check if the base url is correct.");
      }
    }),
});
