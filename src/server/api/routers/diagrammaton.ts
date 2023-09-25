import { type inferProcedureInput } from "@trpc/server";
import {
  Configuration,
  type CreateChatCompletionResponseChoicesInner,
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
} from "~/plugins/diagrammaton/lib";
import { logError } from "~/utils/log";

import handleError, {
  ApiKeyNotFoundForUser,
  DiagrammatonError,
  GPTFailedToCallFunction,
  InvalidApiKey,
  InvalidLicenseKey,
  NoDescriptionProvided,
  NoFeedbackMessage,
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

const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(2, "5 s"),
  analytics: true,
});

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
  verify: publicProcedure
    .meta({ openapi: { method: "POST", path: "/diagrammaton/verify" } })
    .input(
      z.object({
        licenseKey: z.string(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const identifier = ctx.ipAddress ?? input.licenseKey;

      console.log("====================================");

      console.log({ identifier });

      try {
        const { success } = await rateLimiter.limit(identifier);
        console.log({ success });
        console.log("====================================");
        if (!success) {
          throw new RateLimitExceededError();
        }
      } catch (err) {
        logError("Rate limiter error", { err });
        throw err;
      }

      try {
        const licenseKey = await ctx.prisma.licenseKey.findUnique({
          where: {
            key: input.licenseKey,
          },
        });

        if (!licenseKey) {
          throw new InvalidLicenseKey({ input });
        }

        return {
          success: true,
          message: "License key is valid",
        };
      } catch (err) {
        if (err instanceof DiagrammatonError) {
          console.error(err);
          logError(err.message, err.logArgs);
          return { success: false, message: err.message };
        }

        handleError(err as Error);

        return {
          success: false,
          message: "Unable to verify license key due to a server error",
        };
      }
    }),

  feedback: publicProcedure
    .meta({ openapi: { method: "POST", path: "/diagrammaton/feedback" } })
    .input(
      z.object({
        licenseKey: z.string(),
        message: z.string(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const identifier = ctx.ipAddress ?? input.licenseKey;

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

      if (!input.message) {
        throw new NoFeedbackMessage();
      }

      try {
        const licenseKey = await ctx.prisma.licenseKey.findUnique({
          where: {
            key: input.licenseKey,
          },
          include: {
            user: true,
          },
        });

        if (!licenseKey || !licenseKey.user) {
          throw new InvalidLicenseKey({ input });
        }

        await ctx.prisma.feedback.create({
          data: {
            message: input.message,
            userId: licenseKey.user.id,
          },
        });

        return {
          success: true,
          message: "Feedback successfully saved.",
        };
      } catch (err) {
        if (err instanceof DiagrammatonError) {
          console.error(err);
          logError(err.message, err.logArgs);
          return { success: false, message: err.message };
        }
        handleError(err as Error);
        return {
          success: false,
          message: "Unable to send feedback due to a erver error",
        };
      }
    }),
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
        z.object({
          type: z.literal("error"),
          data: z.string(),
        }),
      ])
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      const identifier = ctx.ipAddress ?? input.licenseKey;

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

        console.log({ licenseKeys });

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

        const endTime2 = Date.now(); // End time
        const timeTaken2 = (endTime2 - startTime) / 1000;
        console.info(`User found: ${timeTaken2}s`);

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

        const endTime = Date.now(); // End time
        const timeTaken = (endTime - startTime) / 1000;
        console.info(`Time taken: ${timeTaken}s`);

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

        console.log("Result: ", result.data);

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
        if (err instanceof DiagrammatonError) {
          console.error(err);
          logError(err.message, err.logArgs);
          return { type: "error", data: err.message };
        }
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

  const tokenLimit = 3500 - input.diagramDescription.length;

  try {
    chatCompletion = await openai.createChatCompletion({
      model: GPTModels[input.model ?? "gpt3"],
      functions,
      function_call: "auto",
      temperature: 0.4,
      messages: createMessages(input.diagramDescription),
      max_tokens: tokenLimit,
    });
  } catch (err: unknown) {
    console.error(err);
    if ((err as { response: { status: number } }).response.status === 401) {
      throw new InvalidApiKey({ err, user });
    }

    throw new OpenAiError({ err, input });
  }

  const choices = chatCompletion?.data.choices;

  if (choices && choices.length > 0) {
    console.log("Finish reason: ", choices[0]?.finish_reason);
    const wantsToUseFunction = choices[0]?.finish_reason === "function_call";

    if (!wantsToUseFunction) {
      const message = choices[0]?.message?.content;
      console.log("Used message: ", message);

      if (message) {
        const jsonRegex = /{.*}/s;
        const jsonMatch = message.match(jsonRegex);
        let parsedMessage: { steps: Array<unknown> };

        console.log({ jsonMatch });

        if (jsonMatch) {
          const jsonString = jsonMatch[0];
          parsedMessage = JSON.parse(jsonString) as { steps: Array<unknown> };
          console.log({ parsedMessage });

          return { type: "steps", data: parsedMessage.steps };
        }
      }

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
    const jsonRegex = /{.*}/;
    const jsonMatch = message.match(jsonRegex);
    let parsedMessage;

    console.log({ jsonMatch });

    if (jsonMatch) {
      const jsonString = jsonMatch[0];
      parsedMessage = JSON.parse(jsonString) as {
        id: string;
        label: string;
        shape: string;
      }[];

      return { type: "steps", data: parsedMessage };
    }

    return { type: "message", data: message };
  }

  if (steps) {
    return { type: "steps", data: steps };
  }

  throw new GPTFailedToCallFunction({ choices });
};
