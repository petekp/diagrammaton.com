import { z } from "zod";

export const Action = z.union([z.literal("generate"), z.literal("modify")]);

// Accept legacy values but normalize to "gpt5"
export const modelSchema = z.preprocess((val) => {
  const v = String(val);
  if (v === "gpt3" || v === "gpt-3.5" || v === "gpt4" || v === "gpt-4") {
    return "gpt5";
  }
  return v;
}, z.literal("gpt5"));

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
