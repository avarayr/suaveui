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
        model: process.env.MODEL!,
        prompt: input.prompt,
        system: input.system,
        stream: false,
        options: {
          num_predict: input.max_tokens,
          temperature: input.temperature ?? 1,
        },
      });

      return {
        text: response.response,
      } as const;
    }),
});
