import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { ai } from "~/server/lib/ai";

export const aiRouter = router({
  generate: publicProcedure
    .input(
      z.object({
        prompt: z.string(),
        system: z.string().optional(),
        max_tokens: z.number(),
        temperature: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const response = await ai.generate({
        prompt: input.prompt,
        system: input.system,
        stream: false,
        options: {
          max_tokens: input.max_tokens,
          temperature: input.temperature,
        },
      });

      return {
        text: response,
      } as const;
    }),
});
