"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, CircleSlash, MessageCircle, Plus, UserPlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { type z } from "zod";
import { PersonaSchema } from "~/server/schema/Persona";
import { api } from "~/trpc/react";
import { camelCaseToSpaced } from "~/utils/string";
import { AnimatedStep } from "./primitives/AnimatedStep";
import { BottomSheet } from "./primitives/BottomSheet";
import { Button } from "./primitives/Button";
import { Input } from "./primitives/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./primitives/Select";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const Views = {
  NewChat: "newChat",
  NewPersona: "newPersona",
} as const;

export function NewChatDrawer(props: Props) {
  const [view, setView] = useState<(typeof Views)[keyof typeof Views]>(Views.NewChat);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | undefined>();

  const onNewPersona = () => {
    setView(Views.NewPersona);
  };

  const onDismiss = () => {
    setView(Views.NewChat);
    props.onClose?.();
  };

  const onNewPersonaDismiss = (newPersonaId?: string) => {
    if (newPersonaId) {
      setSelectedPersonaId(newPersonaId);
    }
    setView(Views.NewChat);
  };

  return (
    <BottomSheet
      open={props.isOpen}
      onDismiss={onDismiss}
      snapPoints={({ maxHeight, minHeight }) => [minHeight, maxHeight * 0.9]}
      className="overflow-hidden"
    >
      <AnimatePresence initial={false} mode="wait">
        {view === Views.NewChat && (
          <NewChatDrawerContent
            onDismiss={onDismiss}
            onNewPersona={onNewPersona}
            selectedPersonaId={selectedPersonaId}
          />
        )}

        {view === Views.NewPersona && <NewPersonaDrawerContent onDismiss={onNewPersonaDismiss} />}
      </AnimatePresence>
    </BottomSheet>
  );
}

function NewChatDrawerContent({
  onNewPersona,
  onDismiss,
  selectedPersonaId,
}: {
  onNewPersona: () => void;
  onDismiss: () => void;
  selectedPersonaId: string | undefined;
}) {
  const utils = api.useUtils();
  const newChatMutation = api.chat.create.useMutation({
    onSuccess: () => {
      onDismiss();
      void utils.chat.all.refetch();
    },
  });

  const personas = api.persona.all.useQuery();

  const [personaId, setPersonaId] = useState<string | Omit<string, "_create"> | undefined>(selectedPersonaId);

  /**
   * Select the first persona when it loads
   */
  useEffect(() => {
    if (personas.data && personas.data.length > 0) {
      setPersonaId(personas.data[0]?.id);
    }
  }, [personas.data]);

  const onPersonaChange = (value: string) => {
    if (value === "_create") {
      setPersonaId("");
      onNewPersona();
      return;
    }
    setPersonaId(value);
  };

  const handleCreateClick = async () => {
    if (!personaId) {
      return;
    }

    await newChatMutation.mutateAsync({
      personaIDs: [personaId as string],
    });
  };

  return (
    <AnimatedStep>
      <div className="mb-3 flex items-center text-2xl font-bold">
        <MessageCircle className="mr-2 size-5" />
        New Chat
      </div>

      <div className="flex flex-col gap-3">
        <section className="flex flex-row gap-3">
          <Select onValueChange={onPersonaChange} value={personaId as string}>
            <SelectTrigger loading={personas.isPending}>
              <SelectValue placeholder="Select Persona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_create" icon={<Plus className="size-5" />}>
                Create New
              </SelectItem>
              <hr className="my-1" />
              {personas.data?.map((persona) => (
                <SelectItem key={persona.id} value={persona.id}>
                  {persona.name}
                </SelectItem>
              ))}
              {personas.data?.length === 0 && (
                <SelectItem disabled value="_" icon={<CircleSlash className="size-5" />}>
                  No personas found
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          <Button size={"sm"} variant={"link"} onClick={onNewPersona}>
            New
          </Button>
        </section>

        <section className="mt-2 flex flex-row gap-3 *:w-full sm:flex-row">
          <Button size="lg" variant="outline" className="bg-transparent" onClick={onDismiss}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="default"
            onClick={() => void handleCreateClick()}
            loading={newChatMutation.isPending}
          >
            Create
          </Button>
        </section>
      </div>
    </AnimatedStep>
  );
}

function NewPersonaDrawerContent({ onDismiss }: { onDismiss: (createdPersonaId?: string) => void }) {
  const createPersonaMutation = api.persona.create.useMutation();

  const formProps = useForm<z.infer<typeof PersonaSchema>>({
    resolver: zodResolver(PersonaSchema.omit({ id: true, createdAt: true })),
    defaultValues: {
      avatar: null,
    },
  });

  const { register } = formProps;

  async function onSubmit(data: z.infer<typeof PersonaSchema>) {
    const result = await createPersonaMutation.mutateAsync({ persona: data });
    if (result.id) {
      onDismiss(result.id);
    }
  }

  const descriptors = Object.keys(
    PersonaSchema.shape.descriptors.shape,
  ) as (keyof typeof PersonaSchema.shape.descriptors.shape)[];

  return (
    <AnimatedStep>
      <FormProvider {...formProps}>
        <form
          onSubmit={
            formProps.handleSubmit(onSubmit, (errors) => {
              toast.error(
                Object.entries(errors)
                  .map(([key, error]) => {
                    return `${camelCaseToSpaced(key)}: ${error.message!}`;
                  })
                  .join("<br />"),
              );
            }) as () => void
          }
        >
          <div className="mb-3 flex items-center text-2xl font-bold">
            <UserPlusIcon className="mr-2 size-5" />
            New Persona
          </div>

          <div className="flex flex-col gap-3">
            <section className="w-full flex-col gap-3">
              <Input
                intent={"secondary"}
                label="Name"
                generative={{
                  prompt: "Generate a random name",
                  system: "You are a random name generator, do not output anything other what you're asked to generate",
                  max_tokens: 3,
                  temperature: 1.4,
                }}
                {...register("name")}
              />

              <hr className="mt-2" />

              {descriptors.map((descriptor) => (
                <div key={descriptor} className="flex flex-col gap-3">
                  <Input
                    intent={"secondary"}
                    label={camelCaseToSpaced(descriptor)}
                    generative={{
                      prompt: `This is a descriptor of a person. Generate a random ${descriptor}`,
                      system: `You are a random ${descriptor} generator, do not output anything other what you're asked to generate. Do not start with "The ${descriptor} is" or "Here is a ${descriptor}". Only output the ${descriptor}. You must generate real-world values. Do not make up random values.`,
                      max_tokens: 10,
                      temperature: 1.4,
                    }}
                    {...register(`descriptors.${descriptor}`)}
                  />
                </div>
              ))}
            </section>

            {/* CTA */}
            <section className="mt-2 flex flex-row gap-3 *:w-full sm:flex-row">
              <Button size="lg" variant="outline" className="bg-transparent" onClick={() => onDismiss()} type="button">
                <ArrowLeft className="size-5" />
              </Button>
              <Button size="lg" variant="default" type="submit" loading={createPersonaMutation.isPending}>
                Create
              </Button>
            </section>
          </div>
        </form>
      </FormProvider>
    </AnimatedStep>
  );
}
