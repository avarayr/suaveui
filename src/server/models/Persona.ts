import { z } from "zod";
import { db } from "~/server/db";
import { createId } from "@paralleldrive/cuid2";
import { type TPersona } from "../schema/Persona";

export const Persona = {
  async get(id: string) {
    const ref = await db.ref(`personas/${id}`).get<TPersona>();
    return ref.val<TPersona>();
  },

  async getByIDs(ids: string[]) {
    const ref = await db
      .ref(`personas`)
      .query()
      .filter("id", "in", ids)
      .sort("createdAt", false)
      .get<TPersona>();
    const personas = ref.getValues();
    return personas;
  },

  async all() {
    const ref = db.query("personas");
    const personas = (await ref.get<TPersona>()).getValues();
    return personas;
  },

  async create(persona: Omit<TPersona, "id" | "createdAt">) {
    const id = createId();
    const ref = await db.ref(`personas/${id}`).set({
      id: createId(),
      ...persona,
      createdAt: new Date(),
    });

    return (await ref.get())?.val<TPersona>();
  },

  async delete(id: string) {
    const ref = await db.ref(`personas/${id}`).remove();
    return (await ref.get())?.val<TPersona>();
  },

  async update(id: string, persona: TPersona) {
    const ref = await db.ref(`personas/${id}`).update(persona);
    return (await ref.get())?.val<TPersona>();
  },
};
