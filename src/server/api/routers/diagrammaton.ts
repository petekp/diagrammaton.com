import { type inferProcedureInput } from "@trpc/server";
import { Configuration, OpenAIApi } from "openai";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import parser from "~/plugins/diagrammaton/grammar.js";
import {
  GPTModels,
  functions,
  createMessages,
} from "~/plugins/diagrammaton/lib";
import { logError, logInfo } from "~/utils/log";
import { env } from "~/env.mjs";
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

export const runtime = "edge";

const redis = new Redis({
  url: env.UPSTASH_REDIS_URL,
  token: env.UPSTASH_REDIS_TOKEN,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, "5 s"),
  analytics: true,
});

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
      const { success } = await ratelimit.limit(identifier);

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

        let parsedGrammar;

        try {
          parsedGrammar = parser.parse(combinedSteps!);
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

        logInfo("Diagram generated", {
          user: stringifiedUser,
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
    chatCompletion = await openai.createChatCompletion({
      model: data.input.model || GPTModels["gpt3"],
      functions,
      function_call: "auto",
      temperature: 0,
      messages: createMessages(data.input.diagramDescription),
      max_tokens: 3000,
    });
  } catch (err: unknown) {
    if ((err as { status: number }).status === 401) {
      throw new InvalidApiKey({ data });
    }

    throw new OpenAiError({ data });
  }

  const choices = chatCompletion?.data.choices;

  if (choices && choices.length > 0) {
    const { steps, message } = JSON.parse(
      choices[0]?.message?.function_call?.arguments as string
    ) as {
      steps: string[][];
      message: string;
    };

    if (message) throw new GPTFailedToCallFunction(data);
    if (!steps?.length) throw new UnableToParseGPTResponse(data);

    const combinedSteps = steps.reduce(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      (acc: string, curr: string[]) => acc.concat(`${curr}\n`),
      ``
    );

    return combinedSteps;
  } else {
    throw new UnableToParseGPTResponse(data);
  }
}
