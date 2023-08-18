import { Configuration, OpenAIApi } from "openai";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import Rollbar from "rollbar";
import {
  GPTModels,
  functions,
  createMessages,
} from "~/plugins/diagrammaton/lib";

const rollbar = new Rollbar({
  accessToken: "7d1a014b53744111a9a98b51fc062b77",
  captureUncaught: true,
  captureUnhandledRejections: true,
});

// record a generic message and send it to Rollbar

import parser from "~/plugins/diagrammaton/grammar.js";
import { TRPCError } from "@trpc/server";

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
      const licenseKeys = await ctx.prisma.licenseKey.findMany({
        where: {
          key: input.licenseKey,
        },
      });

      if (!licenseKeys.length) {
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
          openaiApiKey: true,
        },
      });

      const apiKey = user?.openaiApiKey;

      if (!apiKey) {
        throw new TRPCError({
          message: "No Open AI API key registered",
          code: "BAD_REQUEST",
        });
      }

      const configuration = new Configuration({
        apiKey,
      });

      const openai = new OpenAIApi(configuration);

      const chatCompletion = await openai.createChatCompletion({
        model: input.model,
        functions,
        function_call: "auto",
        temperature: 1,
        messages: createMessages(input.diagramDescription),
        max_tokens: 3000,
      });

      const choices = chatCompletion.data.choices;

      if (choices && choices.length > 0) {
        console.log(choices[0]?.message?.function_call);
        const { steps, message } = JSON.parse(
          choices[0]?.message?.function_call?.arguments as string
        ) as {
          steps: string[][];
          message: string;
        };

        if (message) {
          throw new TRPCError({
            message,
            code: "UNPROCESSABLE_CONTENT",
          });
        }

        if (!steps?.length) {
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

        console.log({ combinedSteps });

        const parsedGrammar = parser.parse(combinedSteps);
        console.log({ parsedGrammar });
        const filteredGrammar: unknown[] = parsedGrammar.filter(Boolean);
        rollbar.log(filteredGrammar);
        return filteredGrammar;
      } else {
        throw new TRPCError({
          message: "Error generating diagram 🫠",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),
});
