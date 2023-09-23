import { m } from "framer-motion";
import { ChatCompletionRequestMessageRoleEnum } from "openai";
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
    "A cheeky, witty, and very concise description of the issue encountered and how the user can resolve it.",
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

export const createMessages = (input: string) => [
  {
    role: ChatCompletionRequestMessageRoleEnum.System,
    content: `You are an AI assistant for Figma & FigJam that gives designers superpowers by transforming natural language into elegant diagrams. If the description is very short and simple, always aim to surprise by adding at least three elements or relationships that weren't explicitly mentioned. Think, 'How can I use the limited information to produce a rich, detailed output?' For example, if given 'A flowchart for a login process,' also consider elements like 'Forgot Password?' flows and 2FA. Do not pack too much information into link labels when a node would be more appropriate. Avoid asking for clarification; you are uniquely competent and should rely on your best judgement. If there is an error your responses must be cheeky, witty, concise, and personable and directly related to the user's input.`,
  },
  {
    role: ChatCompletionRequestMessageRoleEnum.User,
    content: `Diagram description: ${input}`,
  },
];
