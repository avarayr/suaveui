import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "~/components/primitives/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/primitives/Select";
import { SettingsSchemas, ProviderDefaults } from "~/server/schema/Settings";
import { api } from "~/trpc/react";
import { Button } from "~/components/primitives/Button";

const icons: Record<string, React.ReactNode> = {
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

type ProviderSchema = z.infer<typeof SettingsSchemas.provider>;

export const GeneralTab: React.FC = () => {
  const [isSaved, setIsSaved] = useState(false);
  const { data: generalSettings, isLoading: isSettingsLoading, refetch } = api.settings.general.useQuery();
  const { mutate: updateSettings, isPending: isSetProviderPending } = api.settings.setProvider.useMutation({
    onSuccess: async () => {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 1000);
      await refetch();
    },
    onError: (error) => {
      console.error("Error updating settings:", error);
    },
  });

  const { control, handleSubmit, watch, reset, setValue, getValues } = useForm<ProviderSchema>({
    resolver: zodResolver(SettingsSchemas.provider),
    defaultValues: generalSettings || { type: "Ollama" },
  });

  const selectedProvider = watch("type");

  React.useEffect(() => {
    if (generalSettings) {
      reset(generalSettings);
    }
  }, [generalSettings, reset]);

  React.useEffect(() => {
    if (selectedProvider in ProviderDefaults) {
      const defaults = ProviderDefaults[selectedProvider];
      Object.entries(defaults).forEach(([key, value]) => {
        const currentValue = getValues(key as keyof ProviderSchema);
        if (currentValue === undefined) {
          setValue(key as keyof ProviderSchema, value as ProviderSchema[keyof ProviderSchema], {
            shouldValidate: true,
            shouldDirty: false,
          });
        }
      });
    }
  }, [selectedProvider, setValue, getValues]);

  const onSubmit = handleSubmit((data: ProviderSchema) => {
    // Replace empty strings with undefined
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value === "" ? undefined : value]),
    ) as ProviderSchema;
    updateSettings(cleanedData);
  });

  if (isSettingsLoading) {
    return <div>Loading...</div>;
  }

  const providerFields =
    SettingsSchemas.provider.options.find((option) => option.shape.type.value === selectedProvider)?.shape || {};

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xl font-bold">Provider</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit();
        }}
        className="space-y-4"
      >
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {SettingsSchemas.provider.options.map((option) => (
                  <SelectItem key={option.shape.type.value} value={option.shape.type.value}>
                    <span className="flex items-center gap-2">
                      <span className="size-4">{icons[option.shape.type.value]}</span>
                      {option.shape.type.value}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />

        {Object.entries(providerFields).map(([fieldName, schema]) => {
          if (fieldName === "type") return null;
          return (
            <Controller
              key={fieldName}
              name={fieldName as keyof ProviderSchema}
              control={control}
              render={({ field, fieldState: { error } }) => (
                <div>
                  <label htmlFor={fieldName} className="block text-sm font-medium text-gray-700">
                    {fieldName}
                  </label>
                  <Input {...field} id={fieldName} className="mt-1" intent="secondary" />
                  {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
                </div>
              )}
            />
          );
        })}

        <Button
          type="submit"
          variant={isSaved ? "outline" : "destructive"}
          className="w-full"
          disabled={isSetProviderPending || isSaved}
        >
          {isSaved ? "Saved!" : isSetProviderPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
};
