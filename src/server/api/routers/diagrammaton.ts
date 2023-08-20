import { Configuration, OpenAIApi } from "openai";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

import {
  GPTModels,
  functions,
  createMessages,
} from "~/plugins/diagrammaton/lib";

import parser from "~/plugins/diagrammaton/grammar.js";
import { TRPCError } from "@trpc/server";
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
        logError("No diagram description provided", {
          input,
        });

        throw new TRPCError({
          message: "No diagram description provided",
          code: "BAD_REQUEST",
        });
      }
      const timeout = setTimeout(() => {
        logError("Function is about to timeout", {
          input,
        });
        // 55 seconds
      }, 50000);

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
          logError("Invalid license key", {
            input,
          });

          throw new TRPCError({
            message: "Invalid license key",
            code: "UNAUTHORIZED",
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

        const stringifiedUser = JSON.stringify({ ...user, openaiApiKey: "" });

        const apiKey = user?.openaiApiKey;

        if (!apiKey) {
          logError("No Open AI API key registered", {
            user: stringifiedUser,
            input,
          });

          throw new TRPCError({
            message: "No Open AI API key registered",
            code: "BAD_REQUEST",
          });
        }

        const configuration = new Configuration({
          apiKey,
        });

        const openai = new OpenAIApi(configuration);

        let chatCompletion;

        try {
          console.log("calling GPT endpoint");
          chatCompletion = await openai.createChatCompletion({
            model: input.model,
            functions,
            function_call: "auto",
            temperature: 0,
            messages: createMessages(input.diagramDescription),
            max_tokens: 3000,
          });
        } catch (err: unknown) {
          if ((err as { status: number }).status === 401) {
            logError("Invalid OpenAI API key", {
              user: stringifiedUser,
              input,
            });

            throw new TRPCError({
              message: "Invalid OpenAI API key",
              code: "UNAUTHORIZED",
            });
          }

          logError("OpenAI API error", {
            user: stringifiedUser,
            input,
            error: err,
          });
        }

        const choices = chatCompletion?.data.choices;

        console.log("choices", choices);

        if (choices && choices.length > 0) {
          const { steps, message } = JSON.parse(
            choices[0]?.message?.function_call?.arguments as string
          ) as {
            steps: string[][];
            message: string;
          };

          if (message) {
            logError("GPT failed to use function_call", {
              message,
              user: stringifiedUser,
              input,
            });

            throw new TRPCError({
              message,
              code: "UNPROCESSABLE_CONTENT",
            });
          }

          if (!steps?.length) {
            logError("Unable to parse", {
              user: stringifiedUser,
              input,
              choices: JSON.stringify(choices),
            });

            throw new TRPCError({
              message: "Unable to parse, please try again.",
              code: "INTERNAL_SERVER_ERROR",
            });
          }

          const combinedSteps = steps.reduce(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            (acc: string, curr: string[]) => acc.concat(`${curr}\n`),
            ``
          );

          let parsedGrammar;

          try {
            parsedGrammar = parser.parse(combinedSteps);
          } catch (err) {
            logError("Unable to parse response", {
              user: stringifiedUser,
              input,
              steps: combinedSteps,
            });

            throw new TRPCError({
              message: "Unable to parse response, please try again.",
              code: "INTERNAL_SERVER_ERROR",
              cause: err,
            });
          }

          const filteredGrammar: unknown[] = parsedGrammar.filter(Boolean);

          logInfo("Diagram generated", {
            user: stringifiedUser,
            input,
            output: "stubbed output",
          });

          return filteredGrammar;
        } else {
          logError("Error generating diagram", {
            user: stringifiedUser,
            input,
          });
          throw new TRPCError({
            message: "Error generating diagram 🫠",
            code: "INTERNAL_SERVER_ERROR",
          });
        }
      } catch (err) {
        logError("Fatal error", {
          message: (err as TRPCError).message,
          stack: (err as TRPCError).stack,
        });

        throw new TRPCError({
          message: "Fundamental terrible error",
          code: "INTERNAL_SERVER_ERROR",
          cause: err,
        });
      } finally {
        clearTimeout(timeout);
      }
    }),
});
