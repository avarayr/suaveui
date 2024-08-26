import React, { useEffect, useRef, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { Input } from "~/components/primitives/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/primitives/Select";
import { SettingsSchemas } from "~/server/schema/Settings";
import { api } from "~/trpc/react";
import { FormProvider, useForm, Controller } from "react-hook-form";
import { z } from "zod";

const icons: Record<
  "Ollama" | "LM Studio" | "Jan" | "OpenAI" | "OpenRouter" | "Any OpenAI-compatible",
  React.ReactNode
> = {
  Ollama: "🦙",
  "LM Studio": (
    <img
      alt=""
      src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAAYABgDASIAAhEBAxEB/8QAGQABAAIDAAAAAAAAAAAAAAAAAAEEAgUG/8QAJRAAAgIBAwMEAwAAAAAAAAAAAQIDBAAFESESImEjMUGxEzJR/8QAGQEAAgMBAAAAAAAAAAAAAAAAAQQAAgMF/8QAGxEAAwEAAwEAAAAAAAAAAAAAAAECAwQRIRL/2gAMAwEAAhEDEQA/AGm0KqQCITpB07AAoSW88Zbs6O6R9UcryHf9RCwzHTK8LsJHkhc7H02LAjn34y/etSQQkxozkg8pNL2+c6tU5r5kqkcrfrdSvFYiI+O5diDjIt2JJpC0hfc89zE/eMYeU37S9NFJNTUGCiarMULDYlTsR4y/X16SNHW2JrIb29dl2H84xjBErSE6REjU6nerOzSRwfhHwDIW+8Yxi3I3vKlMhb6P/9k="
    />
  ),
  Jan: "👋",
  OpenAI: (
    <img
      alt=""
      src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAAYABcDASIAAhEBAxEB/8QAFwABAQEBAAAAAAAAAAAAAAAAAAUBA//EACcQAAEDAwMEAgMBAAAAAAAAAAECAwQABRESITETIkFhUXEUIyVD/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AIUGzJgWx67TS0440wHG4hGo95CUKWOMb5x6H1VpTspSpVvuX9uSMa2UlLbEfn/QgaT9Y+N/HC4sLcjzrgtC0wLw00rrIGv8ZQUDhSdjpyCMj1t4rJTlxmXtxw9B6zSFlSdekMuJJPHH7OeO/NBMulsjLZlFmC5bJcMJLsdxwuJcSVadSVY8Ej0QdqVXtD4kOw7S4HF225sqcDK15UwUrUcJXjJGUefmlBKt91jvMxS7PXbJcNHSQ6houJdbyThSfkZPo5qs7GkOttS4CDenlpKRKdCUMRxse1APaR5zjHNKUEiZfDbYzMC2KR1WWktrnNk6juVqSk+BqUd9icUpSg//2Q=="
    />
  ),
  OpenRouter: (
    <img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAAYABgDASIAAhEBAxEB/8QAGAABAQEBAQAAAAAAAAAAAAAAAAUGAQT/xAAoEAABBAEDAwIHAAAAAAAAAAABAAIDBBEFBiESMWEUgSJBQlFSkcH/xAAWAQEBAQAAAAAAAAAAAAAAAAABAAL/xAAWEQEBAQAAAAAAAAAAAAAAAAABABH/2gAMAwEAAhEDEQA/AMJXrzWphFBG6R57ALQwbTAiDrdsMcfkwcD3KtadNp0kL26WYWux2DcH3HcrJ61X1P1ZdeD5Pxc0ZZjx9lrAs7tS1jb9StVE8NlsJDRxIeHnx5RRL8N2N0ZuCTlo6C7kYxxhEMl54pZIZGyRPLHtOQ5pwQr1bdtiNgbYgZMR9QPSSiKFJy7q25W2q5grwN6XD4nSDP6H9REUuxl//9k=" />
  ),
  "Any OpenAI-compatible": "🦜",
};

export const GeneralTab = () => {
  const generalSettings = api.settings.general.useQuery();
  const changeProviderMutation = api.settings.setProvider.useMutation({
    onSettled: () => generalSettings.refetch(),
  });

  const methods = useForm<z.infer<typeof SettingsSchemas.provider>>();
  const { handleSubmit, setValue, watch, reset, register } = methods;

  const onSubmit = (data: FormData) => {
    const dataJSON = Object.fromEntries(Object.entries(data));
    changeProviderMutation.mutate(dataJSON as any);
  };

  const debouncedSubmit = useDebounceCallback(() => {
    void handleSubmit(onSubmit)();
  }, 200);

  const providersSchema = SettingsSchemas.provider.options;
  const selectedProvider = watch("type");

  // Add this useEffect to trigger debouncedSubmit only when values change
  React.useEffect(() => {
    const subscription = methods.watch((value, { name, type }) => {
      debouncedSubmit();
    });
    return () => subscription.unsubscribe();
  }, [methods, debouncedSubmit]);

  React.useEffect(() => {
    if (generalSettings.data) {
      reset(generalSettings.data);
    }
  }, [generalSettings.data, reset]);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xl font-bold">Provider</h3>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Select
            name="type"
            value={selectedProvider}
            onValueChange={(value) => {
              setValue("type", value as any);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              {providersSchema.map((provider) => (
                <SelectItem
                  key={provider.shape.type.value}
                  value={provider.shape.type.value}
                  icon={<span className="size-4">{icons[provider.shape.type.value]}</span>}
                >
                  {provider.shape.type.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedProvider && (
            <div className="mt-2 flex flex-col gap-2">
              {Object.keys(providersSchema.find((option) => option.shape.type.value === selectedProvider)?.shape || {})
                .filter((fieldName) => fieldName !== "type")
                .map((fieldName) => (
                  <div key={fieldName} className="flex flex-col gap-3">
                    <label className="text-sm font-bold">{fieldName}</label>
                    <Input intent="secondary" name={fieldName} {...register(fieldName)} />
                  </div>
                ))}
            </div>
          )}
        </form>
      </FormProvider>
    </div>
  );
};
