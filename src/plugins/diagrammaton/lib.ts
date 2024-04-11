import { FunctionDefinition } from "openai/resources";
import { ChatCompletionMessageParam } from "openai/resources/chat";
import { z } from "zod";
import {
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
];

const magnetPositions = ["TOP", "RIGHT", "BOTTOM", "LEFT"];

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
      description:
        "A concise label for the diagram node. If it's a decision point, you must print the label as a question.",
    },
    shape: {
      type: "string",
      enum: shapes,
      description: `The shape for the diagram node. Must be one of the provided enum values. Use the following guide for choosing a shape based on the node content: 
        
        - Decision: DIAMOND
        - Action: SQUARE
        - Input or output: PARALLELOGRAM_RIGHT
        - Process: ROUNDED_RECTANGLE
        - Start or end point: ELLIPSE
        - Database: ENG_DATABASE
        - Document: ENG_FILE`,
    },
  },
};

const linkSchema = {
  type: "object",
  required: ["fromNodeId", "toNodeId", "fromMagnet", "toMagnet"],
  description:
    "A connective link between two nodes taking magnet positions into account. By default, links between adjacent nodes are RIGHT to LEFT. BOTTOM should be used mostly for backwards links and exceptional steps like errors.",
  properties: {
    label: {
      type: "string",
      enum: ["Yes", "No"],
      description: `Optional label for the link. If the link is obvious, it's best not to have a label.`,
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
      enum: magnetPositions,
      description: `Magnet position on the origin node where the link originates. Follow these guidelines exactly: 
        
        - RIGHT by default.
        - BOTTOM If the connection is to a prior node.
        - For decision nodes: RIGHT for "Yes". BOTTOM for "No".`,
    },
    toMagnet: {
      type: "string",
      enum: magnetPositions,
      description: `Magnet position on the target node where the link terminates. Follow these guidelines exactly:

        - LEFT by default.
        - BOTTOM if LEFT is already occupied.
        - TOP if BOTTOM is already occupied.
        `,
    },
  },
};

const messageSchema = {
  type: "string",
  description:
    "A witty, humorous, and very concise description of the issue encountered and how the user can resolve it.",
};

export const functions: FunctionDefinition[] = [
  {
    name: "generate_diagram_json",
    description: `Translates a diagram description into valid JSON`,
    parameters: {
      type: "object",
      required: ["steps"],
      properties: {
        steps: {
          type: "array",
          required: ["items"],
          items: {
            type: "object",
            required: ["from", "link", "to"],
            properties: {
              from: nodeSchema,
              link: linkSchema,
              to: nodeSchema,
            },
          },
        },
      },
    },
  },
  {
    name: "generate_error_message",
    description:
      "Prints witty and very concise user-facing error explaining why you weren't able to draw a diagram based on the provided diagram description.",
    parameters: {
      type: "object",
      properties: {
        message: messageSchema,
      },
    },
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
): Array<ChatCompletionMessageParam> => {
  const { diagramDescription } = data;
  return [
    {
      role: "system",
      content: `You are an advanced AI specialized (but not limited to) generating UI/UX-oriented flow diagrams from simple, user-generated natural language text descriptions. Based on your deep knowledge of best practices and well-established patterns, ensure the diagram is immaculate, thorough, and exhaustive to the best of your abilities. Keenly anticipate steps not included in the description, particularly error states and edge cases that may not be explicitly mentioned in the diagram description. If the description mentions a particular service or domain, confidently infer what domain-specific steps should be included. Think step by step to ensure the diagram is complete and meets a high standard. My livelihood depends on you being superlatively creative and helpful. If you're unable to generate a useful diagram from the description, print an error that's both witty and helpful; don't apologize or say things like "oops".

      Here is an example of a user description and the expected output:

      Description: A mobile app signup flow
      Output: [{"from":{"id":"start","label":"Start","shape":"ELLIPSE"},"link":{"fromNodeId":"start","toNodeId":"chooseSignUpMethod"},"to":{"id":"chooseSignUpMethod","label":"Choose Sign Up Method","shape":"ROUNDED_RECTANGLE"}},{"from":{"id":"chooseSignUpMethod","label":"Choose Sign Up Method","shape":"ROUNDED_RECTANGLE"},"link":{"fromNodeId":"chooseSignUpMethod","toNodeId":"email","fromMagnet":"RIGHT","toMagnet":"LEFT"},"to":{"id":"email","label":"Email","shape":"PARALLELOGRAM_RIGHT"}},{"from":{"id":"chooseSignUpMethod","label":"Choose Sign Up Method","shape":"ROUNDED_RECTANGLE"},"link":{"fromNodeId":"chooseSignUpMethod","toNodeId":"socialMedia","fromMagnet":"RIGHT","toMagnet":"LEFT"},"to":{"id":"socialMedia","label":"Social Media","shape":"PARALLELOGRAM_RIGHT"}},{"from":{"id":"email","label":"Email","shape":"PARALLELOGRAM_RIGHT"},"link":{"fromNodeId":"email","toNodeId":"inputEmailPassword","fromMagnet":"RIGHT","toMagnet":"LEFT"},"to":{"id":"inputEmailPassword","label":"Input Email & Password","shape":"SQUARE"}},{"from":{"id":"socialMedia","label":"Social Media","shape":"PARALLELOGRAM_RIGHT"},"link":{"fromNodeId":"socialMedia","toNodeId":"choosePlatform","fromMagnet":"RIGHT","toMagnet":"LEFT"},"to":{"id":"choosePlatform","label":"Choose Platform","shape":"SQUARE"}},{"from":{"id":"inputEmailPassword","label":"Input Email & Password","shape":"SQUARE"},"link":{"fromNodeId":"inputEmailPassword","toNodeId":"validateEmail","fromMagnet":"RIGHT","toMagnet":"LEFT"},"to":{"id":"validateEmail","label":"Valid email?","shape":"DIAMOND"}},{"from":{"id":"validateEmail","label":"Valid email?","shape":"DIAMOND"},"link":{"fromNodeId":"validateEmail","toNodeId":"emailValid","fromMagnet":"RIGHT","toMagnet":"LEFT","label":"Yes"},"to":{"id":"emailValid","label":"Email Valid","shape":"SQUARE"}},{"from":{"id":"validateEmail","label":"Valid email?","shape":"DIAMOND"},"link":{"fromNodeId":"validateEmail","toNodeId":"emailInvalid","fromMagnet":"BOTTOM","toMagnet":"LEFT","label":"No"},"to":{"id":"emailInvalid","label":"Email Invalid","shape":"SQUARE"}},{"from":{"id":"emailInvalid","label":"Email Invalid","shape":"SQUARE"},"link":{"fromNodeId":"emailInvalid","toNodeId":"inputEmailPassword","fromMagnet":"BOTTOM","toMagnet":"BOTTOM"},"to":{"id":"inputEmailPassword","label":"Input Email & Password","shape":"SQUARE"}},{"from":{"id":"choosePlatform","label":"Choose Platform","shape":"SQUARE"},"link":{"fromNodeId":"choosePlatform","toNodeId":"externalAuth","fromMagnet":"RIGHT","toMagnet":"LEFT"},"to":{"id":"externalAuth","label":"External Authentication","shape":"SQUARE"}},{"from":{"id":"emailValid","label":"Email Valid","shape":"SQUARE"},"link":{"fromNodeId":"emailValid","toNodeId":"createAccount","fromMagnet":"RIGHT","toMagnet":"LEFT"},"to":{"id":"createAccount","label":"Create Account","shape":"ROUNDED_RECTANGLE"}},{"from":{"id":"externalAuth","label":"External Authentication","shape":"SQUARE"},"link":{"fromNodeId":"externalAuth","toNodeId":"authSuccessful","fromMagnet":"RIGHT","toMagnet":"LEFT"},"to":{"id":"authSuccessful","label":"Authentication Successful","shape":"SQUARE"}},{"from":{"id":"externalAuth","label":"External Authentication","shape":"SQUARE"},"link":{"fromNodeId":"externalAuth","toNodeId":"authFailed","fromMagnet":"BOTTOM","toMagnet":"TOP"},"to":{"id":"authFailed","label":"Authentication Failed","shape":"SQUARE"}},{"from":{"id":"authFailed","label":"Authentication Failed","shape":"SQUARE"},"link":{"fromNodeId":"authFailed","toNodeId":"chooseSignUpMethod","fromMagnet":"BOTTOM","toMagnet":"BOTTOM"},"to":{"id":"chooseSignUpMethod","label":"Choose Sign Up Method","shape":"ROUNDED_RECTANGLE"}},{"from":{"id":"authSuccessful","label":"Authentication Successful","shape":"SQUARE"},"link":{"fromNodeId":"authSuccessful","toNodeId":"createAccount","fromMagnet":"RIGHT","toMagnet":"LEFT"},"to":{"id":"createAccount","label":"Create Account","shape":"ROUNDED_RECTANGLE"}},{"from":{"id":"createAccount","label":"Create Account","shape":"ROUNDED_RECTANGLE"},"link":{"fromNodeId":"createAccount","toNodeId":"end","fromMagnet":"RIGHT","toMagnet":"LEFT"},"to":{"id":"end","label":"End","shape":"ELLIPSE"}}]
      
      
      `,
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
      content: `You are an advanced AI specialized in but not limited to modifying existing UI/UX-oriented flow diagram data generated by a FigJam plugin based on natural language instructions provided by the end user. This data will then be fed back to the FigJam plugin so it needs adhere to the plugin's data format. If you're unable to modify the diagram data according to the instructions, print an error that's both witty and helpful; don't apologize or say things like "oops".`,
    },
    {
      role: "user",
      content: `Modify the following diagram data according to these instructions:\n\nDiagram data: ${diagramData}\n\n Instructions: "${instructions}"\n\n Based on your deep knowledge of best practices and well-established patterns, ensure the diagram is faithful to the original, but updated to satisfy the modification instructions. Keenly anticipate steps not included in the instructions, particularly error states and similar edge cases that may not be explicitly mentioned. Think step by step to ensure the diagram is complete and meets a high standard. If the instructions are unclear or impossible to follow, print an error that's both witty and helpful; don't apologize or say things like "oops".`,
    },
  ];
};
