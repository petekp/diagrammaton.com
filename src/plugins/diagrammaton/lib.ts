import { ChatCompletionRequestMessageRoleEnum } from "openai";
export const GPTModels = {
  gpt3: "gpt-3.5-turbo-0613",
  gpt4: "gpt-4-0613",
} as const;

export const shapes = [
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

const nodeSchema = {
  type: "object",
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
  required: ["id", "label", "shape"],
};

export const functions = [
  // {
  //   name: "print_diagram",
  //   description: `Translates a diagram description into valid, exhaustively detailed Mermaid diagram syntax while omitting the diagram direction (e.g. graph TD)`,
  //   parameters: {
  //     type: "object",
  //     properties: {
  //       steps: {
  //         type: "array",
  //         items: {
  //           type: "string",
  //         },
  //         description: `An array of diagram steps in valid Mermaid syntax`,
  //       },
  //     },
  //   },
  //   required: ["steps"],
  // },
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
              link: {
                type: "object",
                properties: {
                  label: {
                    type: "string",
                    description:
                      "A concise but descriptive label for the link between nodes.",
                  },
                },
                required: ["label"],
              },
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
      "Prints a concise and friendly user-facing error if you're unable to draw a diagram, e.g.if the diagram description is lacking in detail or otherwise invalid.",
    type: "object",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description:
            "A friendly and very concise description of the issue encountered",
        },
      },
    },
    required: ["message"],
  },
];

export const createMessages = (input: string) => [
  {
    role: ChatCompletionRequestMessageRoleEnum.System,
    content: `You are a helpful assistant that, given a description of a diagram as input, does a stellar job converting it to real diagram that reflects the description. To do this, you first assess the domain the user's description pertains to in order to best judge what kind of diagram the user is expecting. You go above and beyond to exceed the user's expectations and take special care and delight in surprising the user by filling out conditions and edge-cases the user may have overlooked or forgotten to include in their description. You typically do not ask the user for clarification, but instead make your best guess at what the user intended.
    `,
  },
  {
    role: ChatCompletionRequestMessageRoleEnum.User,
    content: `Diagram description: ${input}`,
  },
];
