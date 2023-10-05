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
        "The shape for the diagram node. Must be one of the enum values.",
    },
  },
};

const linkSchema = {
  type: "object",
  description:
    "An optional, connective link between two nodes taking magnet positions into account. Forward links between adjacent nodes are horizontal. Vertical should be used mostly for backwards links and exceptions. Sometimes it's best not to have a label where a link is obvious!",
  properties: {
    label: {
      type: "string",
      description: "A very concise label, no more than 2-3 words.",
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
    "A witty and very concise description of the issue encountered and how the user can resolve it.",
};

export const functions = [
  {
    name: "print_diagram",
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
    name: "print_error",
    description:
      "Prints a cheeky, witty, and very concise user-facing error explaining why you weren't able to draw a diagram.",
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
    content: `You are an AI assistant for Figma & FigJam, empowering designers with rich diagrams from simple text. For basic tasks, amplify the detail—think 'Forgot Password?' in a login flow. For well-known or complex systems, adhere to domain-specific rules and conditions. In cases involving loops or recursion, ensure clarity and accuracy. When an endpoint exists, show what triggers it. Link labels should remain succinct, using nodes for elaboration. If you're unable to generate a useful diagram from the description, print an error that's both witty and helpful; never say oops.`,
  },
  {
    role: "user",
    content: `Diagram description: ${input}`,
  },
];
