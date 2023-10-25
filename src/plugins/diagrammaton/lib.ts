import { ChatCompletionMessage } from "openai/resources/chat";
import { z } from "zod";
import {
  Action,
  ActionDataMap,
  generateInputSchema,
  modifyInputSchema,
} from "~/app/types";

const shapes = [
  "ROUNDED_RECTANGLE",
  "ELLIPSE",
  "DIAMOND",
  "SQUARE",
  "TRIANGLE_UP",
  "TRIANGLE_DOWN",
  "ENG_DATABASE",
  "PARALLELOGRAM_RIGHT",
  "PARALLELOGRAM_LEFT",
];

const magnet = ["TOP", "RIGHT", "BOTTOM", "LEFT"];

const nodeSchema = {
  type: "object",
  required: ["id", "label", "shape"],
  description:
    "A node in the diagram. The shape of the node should make sense in the overall context of the diagram.",
  properties: {
    id: {
      type: "string",
      description:
        "A unique identifier for the diagram node. Must be unique across all diagram nodes.",
    },
    label: {
      type: "string",
      description: "The label for the diagram node.",
    },
    shape: {
      type: "string",
      enum: shapes,
      description:
        "The shape for the diagram node. Must be one of the provided enum values.",
    },
  },
};

const linkSchema = {
  type: "object",
  description:
    "Completely optional, connective link between two nodes taking magnet positions into account. Forward links between adjacent nodes are horizontal. Vertical should be used mostly for backwards links and exceptions. Sometimes it's best not to have a label where a link is obvious!",
  properties: {
    label: {
      type: "string",
      description:
        "A completely optional (can be blank!), very concise label of no more than 2-3 words.",
    },
    fromNodeId: {
      type: "string",
      description: "ID of the origin node",
    },
    toNodeId: {
      type: "string",
      description: "ID of the target node",
    },
    fromMagnet: {
      type: "string",
      enum: magnet,
      description:
        "Magnet position on the origin node where the link originates.",
    },
    toMagnet: {
      type: "string",
      enum: magnet,
      description:
        "Magnet position on the target node where the link terminates.",
    },
  },
};

const messageSchema = {
  type: "string",
  description:
    "A witty, humorous, and very concise description of the issue encountered and how the user can resolve it.",
};

export const functions = [
  {
    name: "generate_diagram_json",
    description: `Translates a diagram description into valid JSON`,
    parameters: {
      type: "object",
      properties: {
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: nodeSchema,
              link: linkSchema,
              to: nodeSchema,
            },
          },
        },
      },
    },
    required: ["steps"],
  },
  {
    name: "generate_error_message",
    description:
      "Prints witty and very concise user-facing error explaining why you weren't able to draw a diagram based on the provided diagram description.",
    type: "object",
    parameters: {
      type: "object",
      properties: {
        message: messageSchema,
      },
    },
    required: ["message"],
  },
];

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
): Array<ChatCompletionMessage> => {
  const { diagramDescription } = data;
  return [
    {
      role: "system",
      content: `You are an advanced AI specialized (but not limited to) generating UI/UX-oriented flow diagrams from simple, user-generated natural language text descriptions. Link labels are not always necessary (blank is fine) but should remain crisp and succinct. If you're unable to generate a useful diagram from the description, print an error that's both witty and helpful; don't apologize or say things like "oops".`,
    },
    {
      role: "user",
      content: `Generate an exhaustive diagram from the following description: "${diagramDescription}". Based on your deep knowledge of best practices and well-established patterns, ensure the diagram is thorough & detailed. Keenly anticipate steps not included in the description, particularly error states and similar edge cases that may not be explicitly mentioned. Think step by step to ensure the diagram is complete and meets a high standard.`,
    },
  ];
};

export const createModifyMessages = (
  data: z.infer<typeof modifyInputSchema>
): Array<ChatCompletionMessage> => {
  const { diagramData, instructions } = data;
  return [
    {
      role: "system",
      content: `You are an advanced AI specialized (but not limited to) modifying existing UI/UX-oriented flow diagram data based on natural language instructions provided by the end user.`,
    },
    {
      role: "user",
      content: `Modify the following diagram data according to these instructions:\n\nDiagram data: ${diagramData}\n\n Instructions: "${instructions}"\n\n Based on your deep knowledge of best practices and well-established patterns, ensure the diagram is both updated to satisfy the instructions, and re-configured if necessary. Keenly anticipate steps not included in the instructions, particularly error states and similar edge cases that may not be explicitly mentioned. Think step by step to ensure the diagram is complete and meets a high standard. If the instructions are unclear or impossible to follow, print an error that's both witty and helpful; don't apologize or say things like "oops".`,
    },
  ];
};
