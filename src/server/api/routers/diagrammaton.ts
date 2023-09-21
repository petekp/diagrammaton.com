import { type inferProcedureInput } from "@trpc/server";
import {
  Configuration,
  CreateChatCompletionResponseChoicesInner,
  OpenAIApi,
} from "openai";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { env } from "~/env.mjs";

import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  GPTModels,
  functions,
  createMessages,
  shapes,
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

export const runtime = "edge";

const stepSchema = z.object({
  from: z.object({
    id: z.string(),
    label: z.string(),
    shape: z.string(),
  }),
  link: z.object({
    label: z.string(),
  }),
  to: z.object({
    id: z.string(),
    label: z.string(),
    shape: z.string(),
  }),
});

const stepsSchema = z.array(stepSchema);

export const diagrammatonRouter = createTRPCRouter({
  generate: publicProcedure
    .meta({ openapi: { method: "POST", path: "/diagrammaton/generate" } })
    .input(
      z.object({
        licenseKey: z.string(),
        diagramDescription: z.string(),
        model: z
          .union([z.literal("gpt3"), z.literal("gpt4")])
          .optional()
          .default("gpt3"),
      })
    )
    .output(
      z.union([
        z.object({
          type: z.literal("message"),
          data: z.string(),
        }),
        z.object({
          type: z.literal("steps"),
          data: stepsSchema,
        }),
      ])
    )
    .mutation(async ({ ctx, input }) => {
      const identifier = input.licenseKey;

      const redis = new Redis({
        url: env.UPSTASH_REDIS_URL,
        token: env.UPSTASH_REDIS_TOKEN,
      });

      const rateLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(1, "5 s"),
        analytics: true,
      });

      try {
        const { success } = await rateLimiter.limit(identifier);
        if (!success) {
          throw new RateLimitExceededError();
        }
      } catch (err) {
        // Handle the error here
        logError("Rate limiter error", { err });
        throw err;
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

        const result = await getCompletion({
          apiKey,
          input,
          user: stringifiedUser,
        });

        if (!result || !result.data) {
          throw new Error("Something happened");
        }

        const stepsDataSchema = stepsSchema.refine(
          (data) => {
            try {
              stepsSchema.parse(data);
              return true;
            } catch {
              return false;
            }
          },
          {
            message: "Unexpected data type for 'steps'",
          }
        );

        if (result.type === "message") {
          if (typeof result.data === "string") {
            return { type: "message", data: result.data };
          }
          throw new Error("Unexpected data type for 'message'");
        }

        if (result.type === "steps") {
          const data = stepsDataSchema.parse(result.data);
          return { type: "steps", data };
        }

        throw new Error("Unexpected result type");
      } catch (err) {
        handleError(err as Error);
      } finally {
        clearTimeout(timeout);
      }

      return { type: "message", data: "" };
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
      model: GPTModels[input.model ?? "gpt3"],
      functions,
      function_call: "auto",
      temperature: 0,
      messages: createMessages(input.diagramDescription),
      max_tokens: 2000,
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
    console.log("Finish reason: ", choices[0]?.finish_reason);
    const wantsToUseFunction = choices[0]?.finish_reason === "function_call";

    if (!wantsToUseFunction) {
      console.log("Used message: ", choices[0]?.message?.content);
      return { type: "message", data: choices[0]?.message?.content };
    }

    if (wantsToUseFunction) {
      console.log("Used function: ", choices[0]?.message?.function_call?.name);
      return handleFunctionCall(choices);
    }
  } else {
    throw new UnableToParseGPTResponse({ input, ...choices });
  }
}

const handleFunctionCall = (
  choices: Array<CreateChatCompletionResponseChoicesInner>
) => {
  const args = choices[0]?.message?.function_call?.arguments;

  const { steps, message } = args
    ? (JSON.parse(args) as {
        steps: {
          id: string;
          label: string;
          shape: string;
        }[];
        message: string;
      })
    : { steps: null, message: null };

  if (message) {
    return { type: "message", data: message };
  }

  if (steps) {
    return { type: "steps", data: steps };
  }

  throw new GPTFailedToCallFunction({ choices });
};
