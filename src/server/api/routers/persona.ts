import { z } from "zod";
import { publicProcedure, router } from "~/server/api/trpc";
import { Persona } from "~/server/models/Persona";
import { PersonaSchema } from "~/server/schema/Persona";

export const personaRouter = router({
  all: publicProcedure.query(async () => {
    const personas = await Persona.all();
    return personas;
  }),
  create: publicProcedure
    .input(
      z.object({ persona: PersonaSchema.omit({ id: true, createdAt: true }) }),
    )
    .mutation(async ({ input }) => {
      const persona = await Persona.create(input.persona);
      if (!persona) throw new Error("Failed to create persona");

      return {
        id: persona.id,
        name: persona.name,
        avatar: persona.avatar,
      };
    }),
});
