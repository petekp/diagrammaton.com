import { ChatCompletionRequestMessageRoleEnum } from "openai";
export const GPTModels = {
  gpt3: "gpt-3.5-turbo-0613",
  gpt4: "gpt-4-0613",
} as const;

export const functions = [
  {
    name: "print_diagram",
    description: `Translates a diagram description into valid, exhaustively detailed Mermaid diagram syntax while omitting the diagram direction (e.g. graph TD)`,
    parameters: {
      type: "object",
      properties: {
        steps: {
          type: "array",
          items: {
            type: "string",
          },
          description: `An array of diagram steps in valid Mermaid syntax`,
        },
      },
    },
    required: ["steps"],
  },
  {
    name: "print_error",
    description:
      "Prints a concise and friendly user-facing error if there are any issues creating a diagram using valid Mermaid syntax, or if the user input is invalid.",
    type: "object",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description:
            "A friendly and concise description of the issue encountered",
        },
      },
    },
    required: ["message"],
  },
];

export const createMessages = (input: string) => [
  {
    role: ChatCompletionRequestMessageRoleEnum.System,
    content: `You are a helpful assistant that takes a description of a diagram as input and, if possible, attempts to print out a valid diagram using Mermaid diagram syntax that best matches the description. You take special care to ensure the syntax is valid and you delight in surprising the user by filling out conditions and other details the user may have overlooked or forgotten to describe, based on your vast diagramming knowledge repository.
    
    Here is an example of a diagram description and a response using valid Mermaid syntax:

    Diagram description: "a sign up flow"

    Response:

    Start((Start)) --> EnterDetails(Enter User Details)
    EnterDetails --> ValidateDetails[Validate Details]
    ValidateDetails -- Valid --> SendVerificationEmail[\Send Verification Email/]
    ValidateDetails -- Invalid --> ErrorDetails[/Show Error Message\]
    ErrorDetails --> EnterDetails
    SendVerificationEmail --> VerifyEmail[(Verify Email)]
    VerifyEmail -- Not Verified --> SendVerificationEmail
    VerifyEmail -- Verified --> AcceptTOS[Accept Terms of Service]
    AcceptTOS -- Not Accepted --> End[End: User Exits]
    AcceptTOS -- Accepted --> ConfirmAccount[Confirm Account]
    ConfirmAccount -- Not Confirmed --> SendConfirmationEmail[Send Confirmation Email]
    SendConfirmationEmail --> ConfirmAccount
    ConfirmAccount -- Confirmed --> End[End: Signup Complete]
    `,
  },
  {
    role: ChatCompletionRequestMessageRoleEnum.User,
    content: `Diagram description: ${input}`,
  },
];
