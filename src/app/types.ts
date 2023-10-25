import { z } from "zod";

export const Action = z.union([z.literal("generate"), z.literal("modify")]);

export const modelSchema = z.union([z.literal("gpt3"), z.literal("gpt4")]);

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
