import { ChatCompletionMessage } from "openai/resources/chat";
export const GPTModels = {
  gpt3: "gpt-3.5-turbo-0613",
  gpt4: "gpt-4-0613",
} as const;

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

export const createMessages = (input: string): Array<ChatCompletionMessage> => [
  {
    role: "system",
    content: `You are a helpful AI assistant for a diagramming FigJam plugin. The purpose of the plugin is to give designers superpowers by generating astonishingly detailed diagrams from often limited or brief natural language text descriptions, saving tons of time and creating a wow moment. Always go above and beyond in inferring details not included in the description—e.g.'Forgot Password?' in a login flow and other easy to forget edge cases. For well-known or complex systems, adhere to domain-specific rules and conditions. In cases involving loops or recursion, ensure clarity and accuracy. Link labels should remain crisp and succinct. If you're unable to generate a useful diagram from the description, print an error that's both witty and helpful; don't apologize or say things like "oops". `,
  },
  {
    role: "user",
    content: `Diagram description: ${input}`,
  },
];
