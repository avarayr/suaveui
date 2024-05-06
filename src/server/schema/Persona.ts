import { z } from "zod";

export const PersonaDescriptorSchema = // all values must be strings and optional
  z
    .object({
      age: z.string().refine((age) => parseInt(age) >= 18, {
        message: "Age must be at least 18",
      }),
      personality: z.string(),
      gender: z.string(),
      pronouns: z.string(),
      occupation: z.string(),
      interests: z.string(),
      hobbies: z.string(),
      ethnicity: z.string(),
      religion: z.string(),
      education: z.string(),
      relationshipStatus: z.string(),
      location: z.string(),
      familyStatus: z.string(),
      bodyType: z.string(),
      physicalAttributes: z.string(),
      healthAttributes: z.string(),
      socialAttributes: z.string(),
    })
    .partial();

export const PersonaSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  avatar: z.string().nullable(),
  descriptors: PersonaDescriptorSchema,
  createdAt: z.date(),
});

export type TPersona = z.infer<typeof PersonaSchema>;
export type TPersonaDescriptor = z.infer<typeof PersonaDescriptorSchema>;
