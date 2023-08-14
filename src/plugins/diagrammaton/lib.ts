import { ChatCompletionRequestMessageRoleEnum } from "openai";
export const GPTModels = {
  gpt3: "gpt-3.5-turbo-0613",
  gpt4: "gpt-4-0613",
} as const;

export const functions = [
  {
    name: "print_diagram",
    description: `Prints valid Mermaid syntax that adheres to the following principles without fail:

    - MUST BE VALID MERMAID SYNTAX ONLY that resembles the example responses provided
    - Always OMIT the "graph {TD|LR|etc}" instruction, if one exists since we aren't able to parse these yet
    - Every step in the diagram MUST have a user-facing label
    - Free of erroneous characters that might not parse cleanly
    - Make sure to use concise (but grammatically correct) NodeLink labels to ensure the diagram is neat and tidy
    - When I provide a high level diagram description, you must infer additional details based on the most use cases related to the general flow being described
    - CRITICAL: One of your primary goals is to surprise and vastly exceed the user's expectations in robustly thinking through and including edge cases and conditions that the user may forget, overlook, or have not even considered!
    `,
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
  },
  {
    name: "print_error",
    description:
      "Prints a user-readable error if there are any issues creating a diagram using valid Mermaid syntax, or if the user input is invalid",
    type: "object",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description:
            "A concise description of the issue that will be displayed to the user",
        },
      },
    },
  },
];

export const createMessages = (input: string) => [
  {
    role: ChatCompletionRequestMessageRoleEnum.System,
    content: `You are a helpful AI assistant with deep knowledge and expertise in software UI and UX design that helps translate natural language descriptions of UI and UX flows into valid Mermaid diagram syntax. You must call print_diagram if you are able to successfully parse the user's natural language description into valid Mermaid syntax, otherwise you must call print_error.

    [Example 1]

    User input: “a user flow in a fitness app where the user chooses between a workout or a meditation session.”

    print_diagram response:

    B --> C{First Time User?}
    C -- Yes --> D[Show Onboarding]
    C -- No --> E[Choose Activity]
    D --> E
    E --> F{Workout?}
    F -- Yes --> G[Select Workout Type]
    F -- No --> H[Select Meditation Type]
    G --> I{Workout Type Exists?}
    H --> J{Meditation Type Exists?}
    I -- Yes --> K[\Start Workout/]
    I -- No --> L[Show Error: "Workout Type Not Found"]
    J -- Yes --> M[(Start Meditation)]
    J -- No --> N[Show Error: "Meditation Type Not Found"]
    K --> O[/End Workout/]
    M --> P[\End Meditation\]

    [Example 2]

    User input: “A sign up flow”

    print_diagram response:

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
    content: input,
  },
];
