import { type inferProcedureInput } from "@trpc/server";
import { Configuration, OpenAIApi } from "openai";

import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import parser from "~/plugins/diagrammaton/grammar.js";
import {
  GPTModels,
  functions,
  createMessages,
} from "~/plugins/diagrammaton/lib";
import { logError, logInfo } from "~/utils/log";

import handleError, {
  ApiKeyNotFoundForUser,
  GPTFailedToCallFunction,
  InvalidApiKey,
  InvalidLicenseKey,
  NoDescriptionProvided,
  OpenAiError,
  RateLimitExceededError,
  UnableToParseGPTResponse,
  UserNotFound,
} from "./errors";
import rateLimiter from "./rateLimiter";

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
      const identifier = input.licenseKey;
      const { success } = await rateLimiter.limit(identifier);

      if (!success) {
        throw new RateLimitExceededError();
      }

      if (!input.diagramDescription) {
        throw new NoDescriptionProvided({ input });
      }

      const timeout = setTimeout(() => {
        logError("Function is about to timeout", {
          input,
        });
        // 55 seconds
      }, 55000);

      try {
        const licenseKeys = await ctx.prisma.licenseKey.findMany({
          where: {
            key: input.licenseKey,
          },
        });

        if (!licenseKeys.length) {
          throw new InvalidLicenseKey({ input });
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
          throw new UserNotFound({ input });
        }

        const stringifiedUser = JSON.stringify({
          ...user,
          openaiApiKey: "redacted",
        });

        const apiKey = user?.openaiApiKey;

        if (!apiKey) {
          throw new ApiKeyNotFoundForUser({ user: stringifiedUser, input });
        }

        if (typeof apiKey !== "string") {
          throw new InvalidApiKey();
        }

        const combinedSteps = await getCompletion({
          apiKey,
          input,
          user: stringifiedUser,
        });

        let parsedGrammar;

        try {
          parsedGrammar = parser.parse(combinedSteps);
        } catch (err) {
          throw new UnableToParseGPTResponse({
            user: stringifiedUser,
            input,
            steps: combinedSteps,
          });
        }

        const diagramData: unknown[] = (parsedGrammar as unknown[]).filter(
          Boolean
        );

        logInfo("Successfully generated diagram", {
          input,
          output: diagramData,
        });

        return diagramData;
      } catch (err) {
        handleError(err as Error);
      } finally {
        clearTimeout(timeout);
      }

      return [];
    }),
});

async function getCompletion({
  user,
  input,
  apiKey,
}: {
  user: string;
  input: inferProcedureInput<typeof diagrammatonRouter.generate>;
  apiKey: string;
}) {
  const configuration = new Configuration({
    apiKey,
  });

  const openai = new OpenAIApi(configuration);

  let chatCompletion;

  try {
    chatCompletion = await openai.createChatCompletion({
      model: input.model || GPTModels["gpt3"],
      functions,
      function_call: "auto",
      temperature: 0,
      messages: createMessages(input.diagramDescription),
      max_tokens: 5000,
    });
  } catch (err: unknown) {
    console.error(err);
    if ((err as { status: number }).status === 401) {
      throw new InvalidApiKey({ err, user });
    }

    throw new OpenAiError({ err, input });
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
      throw new GPTFailedToCallFunction({ input, message });
    }

    if (!steps?.length) throw new UnableToParseGPTResponse({ input, choices });

    const combinedSteps = steps.reduce(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      (acc: string, curr: string[]) => acc.concat(`${curr}\n`),
      ``
    );

    return combinedSteps;
  } else {
    throw new UnableToParseGPTResponse({ input });
  }
}
