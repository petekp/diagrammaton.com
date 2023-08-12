import { Configuration, OpenAIApi } from "openai";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  GPTModels,
  functions,
  createMessages,
} from "~/plugins/diagrammaton/lib";

import parser from "~/plugins/diagrammaton/grammar.js";

export const diagrammatonRouter = createTRPCRouter({
  generateMermaidSyntax: publicProcedure
    .meta({ openapi: { method: "POST", path: "/diagrammaton/generate" } })
    .input(
      z.object({
        licenseKey: z.string(),
        diagramDescription: z.string(),
        model: z.string().optional().default(GPTModels["gpt3"]),
      })
    )
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      console.log({ input });
      const licenseKeys = await ctx.prisma.licenseKey.findMany({
        where: {
          key: input.licenseKey,
        },
      });

      if (!licenseKeys.length) {
        throw new Error("Invalid license key");
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
        throw new Error("No API key found");
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
          throw new Error(message);
        }

        if (!steps?.length) {
          throw new Error("Unable to parse, please try again.");
        }

        console.log({ steps });

        const combinedSteps = steps.reduce(
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          (acc: string, curr: string[]) => acc.concat(`${curr}\n`),
          ``
        );

        const parsedGrammar = parser.parse(combinedSteps);
        return parsedGrammar;
      } else {
        throw new Error("Unknown error 🫠");
      }
    }),
});
