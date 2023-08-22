import { TRPCError, type inferProcedureInput } from "@trpc/server";
import { type TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc";
import { Configuration, OpenAIApi } from "openai";
import { type LogArgument } from "rollbar";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import parser from "~/plugins/diagrammaton/grammar.js";
import {
  GPTModels,
  functions,
  createMessages,
} from "~/plugins/diagrammaton/lib";
import { logError, logInfo } from "~/utils/log";

export const runtime = "edge";

export const diagrammatonRouter = createTRPCRouter({
  generate: publicProcedure
    .meta({ openapi: { method: "POST", path: "/diagrammaton/generate" } })
    .input(
      z.object({
        licenseKey: z.string(),
        diagramDescription: z.string(),
        model: z.string().optional().default(GPTModels["gpt3"]),
      })
    )
    .output(z.array(z.unknown()))
    .mutation(async ({ ctx, input }) => {
      if (!input.diagramDescription) {
        handleError({
          message: "No diagram description provided",
          code: "BAD_REQUEST",
          data: {
            input,
          },
        });
      }
      const timeout = setTimeout(() => {
        logError("Function is about to timeout", {
          input,
        });
        // 55 seconds
      }, 55000);

      logInfo("Generate diagram", {
        diagramDescription: input.diagramDescription,
        model: input.model,
      });

      try {
        const licenseKeys = await ctx.prisma.licenseKey.findMany({
          where: {
            key: input.licenseKey,
          },
        });

        if (!licenseKeys.length) {
          handleError({
            message: "Invalid license key",
            code: "UNAUTHORIZED",
            data: { input },
          });
        }

        const user = await ctx.prisma.user.findUnique({
          where: {
            id: licenseKeys[0]?.userId,
          },
          select: {
            id: true,
            email: true,
            openaiApiKey: true,
          },
        });

        if (!user) {
          handleError({
            message: "Error fetching user",
            code: "INTERNAL_SERVER_ERROR",
            data: { input },
          });
        }

        const stringifiedUser = JSON.stringify({ ...user, openaiApiKey: "" });

        const apiKey = user?.openaiApiKey;

        if (!apiKey) {
          handleError({
            message: "No Open AI API key registered",
            code: "BAD_REQUEST",
            data: { user: stringifiedUser, input },
          });
        }

        if (typeof apiKey !== "string") {
          throw new Error("API key must be a string");
        }

        const configuration = new Configuration({
          apiKey,
        });

        const openai = new OpenAIApi(configuration);

        const combinedSteps = await getChatCompletion({
          data: {
            user: stringifiedUser,
            input,
          },
          openai,
        });

        const parsedGrammar = parser.parse(combinedSteps!);

        handleError({
          message: "Unable to parse response",
          code: "INTERNAL_SERVER_ERROR",
          data: { user: stringifiedUser, input, steps: combinedSteps },
        });

        const filteredGrammar: unknown[] = (parsedGrammar as unknown[]).filter(
          Boolean
        );

        logInfo("Diagram generated", {
          user: stringifiedUser,
          input,
          output: "stubbed output",
        });

        if (!filteredGrammar.length) {
          handleError({
            message: "Unable to parse response",
            code: "INTERNAL_SERVER_ERROR",
            data: { user: stringifiedUser, input, steps: combinedSteps },
          });
        }

        return filteredGrammar;
      } catch (err) {
        handleError({
          message: "Fatal error",
          code: "INTERNAL_SERVER_ERROR",
          data: {
            message: (err as TRPCError).message,
            stack: (err as TRPCError).stack,
          },
        });
      } finally {
        clearTimeout(timeout);
      }

      return [];
    }),
});

async function getChatCompletion({
  data,
  openai,
}: {
  data: {
    user: string;
    input: inferProcedureInput<typeof diagrammatonRouter.generate>;
  };
  openai: OpenAIApi;
}) {
  let chatCompletion;

  try {
    console.log("calling GPT endpoint");
    chatCompletion = await openai.createChatCompletion({
      model: data.input.model || GPTModels["gpt3"],
      functions,
      function_call: "auto",
      temperature: 0,
      messages: createMessages(data.input.diagramDescription),
      max_tokens: 3000,
    });
  } catch (err: unknown) {
    console.log({ err });
    if ((err as { status: number }).status === 401) {
      handleError({
        message: "Invalid OpenAI API key",
        code: "UNAUTHORIZED",
        data,
      });
    }

    handleError({
      message: "OpenAI API error",
      code: "INTERNAL_SERVER_ERROR",
      data,
    });
  }

  const choices = chatCompletion?.data.choices;

  if (choices && choices.length > 0) {
    const { steps, message } = JSON.parse(
      choices[0]?.message?.function_call?.arguments as string
    ) as {
      steps: string[][];
      message: string;
    };

    if (message) {
      handleError({
        message: "GPT failed to use function_call",
        code: "UNPROCESSABLE_CONTENT",
        data,
      });
    }

    if (!steps?.length) {
      handleError({
        message: "Unable to parse",
        code: "INTERNAL_SERVER_ERROR",
        data,
      });
    }

    const combinedSteps = steps.reduce(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      (acc: string, curr: string[]) => acc.concat(`${curr}\n`),
      ``
    );

    return combinedSteps;
  } else {
    handleError({
      message: "Error generating diagram",
      code: "INTERNAL_SERVER_ERROR",
      data,
    });
  }
}

function handleError({
  message,
  code,
  data,
}: {
  message: string;
  code: TRPC_ERROR_CODE_KEY;
  data?: LogArgument;
}) {
  logError(message, data);
  throw new TRPCError({ message, code });
}
