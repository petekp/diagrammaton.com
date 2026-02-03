import { z } from "zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat";
import type {
  Action,
  ActionDataMap,
  generateInputSchema,
  modifyInputSchema,
} from "~/app/types";

const shapes = [
  "SQUARE",
  "ELLIPSE",
  "ROUNDED_RECTANGLE",
  "DIAMOND",
  "TRIANGLE_UP",
  "TRIANGLE_DOWN",
  "PARALLELOGRAM_RIGHT",
  "PARALLELOGRAM_LEFT",
  "ENG_DATABASE",
  "ENG_QUEUE",
  "ENG_FILE",
  "ENG_FOLDER",
] as const;

const magnetPositions = ["TOP", "RIGHT", "BOTTOM", "LEFT"] as const;

const shapeSchema = z.enum(shapes);
const magnetSchema = z.enum(magnetPositions);

const linkLabelSchema = z.union([
  z
    .string()
    .trim()
    .min(1, "Connector labels should be deliberate when present."),
  z.literal(""),
  z.null(),
]);

export const diagramNodeSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1, "Nodes must include a unique identifier like `signup_entry`."),
    label: z
      .string()
      .trim()
      .min(1, "Nodes must include a descriptive label.")
      .max(120, "Keep labels brief so they render nicely in FigJam."),
    shape: shapeSchema,
  })
  .strict();

export const diagramLinkSchema = z
  .object({
    label: linkLabelSchema,
    fromMagnet: magnetSchema,
    toMagnet: magnetSchema,
  })
  .strict();

export const diagramStepSchema = z
  .object({
    from: diagramNodeSchema,
    link: diagramLinkSchema.nullable(),
    to: diagramNodeSchema,
  })
  .strict();

export const diagramResponseSchema = z
  .object({
    steps: z
      .array(diagramStepSchema)
      .max(250, "Keep diagrams focused; cap them at 250 transitions."),
    message: z
      .union([
        z
          .string()
          .min(1, "Messages must include text when provided.")
          .max(240),
        z.null(),
      ]),
  })
  .strict();

export type DiagramResponse = z.infer<typeof diagramResponseSchema>;

export const generateMessages = <T extends z.infer<typeof Action>>({
  action,
  data,
}: {
  action: T;
  data: ActionDataMap[T];
}) => {
  switch (action) {
    case "generate":
      return createGenerateMessages(data as ActionDataMap["generate"]);

    case "modify":
      return createModifyMessages(data as ActionDataMap["modify"]);

    default:
      return createGenerateMessages(data as ActionDataMap["generate"]);
  }
};

export const createGenerateMessages = (
  data: z.infer<typeof generateInputSchema>
): Array<ChatCompletionMessageParam> => {
  const { diagramDescription } = data;
  return [
    {
      role: "system",
      content: `You are an advanced AI that designs immaculate FigJam-ready flow diagrams from natural-language requirements. Always respond with JSON that **strictly matches** the schema provided by the host application:

{
  "steps": [
    {
      "from": { "id": string, "label": string, "shape": one of ${shapes.join(
        ", "
      )} },
      "link": {
        "label": string | "" | null,
        "fromMagnet": one of ${magnetPositions.join(", ")},
        "toMagnet": one of ${magnetPositions.join(", ")}
      } | null,
      "to": { "id": string, "label": string, "shape": one of ${shapes.join(
        ", "
      )} }
    }
  ],
  "message": string | null
}

Guidelines:
- Think through the entire experience, anticipating unhappy paths, retries, escalations, and operational guardrails.
- Use shape semantics rigorously (DIAMOND for questions, ROUNDED_RECTANGLE for processes, PARALLELOGRAM_RIGHT for I/O, ENG_DATABASE for storage, etc.).
- Default connector magnets to RIGHT→LEFT, but follow these overrides: decision "Yes" exits right, "No" exits bottom; use BOTTOM for backwards links.
- Keep node labels concise, question labels for decisions, and favor witty clarity when narrating outcomes.
- If the instructions are impossible or unsafe, emit an empty \`steps\` array and set \`message\` to a witty, helpful explanation. Otherwise set \`message\` to null.
- Never invent data that conflicts with user intent; enrich with domain best practices when it improves completeness.`,
    },
    {
      role: "user",
      content: `Infer an exhaustive diagram based on following description: "${diagramDescription}". `,
    },
  ];
};

export const createModifyMessages = (
  data: z.infer<typeof modifyInputSchema>
): Array<ChatCompletionMessageParam> => {
  const { diagramData, instructions } = data;
  return [
    {
      role: "system",
      content: `You are an expert FigJam diagram editor. Update the provided diagram so the final JSON response **strictly matches** the agreed schema (steps array of node transitions plus a nullable message). Preserve healthy existing structure, only inserting, removing, or tweaking nodes and connectors required to satisfy the instructions with best-practice UX flows. Maintain shape semantics, magnet guidance, and keep labels crisp. When the instructions cannot be satisfied, return an empty \`steps\` array and a witty helpful \`message\`; otherwise \`message\` must be null.`,
    },
    {
      role: "user",
      content: `Modify the following diagram data according to these instructions:\n\nDiagram data: ${diagramData}\n\n Instructions: "${instructions}"\n\n Based on your deep knowledge of best practices and well-established patterns, ensure the diagram is faithful to the original, but updated to satisfy the modification instructions. Keenly anticipate steps not included in the instructions, particularly error states and similar edge cases that may not be explicitly mentioned. Think step by step to ensure the diagram is complete and meets a high standard. If the instructions are unclear or impossible to follow, print an error that's both witty and helpful; don't apologize or say things like "oops".`,
    },
  ];
};
