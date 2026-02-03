import { z } from "zod";
import { normalizeLegacyModelId } from "~/app/models";

export const Action = z.union([z.literal("generate"), z.literal("modify")]);

// Accept legacy values but normalize to modern model identifiers
export const modelSchema = z.preprocess((val) => {
  if (typeof val !== "string") {
    return val;
  }
  return normalizeLegacyModelId(val.trim());
}, z.string().min(1));

export const generateInputSchema = z.object({
  diagramDescription: z.string(),
  licenseKey: z.string(),
  model: modelSchema,
});

export const modifyInputSchema = z.object({
  diagramData: z.string(),
  instructions: z.string(),
  licenseKey: z.string(),
  model: modelSchema,
});

export const actionSchemas = {
  generate: generateInputSchema,
  modify: modifyInputSchema,
};

export type ActionDataMap = {
  generate: z.infer<typeof generateInputSchema>;
  modify: z.infer<typeof modifyInputSchema>;
};
